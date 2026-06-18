import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Factory, Save } from "lucide-react";
import { toast } from "sonner";

import { BatchActionBar, type BatchAction } from "@/components/vendor/BatchActionBar";
import { BulkJobTable } from "@/components/vendor/BulkJobTable";
import { UpdateProgressDialog } from "@/components/vendor/UpdateProgressDialog";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useHydratedOrder } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { acceptProductionJob, updateProductionProgress } from "@/lib/v2/productionStore";
import type { ProductionJob } from "@/lib/types/v2/production";
import type { ProductionStatus } from "@/lib/types/v2/status";

interface VendorProductionBulkUpdatePageProps {
  userRole?: UserRole;
}

interface JobDraft {
  status: ProductionStatus;
  producedQuantity: number;
  completedQuantity: number;
}

function initialDraft(job: ProductionJob): JobDraft {
  if (job.status === "SUBMITTED" || job.status === "NEW") {
    return { status: "ACCEPTED", producedQuantity: 0, completedQuantity: 0 };
  }
  return {
    status: job.status as ProductionStatus,
    producedQuantity: job.producedQuantity,
    completedQuantity: job.completedQuantity,
  };
}

/** Derive a suggested status from quantity thresholds, or null if no auto-advance applies. */
function autoStatus(job: ProductionJob, producedQty: number, completedQty: number): ProductionStatus | null {
  const s = job.status;
  if (s === "ACCEPTED") {
    return producedQty > 0 ? "IN_PROGRESS" : "ACCEPTED";
  }
  if (s === "IN_PROGRESS") {
    return completedQty >= job.orderedQuantity ? "COMPLETED" : "IN_PROGRESS";
  }
  return null;
}

export function VendorProductionBulkUpdatePage({ userRole = "vendor" }: VendorProductionBulkUpdatePageProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const hydrated = useHydratedOrder(orderId);
  const actor = useActor(userRole, "vendor-production-bulk-update");

  // --- derived data ---
  const activeJobs = useMemo(() => {
    if (!hydrated) return [];
    return hydrated.productionJobs.filter(
      (j) => j.status !== "COMPLETED" && j.status !== "CANCELLED",
    );
  }, [hydrated]);

  const allJobs = useMemo(() => hydrated?.productionJobs ?? [], [hydrated]);

  // build table rows (flat + readonly quantities snap from current job state)
  const tableRows = useMemo(() => {
    if (!hydrated) return [];
    return activeJobs.map((job) => {
      const item = hydrated.order.items.find((e) => e.id === job.orderItemId);
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        orderRequest: { id: job.orderRequestId, name: hydrated.order.orderRequestNumber },
        orderItem: {
          id: job.orderItemId,
          code: item?.product.materialCode ?? "",
          name: item?.description ?? job.orderItemId,
        },
        vendor: { id: job.vendorId, name: hydrated.order.vendor.name },
        status: job.status,
        orderedQuantity: job.orderedQuantity,
        producedQuantity: job.producedQuantity,
        reservedForShipmentQuantity: job.reservedForShipmentQuantity,
        completedQuantity: job.completedQuantity,
        rejectedQuantity: job.rejectedQuantity,
        deadline: hydrated.order.deadlineDate,
        hasBlockingException: false,
        updatedAt: job.audit.updatedAt,
      };
    });
  }, [activeJobs, hydrated]);

  // --- selection state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedJobs = useMemo(
    () => activeJobs.filter((j) => selectedIds.has(j.id)),
    [activeJobs, selectedIds],
  );

  // --- draft buffer ---
  const [drafts, setDrafts] = useState<Record<string, JobDraft>>({});

  const [saving, setSaving] = useState(false);

  // --- dialog state ---
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  // --- handlers ---

  const handleStatusChange = useCallback(
    (jobId: string, status: ProductionStatus) => {
      const job = activeJobs.find((j) => j.id === jobId);
      if (!job) return;
      setDrafts((prev) => {
        const existing = prev[jobId] ?? initialDraft(job);
        const next: JobDraft = { ...existing, status };
        if (status === "COMPLETED") {
          const qty = job.orderedQuantity;
          next.producedQuantity = qty;
          next.completedQuantity = qty;
        } else if (status === "ACCEPTED" && existing.producedQuantity === 0) {
          next.producedQuantity = job.orderedQuantity;
        }
        return { ...prev, [jobId]: next };
      });
    },
    [activeJobs],
  );

  const handleQuantityChange = useCallback(
    (jobId: string, field: "producedQuantity" | "completedQuantity", value: number) => {
      const job = activeJobs.find((j) => j.id === jobId);
      if (!job) return;
      setDrafts((prev) => {
        const existing = prev[jobId] ?? initialDraft(job);
        const baseDraft = initialDraft(job);
        const manualStatus = existing.status !== baseDraft.status;

        const nextQty = { ...existing, [field]: value };
        const suggested = autoStatus(job, nextQty.producedQuantity, nextQty.completedQuantity);

        const status = !manualStatus && suggested !== null ? suggested : existing.status;
        return { ...prev, [jobId]: { ...nextQty, status } };
      });
    },
    [activeJobs],
  );

  const getDraftQuantity = useCallback(
    (jobId: string, field: "producedQuantity" | "completedQuantity") => {
      const draft = drafts[jobId];
      return draft ? draft[field] : undefined;
    },
    [drafts],
  );

  const getDraftStatus = useCallback(
    (jobId: string) => {
      const job = activeJobs.find((j) => j.id === jobId);
      const draft = drafts[jobId];
      if (!job || !draft) return undefined;
      return draft.status !== job.status ? draft.status : undefined;
    },
    [activeJobs, drafts],
  );

  const handleBatchAction = useCallback(
    (action: BatchAction) => {
      const jobsToAct = selectedJobs;

      if (action === "accept") {
        let ok = 0,
          err = 0;
        for (const job of jobsToAct) {
          try {
            acceptProductionJob(
              { productionJobId: job.id, expectedVersion: job.version, acceptedByUserId: actor.userId },
              buildCommand(actor, "Batch accept production jobs"),
            );
            ok++;
          } catch (error) {
            err++;
            toast.error(`${job.jobNumber}: ${toApiError(error).message}`);
          }
        }
        if (ok > 0) toast.success(`${ok} job${ok === 1 ? "" : "s"} accepted.`);
        setSelectedIds(new Set());
      } else if (action === "update_progress") {
        setProgressDialogOpen(true);
      } else if (action === "complete") {
        for (const job of jobsToAct) {
          const qty = job.orderedQuantity;
          setDrafts((prev) => ({
            ...prev,
            [job.id]: {
              status: "COMPLETED",
              producedQuantity: qty,
              completedQuantity: qty,
            },
          }));
        }
        setSelectedIds(new Set());
      }
    },
    [selectedJobs, actor],
  );

  const handleProgressConfirm = useCallback(
    (updates: Record<string, { producedQuantity: number; completedQuantity: number }>) => {
      for (const [jobId, qty] of Object.entries(updates)) {
        setDrafts((prev) => {
          const existing = prev[jobId] ?? initialDraft(activeJobs.find((j) => j.id === jobId)!);
          if (!existing) return prev;
          return {
            ...prev,
            [jobId]: {
              ...existing,
              producedQuantity: qty.producedQuantity,
              completedQuantity: qty.completedQuantity,
            },
          };
        });
      }
      setSelectedIds(new Set());
    },
    [activeJobs],
  );

  const handleSaveAll = useCallback(() => {
    if (activeJobs.length === 0) return;
    setSaving(true);

    const results: Array<{ jobNumber: string; status: "ok" | "error"; message?: string }> = [];

    for (const job of activeJobs) {
      try {
        const draft = drafts[job.id];
        if (!draft) continue;

        if ((job.status === "SUBMITTED" || job.status === "NEW") && draft.status === "ACCEPTED") {
          acceptProductionJob(
            { productionJobId: job.id, expectedVersion: job.version, acceptedByUserId: actor.userId },
            buildCommand(actor, "Bulk accept production jobs"),
          );
        } else {
          const baseDraft = initialDraft(job);
          const changed =
            draft.status !== baseDraft.status ||
            draft.producedQuantity !== baseDraft.producedQuantity ||
            draft.completedQuantity !== baseDraft.completedQuantity;

          if (!changed) continue;

          updateProductionProgress(
            {
              productionJobId: job.id,
              expectedVersion: job.version,
              status: draft.status,
              producedQuantity: draft.producedQuantity,
              completedQuantity: draft.completedQuantity,
            },
            buildCommand(actor, "Bulk update production jobs"),
          );
        }
        results.push({ jobNumber: job.jobNumber, status: "ok" });
      } catch (error) {
        results.push({ jobNumber: job.jobNumber, status: "error", message: toApiError(error).message });
      }
    }

    const okCount = results.filter((r) => r.status === "ok").length;
    const errCount = results.filter((r) => r.status === "error").length;

    if (okCount > 0) toast.success(`${okCount} job${okCount === 1 ? "" : "s"} updated.`);
    if (errCount > 0) {
      toast.error(`${errCount} job${errCount === 1 ? "" : "s"} failed to update.`);
      results.filter((r) => r.status === "error").forEach((r) => toast.error(`${r.jobNumber}: ${r.message}`));
    }

    setSaving(false);
    if (errCount === 0) {
      setDrafts({});
      navigate(`/${userRole}/orders/${orderId}`);
    }
  }, [activeJobs, drafts, actor, orderId, navigate, userRole]);

  // --- sidebar aggregates ---
  const aggregate = useMemo(() => {
    const ordered = allJobs.reduce((s, j) => s + j.orderedQuantity, 0);
    const produced = allJobs.reduce((s, j) => s + j.producedQuantity, 0);
    const completed = allJobs.reduce((s, j) => s + j.completedQuantity, 0);
    return { ordered, produced, completed };
  }, [allJobs]);

  const statusBreakdown = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const j of allJobs) byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1);
    const order = ["SUBMITTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXCEPTION"];
    return order
      .filter((s) => byStatus.has(s))
      .map((status) => ({ status: status as ProductionStatus, count: byStatus.get(status)! }));
  }, [allJobs]);

  const draftCount = useMemo(
    () => activeJobs.filter((j) => drafts[j.id] !== undefined).length,
    [activeJobs, drafts],
  );

  // --- loading ---
  if (!hydrated) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header title="Update Production" />
          <main className="p-8">
            <p className="text-sm text-muted-foreground">Order not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href={`/${userRole}/orders`}>
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </a>
            </Button>
          </main>
        </ContentArea>
      </div>
    );
  }

  const backPath = `/${userRole}/orders/${orderId}`;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={`Update Production — ${hydrated.order.orderRequestNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: `/${userRole}/orders` },
            { label: hydrated.order.orderRequestNumber, to: backPath },
            { label: "Update Production" },
          ]}
          actions={
            <Button asChild variant="outline">
              <a href={backPath}>
                <ArrowLeft className="h-4 w-4" />
                Back to Order
              </a>
            </Button>
          }
        />

        <main className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          {activeJobs.length === 0 ? (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No active production jobs to update.</p>
                <Button asChild variant="outline" className="mt-4">
                  <a href={backPath}>Back to Order</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              {/* Main column */}
              <div className="space-y-4">
                {/* Search / filter */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Input
                      placeholder="Search jobs..."
                      className="h-9 pl-8"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        setSelectedIds(new Set());
                        // simple client-side search via data attribute
                      }}
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {draftCount > 0 && `${draftCount} draft${draftCount > 1 ? "s" : ""} · `}
                    {activeJobs.length} active job{activeJobs.length > 1 && "s"}
                  </span>
                </div>

                {/* Batch action bar */}
                <BatchActionBar
                  selectedCount={selectedIds.size}
                  selectedJobs={selectedJobs}
                  onAction={handleBatchAction}
                />

                {/* Table */}
                <BulkJobTable
                  rows={tableRows}
                  orderId={orderId!}
                  userRole={userRole}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onStatusChange={handleStatusChange}
                  onQuantityChange={handleQuantityChange}
                  getDraftQuantity={getDraftQuantity}
                  getDraftStatus={getDraftStatus}
                />

                {/* Update progress dialog */}
                <UpdateProgressDialog
                  open={progressDialogOpen}
                  onOpenChange={setProgressDialogOpen}
                  selectedJobs={selectedJobs}
                  onConfirm={handleProgressConfirm}
                />

                {/* Save all */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" asChild>
                    <a href={backPath}>Cancel</a>
                  </Button>
                  <Button onClick={handleSaveAll} disabled={saving || draftCount === 0}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : `Save All (${activeJobs.length} job${activeJobs.length === 1 ? "" : "s"})`}
                  </Button>
                </div>
              </div>

              {/* Insights sidebar */}
              <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Factory className="h-4 w-4" />
                      <span>Production Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 p-0">
                    <div className="space-y-4 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Aggregate Quantities</p>
                      <AggregateMetric label="Produced" value={aggregate.produced} total={aggregate.ordered} />
                      <AggregateMetric label="Finish" value={aggregate.completed} total={aggregate.ordered} />
                    </div>

                    <div className="space-y-3 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Jobs by Status</p>
                      {statusBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No jobs.</p>
                      ) : (
                        statusBreakdown.map((entry) => (
                          <div key={entry.status} className="flex items-center justify-between">
                            <ProductionStatusBadge status={entry.status} />
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {entry.count} job{entry.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      <p className="text-base font-semibold">Order Essentials</p>
                      <RailDetail label="Order" value={hydrated.order.orderRequestNumber} />
                      <RailDetail label="Project" value={hydrated.order.project.name} />
                      {hydrated.order.project.picName ? (
                        <RailDetail label="PIC" value={`${hydrated.order.project.picName}${hydrated.order.project.picEmail ? ` · ${hydrated.order.project.picEmail}` : ""}`} />
                      ) : null}
                      <RailDetail label="Vendor" value={hydrated.order.vendor.name} />
                      <RailDetail label="Client PO" value={hydrated.order.clientPoNumber ?? "—"} />
                      <RailDetail
                        label="Deadline"
                        value={new Date(hydrated.order.deadlineDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </main>
      </ContentArea>
    </div>
  );
}

function AggregateMetric({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">
          {value} <span className="text-xs font-normal text-muted-foreground">/ {total}</span>
        </p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function RailDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
