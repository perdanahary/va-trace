import { useState } from "react";
import { toast } from "sonner";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductionJobTable } from "@/components/domain/tables/ProductionJobTable";
import type { ProductionStatus } from "@/lib/types/v2/status";
import {
  acceptProductionJob,
  getProductionJobById,
  updateProductionProgress,
  useProductionJobs,
} from "@/lib/v2/productionStore";
import { toApiError } from "@/lib/v2/repository";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useProductionRows } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand } from "@/lib/v2/workflows";

interface ProductionQueueProps {
  userRole?: UserRole;
}

const UPDATABLE_STATUSES: ProductionStatus[] = [
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
];

/** P2-19/P3-12 — Production queue (`/admin/production`, `/vendor/production`). */
export function ProductionQueue({ userRole = "admin" }: ProductionQueueProps) {
  const actor = useActor(userRole, "production-queue");
  const rolePrefix = `/${userRole}`;
  const rows = useProductionRows();
  useProductionJobs(); // subscribe for live updates

  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ProductionStatus>("IN_PROGRESS");
  const [producedQty, setProducedQty] = useState(0);
  const [completedQty, setCompletedQty] = useState(0);

  const openJob = openJobId ? getProductionJobById(openJobId) : undefined;

  const isInProgressActive = targetStatus === "IN_PROGRESS";
  const isCompletedActive = targetStatus === "COMPLETED";

  const handleStatusChange = (status: ProductionStatus) => {
    setTargetStatus(status);
    if (!openJob) return;
    const qty = openJob.orderedQuantity;
    if (status === "COMPLETED") {
      setProducedQty(qty);
      setCompletedQty(qty);
    } else if (status === "IN_PROGRESS") {
      if (producedQty === 0) setProducedQty(qty);
    }
  };

  const handleOpen = (jobId: string) => {
    const job = getProductionJobById(jobId);
    if (!job) return;
    setOpenJobId(jobId);
    setTargetStatus(job.status === "SUBMITTED" || job.status === "NEW" ? "ACCEPTED" : job.status);
    setProducedQty(job.producedQuantity);
    setCompletedQty(job.completedQuantity);
  };

  const handleUpdate = () => {
    if (!openJob) return;
    try {
      if (openJob.status === "SUBMITTED" && targetStatus === "ACCEPTED") {
        acceptProductionJob(
          { productionJobId: openJob.id, expectedVersion: openJob.version, acceptedByUserId: actor.userId },
          buildCommand(actor),
        );
      } else {
        updateProductionProgress(
          {
            productionJobId: openJob.id,
            expectedVersion: openJob.version,
            status: targetStatus,
            producedQuantity: producedQty,
            completedQuantity: completedQty,
          },
          buildCommand(actor),
        );
      }
      toast.success(`Production job ${openJob.jobNumber} updated.`);
      setOpenJobId(null);
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Production" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Production Jobs</CardTitle>
              <CardDescription>
                Manufacturing execution. Update produced and finished quantities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductionJobTable rows={rows} onUpdate={handleOpen} detailPathPrefix={`${rolePrefix}/production`} />
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      <Dialog open={Boolean(openJob)} onOpenChange={(open) => !open && setOpenJobId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Production</DialogTitle>
            <DialogDescription>
              {openJob ? `${openJob.jobNumber} · ordered ${openJob.orderedQuantity}` : ""}
            </DialogDescription>
          </DialogHeader>

          {openJob ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={targetStatus} onValueChange={(value) => handleStatusChange(value as ProductionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(openJob.status === "SUBMITTED" ? (["ACCEPTED"] as ProductionStatus[]) : UPDATABLE_STATUSES).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {formatStatusLabel(status)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {openJob.status !== "SUBMITTED" && (isInProgressActive || isCompletedActive) ? (
                <div className="space-y-4">
                  {isInProgressActive && (
                    <div className="space-y-1.5">
                      <Label htmlFor="produced-qty">Produced</Label>
                      <Input
                        id="produced-qty"
                        type="number"
                        min={0}
                        value={producedQty}
                        onChange={(event) => setProducedQty(Math.max(0, Number(event.target.value) || 0))}
                      />
                      <span className="text-[10px] text-muted-foreground block leading-normal">
                        Units produced so far.
                      </span>
                    </div>
                  )}

                  {isCompletedActive && (
                    <div className="space-y-1.5">
                      <Label htmlFor="completed-qty">Finished</Label>
                      <Input
                        id="completed-qty"
                        type="number"
                        min={0}
                        value={completedQty}
                        onChange={(event) => setCompletedQty(Math.max(0, Number(event.target.value) || 0))}
                      />
                      <span className="text-[10px] text-muted-foreground block leading-normal">
                        Total units fully finalized.
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenJobId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
