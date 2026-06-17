import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Factory, Save } from "lucide-react";
import { toast } from "sonner";

import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  qcPassedQuantity: number;
  readyQuantity: number;
  completedQuantity: number;
}

const UPDATABLE_STATUSES: ProductionStatus[] = [
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
];

function initialDraft(job: ProductionJob): JobDraft {
  if (job.status === "SUBMITTED" || job.status === "NEW") {
    return { status: "ACCEPTED", producedQuantity: 0, qcPassedQuantity: 0, readyQuantity: 0, completedQuantity: 0 };
  }
  return {
    status: job.status as ProductionStatus,
    producedQuantity: job.producedQuantity,
    qcPassedQuantity: job.qcPassedQuantity,
    readyQuantity: job.readyQuantity,
    completedQuantity: job.completedQuantity,
  };
}

export function VendorProductionBulkUpdatePage({ userRole = "vendor" }: VendorProductionBulkUpdatePageProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const hydrated = useHydratedOrder(orderId);
  const actor = useActor(userRole, "vendor-production-bulk-update");

  const activeJobs = useMemo(() => {
    if (!hydrated) return [];
    return hydrated.productionJobs.filter(
      (j) => j.status !== "COMPLETED" && j.status !== "CANCELLED",
    );
  }, [hydrated]);

  const [drafts, setDrafts] = useState<Record<string, JobDraft>>({});

  const draftFor = useCallback(
    (job: ProductionJob): JobDraft =>
      drafts[job.id] ?? initialDraft(job),
    [drafts],
  );

  const [saving, setSaving] = useState(false);

  const updateDraft = useCallback((jobId: string, patch: Partial<JobDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] ?? {} as JobDraft), ...patch },
    }));
  }, []);

  const handleProducedQtyChange = useCallback(
    (jobId: string, val: number) => {
      const draft = drafts[jobId];
      const producedQuantity = Math.max(0, val);
      updateDraft(jobId, {
        producedQuantity,
        qcPassedQuantity: Math.min(draft?.qcPassedQuantity ?? producedQuantity, producedQuantity),
        readyQuantity: Math.min(draft?.readyQuantity ?? producedQuantity, producedQuantity),
        completedQuantity: Math.min(draft?.completedQuantity ?? producedQuantity, producedQuantity),
      });
    },
    [drafts, updateDraft],
  );

  const handleQcQtyChange = useCallback(
    (jobId: string, val: number) => {
      const draft = drafts[jobId];
      const qcPassedQuantity = Math.max(0, val);
      updateDraft(jobId, {
        qcPassedQuantity,
        producedQuantity: Math.max(draft?.producedQuantity ?? qcPassedQuantity, qcPassedQuantity),
        readyQuantity: Math.min(draft?.readyQuantity ?? qcPassedQuantity, qcPassedQuantity),
        completedQuantity: Math.min(draft?.completedQuantity ?? qcPassedQuantity, qcPassedQuantity),
      });
    },
    [drafts, updateDraft],
  );

  const handleReadyQtyChange = useCallback(
    (jobId: string, val: number) => {
      const draft = drafts[jobId];
      const readyQuantity = Math.max(0, val);
      updateDraft(jobId, {
        readyQuantity,
        producedQuantity: Math.max(draft?.producedQuantity ?? readyQuantity, readyQuantity),
        qcPassedQuantity: Math.max(draft?.qcPassedQuantity ?? readyQuantity, readyQuantity),
        completedQuantity: Math.min(draft?.completedQuantity ?? readyQuantity, readyQuantity),
      });
    },
    [drafts, updateDraft],
  );

  const handleCompletedQtyChange = useCallback(
    (jobId: string, val: number) => {
      const draft = drafts[jobId];
      const completedQuantity = Math.max(0, val);
      updateDraft(jobId, {
        completedQuantity,
        producedQuantity: Math.max(draft?.producedQuantity ?? completedQuantity, completedQuantity),
        qcPassedQuantity: Math.max(draft?.qcPassedQuantity ?? completedQuantity, completedQuantity),
        readyQuantity: Math.max(draft?.readyQuantity ?? completedQuantity, completedQuantity),
      });
    },
    [drafts, updateDraft],
  );

  const handleStatusChange = useCallback(
    (jobId: string, job: ProductionJob, status: ProductionStatus) => {
      updateDraft(jobId, { status });
      if (status === "COMPLETED") {
        const qty = job.orderedQuantity;
        updateDraft(jobId, {
          producedQuantity: qty,
          qcPassedQuantity: qty,
          readyQuantity: qty,
          completedQuantity: qty,
        });
      } else if (status === "IN_PROGRESS") {
        const draft = drafts[jobId];
        if (!draft || draft.producedQuantity === 0) {
          updateDraft(jobId, { producedQuantity: job.orderedQuantity });
        }
      }
    },
    [drafts, updateDraft],
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
          updateProductionProgress(
            {
              productionJobId: job.id,
              expectedVersion: job.version,
              status: draft.status,
              producedQuantity: draft.producedQuantity,
              qcPassedQuantity: draft.qcPassedQuantity,
              readyQuantity: draft.readyQuantity,
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

    if (okCount > 0) {
      toast.success(`${okCount} job${okCount === 1 ? "" : "s"} updated.`);
    }
    if (errCount > 0) {
      toast.error(`${errCount} job${errCount === 1 ? "" : "s"} failed to update.`);
      results.filter((r) => r.status === "error").forEach((r) => {
        toast.error(`${r.jobNumber}: ${r.message}`);
      });
    }

    setSaving(false);
    if (errCount === 0) {
      setDrafts({});
      navigate(`/${userRole}/orders/${orderId}`);
    }
  }, [activeJobs, drafts, actor, orderId, navigate, userRole]);

  const isEditable = activeJobs.length > 0;

  // Aggregate quantities across ALL jobs (not just active)
  const allJobs = useMemo(() => hydrated?.productionJobs ?? [], [hydrated]);
  const aggregate = useMemo(() => {
    const ordered = allJobs.reduce((s, j) => s + j.orderedQuantity, 0);
    const produced = allJobs.reduce((s, j) => s + j.producedQuantity, 0);
    const qcPassed = allJobs.reduce((s, j) => s + j.qcPassedQuantity, 0);
    const ready = allJobs.reduce((s, j) => s + j.readyQuantity, 0);
    const completed = allJobs.reduce((s, j) => s + j.completedQuantity, 0);
    return { ordered, produced, qcPassed, ready, completed };
  }, [allJobs]);

  // Status breakdown (all jobs)
  const statusBreakdown = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const j of allJobs) {
      byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1);
    }
    const order = ["SUBMITTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXCEPTION"];
    return order.filter((s) => byStatus.has(s)).map((status) => ({ status: status as ProductionStatus, count: byStatus.get(status)! }));
  }, [allJobs]);

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
          {!isEditable ? (
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
              {/* Jobs column */}
              <div className="space-y-6">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Active Jobs</CardTitle>
                    <CardDescription>
                      Update status and quantities for each job. Changes are applied per-job when you click Save All.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {activeJobs.map((job) => {
                        const item = hydrated.order.items.find((entry) => entry.id === job.orderItemId);
                        const draft = draftFor(job);
                        const isSubmitted = job.status === "SUBMITTED" || job.status === "NEW";
                        const updatable = job.status !== "COMPLETED" && job.status !== "CANCELLED";
                        const showQuantities = !isSubmitted && updatable;

                        return (
                          <div key={job.id} className="px-5 py-4">
                            {/* Header row */}
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <span className="font-mono text-sm font-semibold">{job.jobNumber}</span>
                                <span className="ml-2">
                                  <ProductionStatusBadge status={job.status} />
                                </span>
                              </div>
                              {item && (
                                <span className="text-xs text-muted-foreground">
                                  {item.description ?? job.orderItemId} &middot; Ordered {job.orderedQuantity}
                                </span>
                              )}
                            </div>

                            {/* Status selector */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Status</Label>
                              <Select
                                value={draft.status}
                                onValueChange={(value) => handleStatusChange(job.id, job, value as ProductionStatus)}
                              >
                                <SelectTrigger className="h-8 w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(isSubmitted
                                    ? (["ACCEPTED"] as ProductionStatus[])
                                    : UPDATABLE_STATUSES
                                  ).map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {formatStatusLabel(status)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Quantity inputs */}
                            {showQuantities && (
                              <div className="mt-3 grid grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`prod-${job.id}`} className="text-xs">Produced</Label>
                                  <Input
                                    id={`prod-${job.id}`}
                                    type="number"
                                    min={0}
                                    value={draft.producedQuantity}
                                    onChange={(event) =>
                                      handleProducedQtyChange(job.id, Math.max(0, Number(event.target.value) || 0))
                                    }
                                    className="h-8 text-right"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`qc-${job.id}`} className="text-xs">QC Passed</Label>
                                  <Input
                                    id={`qc-${job.id}`}
                                    type="number"
                                    min={0}
                                    value={draft.qcPassedQuantity}
                                    onChange={(event) =>
                                      handleQcQtyChange(job.id, Math.max(0, Number(event.target.value) || 0))
                                    }
                                    className="h-8 text-right"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`ready-${job.id}`} className="text-xs">Ready</Label>
                                  <Input
                                    id={`ready-${job.id}`}
                                    type="number"
                                    min={0}
                                    value={draft.readyQuantity}
                                    onChange={(event) =>
                                      handleReadyQtyChange(job.id, Math.max(0, Number(event.target.value) || 0))
                                    }
                                    className="h-8 text-right"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`comp-${job.id}`} className="text-xs">Completed</Label>
                                  <Input
                                    id={`comp-${job.id}`}
                                    type="number"
                                    min={0}
                                    value={draft.completedQuantity}
                                    onChange={(event) =>
                                      handleCompletedQtyChange(job.id, Math.max(0, Number(event.target.value) || 0))
                                    }
                                    className="h-8 text-right"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Read-only summary when not editable */}
                            {!updatable && (
                              <div className="mt-3 grid grid-cols-4 gap-3">
                                <Metric label="Produced" value={job.producedQuantity} />
                                <Metric label="QC Passed" value={job.qcPassedQuantity} />
                                <Metric label="Ready" value={job.readyQuantity} />
                                <Metric label="Completed" value={job.completedQuantity} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Save action */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" asChild>
                    <a href={backPath}>Cancel</a>
                  </Button>
                  <Button onClick={handleSaveAll} disabled={saving}>
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
                      <AggregateMetric label="QC Passed" value={aggregate.qcPassed} total={aggregate.ordered} />
                      <AggregateMetric label="Ready" value={aggregate.ready} total={aggregate.ordered} />
                      <AggregateMetric label="Completed" value={aggregate.completed} total={aggregate.ordered} />
                    </div>

                    <div className="space-y-3 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Jobs by Status</p>
                      {statusBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No jobs.</p>
                      ) : (
                        statusBreakdown.map((entry) => (
                          <div key={entry.status} className="flex items-center justify-between">
                            <ProductionStatusBadge status={entry.status} />
                            <span className="text-sm tabular-nums text-muted-foreground">{entry.count} job{entry.count === 1 ? "" : "s"}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      <p className="text-base font-semibold">Order Essentials</p>
                      <RailDetail label="Order" value={hydrated.order.orderRequestNumber} />
                      <RailDetail label="Project" value={hydrated.order.project.name} />
                      <RailDetail label="Vendor" value={hydrated.order.vendor.name} />
                      <RailDetail label="Client PO" value={hydrated.order.clientPoNumber ?? "—"} />
                      <RailDetail label="Deadline" value={new Date(hydrated.order.deadlineDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
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
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
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
