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
  "PRINTING",
  "FINISHING",
  "QUALITY_CONTROL",
  "READY_FOR_DISTRIBUTION",
  "COMPLETED",
];

/** P2-19/P3-12 — Production queue (`/admin/production`, `/vendor/production`). */
export function ProductionQueue({ userRole = "admin" }: ProductionQueueProps) {
  const actor = useActor(userRole, "production-queue");
  const rolePrefix = `/${userRole}`;
  const rows = useProductionRows();
  useProductionJobs(); // subscribe for live updates

  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ProductionStatus>("PRINTING");
  const [producedQty, setProducedQty] = useState(0);
  const [qcQty, setQcQty] = useState(0);
  const [readyQty, setReadyQty] = useState(0);
  const [completedQty, setCompletedQty] = useState(0);

  const openJob = openJobId ? getProductionJobById(openJobId) : undefined;

  const handleOpen = (jobId: string) => {
    const job = getProductionJobById(jobId);
    if (!job) return;
    setOpenJobId(jobId);
    setTargetStatus(job.status === "SUBMITTED" || job.status === "NEW" ? "ACCEPTED" : job.status);
    setProducedQty(job.producedQuantity);
    setQcQty(job.qcPassedQuantity);
    setReadyQty(job.readyQuantity);
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
            qcPassedQuantity: qcQty,
            readyQuantity: readyQty,
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
                Manufacturing execution. Ready quantity feeds shipment batch eligibility.
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
                <Select value={targetStatus} onValueChange={(value) => setTargetStatus(value as ProductionStatus)}>
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

              {openJob.status !== "SUBMITTED" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="produced-qty">Produced</Label>
                    <Input
                      id="produced-qty"
                      type="number"
                      min={0}
                      value={producedQty}
                      onChange={(event) => setProducedQty(Math.max(0, Number(event.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qc-qty">QC passed</Label>
                    <Input
                      id="qc-qty"
                      type="number"
                      min={0}
                      value={qcQty}
                      onChange={(event) => setQcQty(Math.max(0, Number(event.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ready-qty">Ready</Label>
                    <Input
                      id="ready-qty"
                      type="number"
                      min={0}
                      value={readyQty}
                      onChange={(event) => setReadyQty(Math.max(0, Number(event.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="completed-qty">Completed</Label>
                    <Input
                      id="completed-qty"
                      type="number"
                      min={0}
                      value={completedQty}
                      onChange={(event) => setCompletedQty(Math.max(0, Number(event.target.value) || 0))}
                    />
                  </div>
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
