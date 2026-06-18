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
import type { ProductionStatus } from "@/lib/types/v2/status";

const UPDATABLE_STATUSES: ProductionStatus[] = [
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
];

interface VendorProductionUpdatePageProps {
  userRole?: UserRole;
}

export function VendorProductionUpdatePage({ userRole = "vendor" }: VendorProductionUpdatePageProps) {
  const { orderId, jobId } = useParams<{ orderId: string; jobId: string }>();
  const navigate = useNavigate();
  const hydrated = useHydratedOrder(orderId);
  const actor = useActor(userRole, "vendor-production-update");

  const job = useMemo(() => {
    if (!hydrated) return undefined;
    return hydrated.productionJobs.find((j) => j.id === jobId || j.jobNumber === jobId);
  }, [hydrated, jobId]);

  const item = useMemo(() => {
    if (!hydrated || !job) return undefined;
    return hydrated.order.items.find((entry) => entry.id === job.orderItemId);
  }, [hydrated, job]);

  const isEditable = job && job.status !== "COMPLETED" && job.status !== "CANCELLED";
  const isSubmitted = job?.status === "SUBMITTED" || job?.status === "NEW";

  const [targetStatus, setTargetStatus] = useState<ProductionStatus>(() => {
    if (!job) return "IN_PROGRESS";
    if (job.status === "SUBMITTED" || job.status === "NEW") return "ACCEPTED";
    return job.status;
  });

  const [producedQty, setProducedQty] = useState(job?.producedQuantity ?? 0);
  const [qcQty, setQcQty] = useState(job?.qcPassedQuantity ?? 0);
  const [readyQty, setReadyQty] = useState(job?.readyQuantity ?? 0);
  const [completedQty, setCompletedQty] = useState(job?.completedQuantity ?? 0);
  const [saving, setSaving] = useState(false);

  const isInProgressActive = targetStatus === "IN_PROGRESS";
  const isCompletedActive = targetStatus === "COMPLETED";

  const handleProducedQtyChange = useCallback((val: number) => {
    setProducedQty(val);
    setQcQty((prev) => Math.min(prev, val));
    setReadyQty((prev) => Math.min(prev, val));
    setCompletedQty((prev) => Math.min(prev, val));
  }, []);

  const handleQcQtyChange = useCallback((val: number) => {
    setQcQty(val);
    setProducedQty((prev) => Math.max(prev, val));
    setReadyQty((prev) => Math.min(prev, val));
    setCompletedQty((prev) => Math.min(prev, val));
  }, []);

  const handleReadyQtyChange = useCallback((val: number) => {
    setReadyQty(val);
    setQcQty((prev) => Math.max(prev, val));
    setProducedQty((prev) => Math.max(prev, val));
    setCompletedQty((prev) => Math.min(prev, val));
  }, []);

  const handleCompletedQtyChange = useCallback((val: number) => {
    setCompletedQty(val);
    setReadyQty((prev) => Math.max(prev, val));
    setQcQty((prev) => Math.max(prev, val));
    setProducedQty((prev) => Math.max(prev, val));
  }, []);

  const handleStatusChange = useCallback(
    (status: ProductionStatus) => {
      setTargetStatus(status);
      if (!job) return;
      const qty = job.orderedQuantity;
      if (status === "COMPLETED") {
        setProducedQty(qty);
        setQcQty(qty);
        setReadyQty(qty);
        setCompletedQty(qty);
      } else if (status === "IN_PROGRESS") {
        if (producedQty === 0) {
          setProducedQty(qty);
        }
      }
    },
    [job, producedQty],
  );

  const handleSave = useCallback(() => {
    if (!job) return;
    setSaving(true);
    try {
      if (isSubmitted && targetStatus === "ACCEPTED") {
        acceptProductionJob(
          { productionJobId: job.id, expectedVersion: job.version, acceptedByUserId: actor.userId },
          buildCommand(actor, "Update production from dedicated page"),
        );
      } else {
        updateProductionProgress(
          {
            productionJobId: job.id,
            expectedVersion: job.version,
            status: targetStatus,
            producedQuantity: producedQty,
            qcPassedQuantity: qcQty,
            readyQuantity: readyQty,
            completedQuantity: completedQty,
          },
          buildCommand(actor, "Update production from dedicated page"),
        );
      }
      toast.success(`Production job ${job.jobNumber} updated.`);
      navigate(`/${userRole}/orders/${orderId}`);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }, [job, isSubmitted, targetStatus, producedQty, qcQty, readyQty, completedQty, actor, buildCommand, navigate, userRole, orderId]);

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

  if (!job) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header
            title="Production Job"
            breadcrumbs={[
              { label: "All Orders", to: `/${userRole}/orders` },
              { label: hydrated.order.orderRequestNumber, to: `/${userRole}/orders/${orderId}` },
              { label: "Job" },
            ]}
          />
          <main className="p-8">
            <p className="text-sm text-muted-foreground">Production job not found on this order.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href={`/${userRole}/orders/${orderId}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to Order
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
          title={`Update Production — ${job.jobNumber}`}
          breadcrumbs={[
            { label: "All Orders", to: `/${userRole}/orders` },
            { label: hydrated.order.orderRequestNumber, to: backPath },
            { label: job.jobNumber },
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

        <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Job summary */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{job.jobNumber}</CardTitle>
                <ProductionStatusBadge status={job.status} />
              </div>
              <CardDescription>
                {item?.description ?? job.orderItemId} · Ordered {job.orderedQuantity}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Update form */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base">Progress</CardTitle>
              <CardDescription>
                {isSubmitted
                  ? "Accept this job to begin production."
                  : isEditable
                    ? "Update the production status and quantities."
                    : "This job is finished or cancelled."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {/* Status selector */}
              {isEditable ? (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={targetStatus}
                    onValueChange={(value) => handleStatusChange(value as ProductionStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isSubmitted ? (["ACCEPTED"] as ProductionStatus[]) : UPDATABLE_STATUSES).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            {formatStatusLabel(status)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <p className="text-sm font-medium">
                    <ProductionStatusBadge status={job.status} />
                  </p>
                </div>
              )}

              {/* Quantity inputs — only for non-SUBMITTED jobs */}
              {!isSubmitted && isEditable && (isInProgressActive || isCompletedActive) ? (
                <div className="space-y-4">
                  {isInProgressActive && (
                    <div className="space-y-1.5">
                      <Label htmlFor="produced-qty">Produced</Label>
                      <Input
                        id="produced-qty"
                        type="number"
                        min={0}
                        value={producedQty}
                        onChange={(event) =>
                          handleProducedQtyChange(Math.max(0, Number(event.target.value) || 0))
                        }
                      />
                      <span className="block text-[10px] leading-normal text-muted-foreground">
                        Units produced so far.
                      </span>
                    </div>
                  )}

                  {isCompletedActive && (
                    <div className="space-y-1.5">
                      <Label htmlFor="completed-qty">Finish</Label>
                      <Input
                        id="completed-qty"
                        type="number"
                        min={0}
                        value={completedQty}
                        onChange={(event) =>
                          handleCompletedQtyChange(Math.max(0, Number(event.target.value) || 0))
                        }
                      />
                      <span className="block text-[10px] leading-normal text-muted-foreground">
                        Total units fully finalized.
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Read-only summary when not editable */}
              {!isEditable ? (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Metric label="Produced" value={job.producedQuantity} />
                  <Metric label="QC Passed" value={job.qcPassedQuantity} />
                  <Metric label="Ready" value={job.readyQuantity} />
                  <Metric label="Finish" value={job.completedQuantity} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Save action */}
          {isEditable ? (
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <a href={backPath}>Cancel</a>
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save update"}
              </Button>
            </div>
          ) : null}
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
