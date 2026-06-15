import { useMemo, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Package,
  Printer,
  XCircle,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DistributionStatusBadge,
  PodStatusBadge,
  ProductionStatusBadge,
  ShipmentBatchStatusBadge,
} from "@/components/domain/badges/badges";
import { DeliveryProgressBar } from "@/components/domain/DeliveryProgressBar";
import { CreateBatchDialog } from "@/components/domain/dialogs/CreateBatchDialog";
import { SalesPointAllocationTable } from "@/components/domain/tables/SalesPointAllocationTable";
import { generateDeliveryNote } from "@/lib/deliveryNote";
import { resolveQuantityComplaint, useOrders } from "@/lib/orderStore";
import { cn } from "@/lib/utils";
import { buildAllocationRows, useHydratedOrder } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";

interface VendorUpdateProgressProps {
  userRole?: UserRole;
}

export function VendorUpdateProgress({ userRole = "vendor" }: VendorUpdateProgressProps) {
  const { id } = useParams();
  const orders = useOrders();
  const hydrated = useHydratedOrder(id);
  const actor = useActor(userRole, "vendor-order-detail");
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const deliveryNote = generateDeliveryNote(order);
  const deliverySnapshot = deliveryNote.deliverySnapshot;
  const totalOrdered = getTotalQuantity(order);
  const backPath = `/${userRole}/orders`;
  const allocationRows = useMemo(() => (hydrated ? buildAllocationRows(hydrated) : []), [hydrated]);
  const canCreateBatch = allocationRows.some((row) => row.canAddToBatch);
  const workflowBatch = useMemo(
    () => (hydrated ? pickWorkflowBatch(hydrated.shipmentBatches) : undefined),
    [hydrated],
  );

  const complaint = order.complaint;
  const complaintSummary = useMemo(() => {
    if (!complaint) return null;
    const totalRequested = complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0);
    const totalActual = complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0);
    const totalDelta = complaint.items.reduce((total, item) => total + item.deltaQty, 0);
    return { totalRequested, totalActual, totalDelta };
  }, [complaint]);

  const [vendorNote, setVendorNote] = useState("");
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [preselectedAllocationIds, setPreselectedAllocationIds] = useState<string[]>([]);

  const handleComplaintDecision = (decision: "approved" | "rejected") => {
    if (!complaint) return;
    resolveQuantityComplaint(order.id, {
      decision,
      reviewedBy: "Vendor Admin",
      reviewNote:
        vendorNote.trim() ||
        (decision === "approved"
          ? "Vendor approved the quantity revision."
          : "Vendor rejected the quantity revision."),
    });
  };

  const openBatchDialog = (allocationId?: string) => {
    setPreselectedAllocationIds(allocationId ? [allocationId] : []);
    setIsBatchDialogOpen(true);
  };

  const renderWorkflowActions = (size: "default" | "sm" = "sm") => (
    <>
      {canCreateBatch ? (
        <Button size={size} onClick={() => openBatchDialog()}>
          Create Shipment Batch
        </Button>
      ) : null}
      {workflowBatch ? (
        <Button asChild variant={canCreateBatch ? "outline" : "default"} size={size}>
          <Link to={`/${userRole}/shipments/${workflowBatch.id}`}>
            <Package className="h-4 w-4" />
            {canCreateBatch ? "Open Active Batch" : "Open Shipment Batch"}
          </Link>
        </Button>
      ) : null}
      {workflowBatch?.deliveryNoteId ? (
        <Button asChild variant="outline" size={size}>
          <Link to={`/${userRole}/shipments/${workflowBatch.id}/delivery-note`}>
            <Printer className="h-4 w-4" />
            Delivery Note
          </Link>
        </Button>
      ) : null}
      {workflowBatch ? (
        <Button asChild variant="outline" size={size}>
          <Link to={`/${userRole}/shipments/${workflowBatch.id}/labels`}>
            <Package className="h-4 w-4" />
            Labels
          </Link>
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={order.id}
          breadcrumbs={[
            { label: "All Orders", to: backPath },
            { label: order.id },
          ]}
          actions={renderWorkflowActions()}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_389px]">
              <div className="space-y-6">
                {hydrated ? (
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="text-base">Workflow Status</CardTitle>
                        <CardDescription>Production, shipment, and POD progress from normalized workflow stores.</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ProductionStatusBadge status={hydrated.productionStatus} />
                        <DistributionStatusBadge status={hydrated.distributionStatus} />
                        <PodStatusBadge status={hydrated.podStatus} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <MiniStat label="Ordered" value={`${hydrated.order.quantitySummary.orderedQuantity} pcs`} />
                        <MiniStat label="Allocated" value={`${hydrated.order.quantitySummary.allocatedQuantity} pcs`} />
                        <MiniStat label="Shipped" value={`${hydrated.order.quantitySummary.shippedQuantity} pcs`} />
                        <MiniStat label="Received" value={`${hydrated.order.quantitySummary.receivedQuantity} pcs`} />
                      </div>
                      <DeliveryProgressBar
                        receivedQuantity={hydrated.order.quantitySummary.receivedQuantity}
                        allocatedQuantity={hydrated.order.quantitySummary.allocatedQuantity}
                        shippedQuantity={hydrated.order.quantitySummary.shippedQuantity}
                      />

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Allocation Breakdown by Sales Point ({allocationRows.length})</p>
                            <p className="text-xs text-muted-foreground">Operational split of each ordered line into destination-level fulfillment.</p>
                          </div>
                        </div>
                        <div className="rounded-md border">
                          <SalesPointAllocationTable
                            rows={allocationRows}
                            onAddToBatch={(allocationId) => openBatchDialog(allocationId)}
                          />
                        </div>
                      </div>

                      {hydrated.shipmentBatches.length > 0 ? (
                        <div>
                          <p className="mb-2 text-sm font-medium">Shipment Batches ({hydrated.shipmentBatches.length})</p>
                          <div className="space-y-2">
                            {hydrated.shipmentBatches.map((batch) => (
                              <Link
                                key={batch.id}
                                to={`/${userRole}/shipments/${batch.id}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/40"
                              >
                                <span className="font-mono text-xs font-medium">{batch.batchNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                  {batch.quantitySummary.shippedQuantity} shipped · {batch.quantitySummary.verifiedReceivedQuantity} received
                                </span>
                                <ShipmentBatchStatusBadge status={batch.status} />
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={order.status} />
                      <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.24em]">
                        OR Reference: {order.id}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created: {order.createdDate}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/70">
                      <DetailRow label="Supplier" value={<span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">{order.supplier}<ArrowUpRight className="h-3.5 w-3.5 text-primary" /></span>} />
                      <DetailRow label="Customer PO Ref" value={<span className="text-sm font-medium text-foreground">{order.clientPO}</span>} />
                      <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber || "—"}</span>} />
                      <DetailRow label="Deadline" value={<span className={cn("text-sm font-medium", order.deadline === "Overdue" ? "text-destructive" : "text-foreground")}>{order.deadline}</span>} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      {deliveryNote.missingRequiredFields.length > 0 ? (
                        <Badge variant="warning" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                          {deliveryNote.missingRequiredFields.length} missing field(s)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                          Ready for print ({totalOrdered})
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border-b border-border/70 px-6 py-4">
                      <p className="text-sm font-medium">Ordered Line Items</p>
                      <p className="mt-1 text-xs text-muted-foreground">Original commercial order lines before they are allocated across sales points.</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Delivered</TableHead>
                          <TableHead>Outstanding</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item, index) => {
                          const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.productCode}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-sm">{deliveryLine?.deliveredQty ?? 0}</TableCell>
                              <TableCell className="text-sm">{deliveryLine?.outstandingQty ?? item.quantity}</TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm italic leading-6 text-muted-foreground">
                      {order.note?.trim() || "No internal notes for this order."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/70">
                      <StackRow label="Company (entity)" value={deliverySnapshot.clientEntityName} />
                      <StackRow label="PIC Client Name" value={deliverySnapshot.picClient} />
                      <StackRow label="Address">
                        <p>{deliverySnapshot.wcode} · {deliverySnapshot.deliveryLocationName}</p>
                        <p className="mt-0.5">{deliverySnapshot.address}</p>
                      </StackRow>
                      <StackRow label="Phone" value={deliverySnapshot.phone} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Project</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/70">
                      <StackRow label="Project">
                        <p>{order.campaign ?? ""}</p>
                      </StackRow>

                      <StackRow label="Link">
                        {order.referenceLink ? (
                          <a
                            href={order.referenceLink.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-link hover:underline"
                            title={order.referenceLink.url}
                          >
                            {order.referenceLink.displayTitle?.trim() || order.referenceLink.url}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </StackRow>
                    </div>
                  </CardContent>
                </Card>

                {complaint ? (
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="border-b bg-muted/20">
                      <CardTitle className="text-base">Complaint Review</CardTitle>
                      <CardDescription>Approve or reject the PMG quantity revision.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint ID</p>
                          <p className="mt-1 text-sm font-medium">{complaint.id}</p>
                        </div>
                        <StatusChip status={complaint.status} />
                      </div>

                      {complaintSummary ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <MiniStat label="Requested Qty" value={`${complaintSummary.totalRequested} pcs`} />
                          <MiniStat label="Actual Received" value={`${complaintSummary.totalActual} pcs`} />
                          <MiniStat label="Delta" value={`${complaintSummary.totalDelta} pcs`} />
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        {complaint.items.map((item) => (
                          <div key={item.lineId} className="rounded-lg border border-border/60 bg-background p-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber}</p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>Delivered: {item.systemDeliveredQty} pcs</p>
                                <p>Actual: {item.actualReceivedQty} pcs</p>
                              </div>
                            </div>
                            <p className="mt-2 text-xs font-medium text-destructive">Missing {item.deltaQty} pcs</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Remarks</p>
                        <p className="text-sm text-muted-foreground">{complaint.remarks}</p>
                      </div>

                      <Textarea
                        value={vendorNote}
                        onChange={(event) => setVendorNote(event.target.value)}
                        placeholder="Add vendor review note before approval or rejection."
                      />

                      {complaint.status === "pending" ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleComplaintDecision("rejected")}>
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                          <Button className="w-full sm:w-auto" onClick={() => handleComplaintDecision("approved")}>
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                          This complaint has already been reviewed.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </ContentArea>

      <CreateBatchDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        order={hydrated}
        actor={actor}
        preselectedAllocationIds={preselectedAllocationIds}
      />
    </div>
  );
}

function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-6 py-3">
      <p className="w-32 text-sm text-muted-foreground shrink-0">{label}</p>
      <div className="flex-1 min-w-0 space-y-1">
        <div>{value}</div>
      </div>
    </div>
  );
}

function StackRow({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-6 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      {value ? <p className="text-sm font-medium text-foreground">{value}</p> : null}
      {children ? <div className="text-sm font-medium text-foreground">{children}</div> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  const config =
    status === "approved"
      ? { icon: CheckCircle2, label: "Approved", className: "border-success/30 bg-success/10 text-success" }
      : status === "rejected"
        ? { icon: XCircle, label: "Rejected", className: "border-destructive/30 bg-destructive/10 text-destructive" }
        : { icon: ClipboardList, label: "Pending", className: "border-warning/30 bg-warning/10 text-warning" };
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]", config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function pickWorkflowBatch<T extends { status: string }>(batches: T[]): T | undefined {
  return batches
    .slice()
    .reverse()
    .find((batch) => !["CLOSED", "FULLY_RECEIVED", "CANCELLED", "VOIDED"].includes(batch.status)) ?? batches.at(-1);
}
