import { useMemo, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  MoreHorizontal,
  Package,
  Printer,
  Truck,
  XCircle,
  Play,
  Tag,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { generateDeliveryNote } from "@/lib/deliveryNote";
import { generateSoNumber } from "@/lib/mockData";
import { getBaseOrderStatus, getOrderRequestStatus } from "@/lib/orderStatus";
import {
  generateLabelForItem,
  resolveQuantityComplaint,
  upsertOrder,
  useOrders,
} from "@/lib/orderStore";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/components/ui/StatusBadge";
import type { LabelStatus } from "@/lib/mockData";

interface VendorUpdateProgressProps {
  role?: UserRole;
}

const STAGE_FLOW: OrderStatus[] = [
  "New",
  "In Production",
  "Ready to Ship",
  "On Delivery",
  "Delivered",
  "Completed",
];

function getStageIndex(status: string): number {
  return STAGE_FLOW.indexOf(status as OrderStatus);
}

export function VendorUpdateProgress({ role = "vendor" }: VendorUpdateProgressProps) {
  const { id } = useParams();
  const orders = useOrders();
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const deliveryNote = generateDeliveryNote(order);
  const deliverySnapshot = deliveryNote.deliverySnapshot;
  const totalOrdered = getTotalQuantity(order);
  const totalDelivered = deliveryNote.lines.reduce((total, line) => total + line.deliveredQty, 0);
  const totalOutstanding = deliveryNote.lines.reduce((total, line) => total + line.outstandingQty, 0);
  const backPath = `/${role}/orders`;

  const complaint = order.complaint;
  const complaintSummary = useMemo(() => {
    if (!complaint) return null;
    const totalRequested = complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0);
    const totalActual = complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0);
    const totalDelta = complaint.items.reduce((total, item) => total + item.deltaQty, 0);
    return { totalRequested, totalActual, totalDelta };
  }, [complaint]);

  const [vendorNote, setVendorNote] = useState("");

  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    order.items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [order]);

  const lowestStage = useMemo(() => {
    const stages = order.items.map((item) => getStageIndex(item.status));
    return Math.min(...stages);
  }, [order]);

  const advanceToProduction = () => {
    const updatedItems = order.items.map((item) => {
      const idx = getStageIndex(item.status);
      if (idx < getStageIndex("In Production")) {
        return { ...item, status: "In Production" as const };
      }
      return item;
    });
    upsertOrder({
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
      soNumber: order.soNumber || generateSoNumber(),
    } as any);
  };

  const advanceToReadyToShip = () => {
    const updatedItems = order.items.map((item) => {
      const idx = getStageIndex(item.status);
      if (idx < getStageIndex("Ready to Ship")) {
        return { ...item, status: "Ready to Ship" as const };
      }
      return item;
    });
    upsertOrder({
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
    } as any);
  };

  const advanceToOnDelivery = () => {
    const updatedItems = order.items.map((item) => {
      const idx = getStageIndex(item.status);
      if (idx < getStageIndex("On Delivery")) {
        return { ...item, status: "On Delivery" as const };
      }
      return item;
    });
    upsertOrder({
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
    } as any);
  };

  const advanceToDelivered = () => {
    const updatedItems = order.items.map((item) => {
      const idx = getStageIndex(item.status);
      if (idx < getStageIndex("Delivered")) {
        return { ...item, status: "Delivered" as const };
      }
      return item;
    });
    upsertOrder({
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
    } as any);
  };

  const handleGenerateLabel = (lineId: string) => {
    generateLabelForItem(order.id, lineId);
  };

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

  const nextStageIndex = lowestStage + 1;
  const canAdvanceToProduction = STAGE_FLOW[nextStageIndex] === "In Production";
  const canAdvanceToReadyToShip = STAGE_FLOW[nextStageIndex] === "Ready to Ship";
  const canAdvanceToOnDelivery = STAGE_FLOW[nextStageIndex] === "On Delivery";
  const canAdvanceToDelivered = STAGE_FLOW[nextStageIndex] === "Delivered";

  const deliverableItems = order.items.filter((i) => (i.deliveredQuantity ?? 0) > 0);
  const labeledCount = order.storedLabels.length;
  const allDeliverableLabeled = deliverableItems.length > 0 && deliverableItems.every((i) => i.labelGenerated);

  const isNewOrder = order.status === "New";

  const headerActions = isNewOrder ? (
    <>
      <Button size="sm" disabled={!canAdvanceToProduction} onClick={advanceToProduction}>
        <Play className="h-4 w-4" />
        Start Production
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled={!canAdvanceToReadyToShip} onClick={advanceToReadyToShip}>
            <Package className="h-4 w-4" />
            Ready to Ship
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdvanceToOnDelivery} onClick={advanceToOnDelivery}>
            <Truck className="h-4 w-4" />
            On Delivery
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdvanceToDelivered} onClick={advanceToDelivered}>
            <CheckCircle2 className="h-4 w-4" />
            Delivered
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!allDeliverableLabeled} asChild>
            <Link to={`/${role}/orders/${order.id}/delivery-note`}>
              <Printer className="h-4 w-4" />
              Delivery Note
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!allDeliverableLabeled} asChild>
            <Link to={`/${role}/orders/${order.id}/packaging-labels`}>
              <Package className="h-4 w-4" />
              Labels
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : (
    <>
      <StageAdvanceButton
        label="In Production"
        icon={Play}
        count={stageDistribution["In Production"] ?? 0}
        disabled={!canAdvanceToProduction}
        onClick={advanceToProduction}
        compact
      />
      <StageAdvanceButton
        label="Ready to Ship"
        icon={Package}
        count={stageDistribution["Ready to Ship"] ?? 0}
        disabled={!canAdvanceToReadyToShip}
        onClick={advanceToReadyToShip}
        compact
      />
      <StageAdvanceButton
        label="On Delivery"
        icon={Truck}
        count={stageDistribution["On Delivery"] ?? 0}
        disabled={!canAdvanceToOnDelivery}
        onClick={advanceToOnDelivery}
        compact
      />
      <StageAdvanceButton
        label="Delivered"
        icon={CheckCircle2}
        count={stageDistribution["Delivered"] ?? 0}
        disabled={!canAdvanceToDelivered}
        onClick={advanceToDelivered}
        compact
      />
      <Button asChild size="sm" variant="outline" disabled={!allDeliverableLabeled}>
        <Link to={`/${role}/orders/${order.id}/delivery-note`}>
          <Printer className="h-4 w-4" />
          Delivery Note
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm" disabled={!allDeliverableLabeled}>
        <Link to={`/${role}/orders/${order.id}/packaging-labels`}>
          <Package className="h-4 w-4" />
          Labels
        </Link>
      </Button>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <ContentArea>
        <Header
          title={order.id}
          breadcrumbs={[
            { label: "All Orders", to: backPath },
            { label: order.id },
          ]}
          actions={headerActions}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_389px]">
              <div className="space-y-6">
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
                    <div className="flex items-start justify-between gap-4 px-6 py-6">
                      <div>
                        <CardTitle className="text-base">Order Information</CardTitle>
                        <CardDescription>Manage fulfillment progress for this order.</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <LabelStatusBadge status={order.labelStatus} />
                        {deliveryNote.missingRequiredFields.length > 0 ? (
                          <Badge variant="warning" className="rounded-full uppercase tracking-[0.24em]">
                            {deliveryNote.missingRequiredFields.length} missing field(s)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="rounded-full uppercase tracking-[0.24em]">
                            Ready for print
                          </Badge>
                        )}
                      </div>
                    </div>

                    {deliveryNote.missingRequiredFields.length > 0 ? (
                      <div className="border-t border-border/70 px-6 py-4">
                        <Alert className="border-warning/30 bg-warning/10">
                          <AlertTitle>Missing data before print</AlertTitle>
                          <AlertDescription>Complete: {deliveryNote.missingRequiredFields.join(", ")}.</AlertDescription>
                        </Alert>
                      </div>
                    ) : null}

                    <div className="border-t border-border/70 divide-y divide-border/70">
                      <DetailRow label="Supplier" value={<span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">{order.supplier}<ArrowUpRight className="h-3.5 w-3.5 text-primary" /></span>} />
                      <DetailRow label="Customer PO Ref" value={<span className="text-sm font-medium text-foreground">{order.clientPO}</span>} />
                      <DetailRow label="Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.projectName}</span>} />
                      <DetailRow label="Deadline" value={<span className={cn("text-sm font-medium", order.deadline === "Overdue" ? "text-destructive" : "text-foreground")}>{order.deadline}</span>} />
                      <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber || "—"}</span>} />
                      <DetailRow label="PIC Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.picProject}</span>} />
                      <DetailRow label="Destination" value={<span className="text-sm font-medium text-foreground">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />
                      <DetailRow label="Deliver to" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.deliveryCompanyName}</span>} />
                      <DetailRow label="Address" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.address}</span>} />
                      <DetailRow label="PIC Client" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.picClient}</span>} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
                    <div>
                      <CardTitle className="text-base">Line Items</CardTitle>
                      <CardDescription>Generate labels per item before bulk fulfillment actions.</CardDescription>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                      Total Qty: {totalOrdered}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Delivered</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Label</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item, index) => {
                          const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
                          const deliveredQty = item.deliveredQuantity ?? 0;
                          const canGenerate = deliveredQty > 0 && !item.labelGenerated;
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
                              <TableCell className="whitespace-nowrap text-sm font-medium">{item.status}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {item.labelGenerated ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Generated
                                  </span>
                                ) : deliveredQty > 0 ? (
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => handleGenerateLabel(item.id)}>
                                    <Tag className="h-3 w-3" />
                                    Generate
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>



                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Timeline Tracking</CardTitle>
                    <CardDescription>Workflow events for this order request</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <TimelineItem status="New" actor="CUSTOMER (Brand Manager)" date={formatDateLabel(order.createdDate)} time={formatTimeLabel(order.createdDate)} active isLast={false} />
                    <TimelineItem status="In Production" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(getBaseOrderStatus(order.status)) >= getStageIndex("In Production")} />
                    <TimelineItem status="Ready to Ship" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(getBaseOrderStatus(order.status)) >= getStageIndex("Ready to Ship")} />
                    <TimelineItem status="On Delivery" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(getBaseOrderStatus(order.status)) >= getStageIndex("On Delivery")} />
                    <TimelineItem status="Delivered" actor="VENDOR (Supplier)" date={order.createdDate} time="-" isLast active={getStageIndex(getBaseOrderStatus(order.status)) >= getStageIndex("Delivered")} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 xl:sticky xl:top-[73px] xl:self-start">
                <Card className="border-border/70 shadow-sm">
                  <CardContent className="p-6">
                    <div className="grid gap-4">
                      <AlignmentStat label="Ordered Qty" value={`${totalOrdered} pcs`} />
                      <AlignmentStat label="Delivered Qty" value={`${totalDelivered} pcs`} />
                      <AlignmentStat label="Outstanding Qty" value={`${totalOutstanding} pcs`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Fulfillment Summary</CardTitle>
                    <CardDescription>Current completion rates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <SummaryStat
                      label="In Production"
                      current={stageDistribution["In Production"] ?? 0}
                      total={order.items.length}
                      color="bg-primary"
                    />
                    <SummaryStat
                      label="Ready to Ship"
                      current={stageDistribution["Ready to Ship"] ?? 0}
                      total={order.items.length}
                      color="bg-processing"
                    />
                    <SummaryStat
                      label="On Delivery"
                      current={stageDistribution["On Delivery"] ?? 0}
                      total={order.items.length}
                      color="bg-processing"
                    />
                    <SummaryStat
                      label="Delivered"
                      current={stageDistribution["Delivered"] ?? 0}
                      total={order.items.length}
                      color="bg-success"
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Label Status</CardTitle>
                    <CardDescription>Label generation progress</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <SummaryStat
                      label="Labels Generated"
                      current={labeledCount}
                      total={deliverableItems.length}
                      color="bg-primary"
                    />
                    {allDeliverableLabeled && deliverableItems.length > 0 ? (
                      <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-center text-xs font-medium text-success">
                        All labels generated. Ready for delivery note.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm italic leading-6 text-muted-foreground">
                      {order.note?.trim() || "No internal notes for this order."}
                    </p>
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
    </div>
  );
}

function LabelStatusBadge({ status }: { status: LabelStatus }) {
  const config =
    status === "all"
      ? { variant: "success" as const, label: "All Labeled" }
      : status === "partial"
        ? { variant: "warning" as const, label: "Partial Labels" }
        : { variant: "secondary" as const, label: "No Labels" };

  return (
    <Badge variant={config.variant} className="rounded-full uppercase tracking-[0.24em]">
      {config.label}
    </Badge>
  );
}

function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatDateLabel(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimeLabel(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function AlignmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
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

function SummaryStat({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.24em]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-bold", color.replace("bg-", "text-"))}>{current}/{total}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-border/50">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function TimelineItem({ status, actor, date, time, note, isLast = false, active = false }: { status: string; actor: string; date: string; time: string; note?: string; isLast?: boolean; active?: boolean }) {
  return (
    <div className="relative pl-8">
      <div className={cn("absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background shadow-sm", active ? "bg-primary" : "bg-border")} />
      {!isLast ? <div className="absolute left-2.5 top-6 h-full w-px bg-border" /> : null}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>{status}</p>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground">{actor}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
        {note ? <p className="mt-1 text-xs font-medium italic text-primary">"{note}"</p> : null}
      </div>
    </div>
  );
}

function StageAdvanceButton({
  label,
  icon: Icon,
  count,
  disabled,
  onClick,
  compact = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(compact ? "gap-1.5" : "flex-col h-auto gap-1.5 py-4")}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
      {compact ? (
        <span className="text-[10px] text-muted-foreground font-mono">({count})</span>
      ) : (
        <span className="text-[10px] text-muted-foreground font-mono">{count} items</span>
      )}
    </Button>
  );
}
