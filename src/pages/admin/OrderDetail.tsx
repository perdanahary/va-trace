import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  ClipboardList,
  CheckCircle2,
  Edit3,
  FileText,
  MapPin,
  Package,
  Printer,
  Send,
  Trash2,
  XCircle,
  User,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateDeliveryNote } from "@/lib/deliveryNote";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { raiseQuantityComplaint, useOrders } from "@/lib/orderStore";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface OrderDetailProps {
  role?: UserRole;
}

export function OrderDetail({ role = "admin" }: OrderDetailProps) {
  const { id } = useParams();
  const orders = useOrders();
  const order = orders.find((entry) => entry.id === id) ?? orders[0];
  const deliveryNote = generateDeliveryNote(order);
  const deliverySnapshot = deliveryNote.deliverySnapshot;
  const fulfillmentStatus = getBaseOrderStatus(order.status);
  const totalOrdered = getTotalQuantity(order);
  const totalDelivered = deliveryNote.lines.reduce((total, line) => total + line.deliveredQty, 0);
  const totalOutstanding = deliveryNote.lines.reduce((total, line) => total + line.outstandingQty, 0);
  const backPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
  const deliveryNotePath = role === "admin" ? `/admin/orders/${order.id}/delivery-note` : `/${role}/orders/${order.id}/delivery-note`;
  const packagingLabelsPath = role === "admin" ? `/admin/orders/${order.id}/packaging-labels` : `/${role}/orders/${order.id}/packaging-labels`;
  const complaint = order.complaint;
  const canRaiseComplaint = role === "admin" || role === "operator";
  const complaintItems = useMemo(
    () =>
      order.items.map((item) => {
        const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);

        return {
          id: item.id,
          productName: item.name,
          poLineNumber: item.poLineNumber,
          orderedQty: item.quantity,
          systemDeliveredQty: deliveryLine?.deliveredQty ?? item.deliveredQuantity ?? 0,
          actualReceivedQty: complaint?.items.find((entry) => entry.lineId === item.id)?.actualReceivedQty ?? deliveryLine?.deliveredQty ?? item.deliveredQuantity ?? 0,
        };
      }),
    [complaint?.items, deliveryNote.lines, order.items],
  );
  const [isComplaintDialogOpen, setIsComplaintDialogOpen] = useState(false);
  const [complaintRemarks, setComplaintRemarks] = useState("");
  const [complaintDraftItems, setComplaintDraftItems] = useState(complaintItems);
  const complaintLocked = complaint?.status === "pending";

  const complaintSummary = useMemo(() => {
    if (!complaint) {
      return null;
    }

    const totalRequested = complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0);
    const totalActual = complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0);
    const totalDelta = complaint.items.reduce((total, item) => total + item.deltaQty, 0);

    return { totalRequested, totalActual, totalDelta };
  }, [complaint]);

  const openComplaintDialog = () => {
    setComplaintDraftItems(complaintItems.map((item) => ({ ...item })));
    setComplaintRemarks(complaint?.remarks ?? "");
    setIsComplaintDialogOpen(true);
  };

  const submitComplaint = () => {
    raiseQuantityComplaint(order.id, {
      createdBy: role === "admin" ? "Admin / PMG" : "PMG User",
      remarks: complaintRemarks.trim() || "Delivery quantity discrepancy reported by PMG.",
      items: complaintDraftItems.map((item) => ({
        lineId: item.id,
        actualReceivedQty: item.actualReceivedQty,
      })),
    });
    setIsComplaintDialogOpen(false);
  };

  const adjustComplaintItem = (index: number, delta: number) => {
    setComplaintDraftItems((current) =>
      current.map((currentItem, currentIndex) =>
        currentIndex === index
          ? {
              ...currentItem,
              actualReceivedQty: clampQuantity(currentItem.actualReceivedQty + delta, currentItem.orderedQty),
            }
          : currentItem,
      ),
    );
  };

  const complaintTimeline = complaint
    ? [
        {
          status: "Complaint Raised",
          actor: `${complaint.createdBy}`,
          date: formatDateLabel(complaint.createdAt),
          time: formatTimeLabel(complaint.createdAt),
          note: complaint.remarks,
          active: true,
        },
        ...(complaint.reviewedAt
          ? [
              {
                status: complaint.status === "approved" ? "Vendor Approved Revision" : "Vendor Rejected Revision",
                actor: complaint.reviewedBy ?? "Vendor",
                date: formatDateLabel(complaint.reviewedAt),
                time: formatTimeLabel(complaint.reviewedAt),
                note: complaint.reviewNote,
                active: complaint.status === "approved",
              },
            ]
          : []),
        ...(complaint.status === "approved" && complaintSummary
          ? [
              {
                status: "Quantity Adjusted",
                actor: "VA Trace System",
                date: complaint.reviewedAt ? formatDateLabel(complaint.reviewedAt) : "",
                time: complaint.reviewedAt ? formatTimeLabel(complaint.reviewedAt) : "",
                note: `Delivered quantity updated from ${complaintSummary.totalRequested} to ${complaintSummary.totalActual}.`,
                active: false,
              },
            ]
          : []),
      ]
    : [];

  const headerActions = (
    <>
      <Button asChild>
        <Link to={deliveryNotePath}>
          <Printer className="h-4 w-4" />
          Delivery Note
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={packagingLabelsPath}>
          <Package className="h-4 w-4" />
          Packaging Labels
        </Link>
      </Button>
      <Button variant="outline">
        <Edit3 className="h-4 w-4" />
        Edit Order
      </Button>
      <Button variant="destructive">
        <Trash2 className="h-4 w-4" />
        Cancel OR
      </Button>
      {canRaiseComplaint ? (
        <Button onClick={openComplaintDialog} variant={complaint ? "outline" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          {complaint ? "Review Complaint" : "Raise Complaint"}
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header
          title={order.id}
          breadcrumbs={[
            { label: "All Orders", to: backPath },
            { label: order.id },
          ]}
          actions={headerActions}
        />

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/20">
                  <div className="flex flex-wrap items-center gap-3">
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
                <CardContent className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
                  <InfoItem label="Supplier" value={order.supplier} icon={User} />
                  <InfoItem label="Customer PO Ref" value={order.clientPO} icon={FileText} />
                  <InfoItem label="Destination" value={`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`} icon={MapPin} />
                  <InfoItem label="Deadline" value={order.deadline} icon={Clock} color={order.deadline === "Overdue" ? "text-destructive" : "text-foreground"} />
                </CardContent>
              </Card>

              <Tabs defaultValue="alignment" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="alignment">Alignment</TabsTrigger>
                  <TabsTrigger value="items">Line Items</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="alignment">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/20">
                      <div>
                        <CardTitle className="text-base">Order to Delivery Alignment</CardTitle>
                        <CardDescription>Values below are derived from the same data used by the delivery note.</CardDescription>
                      </div>
                      {deliveryNote.missingRequiredFields.length > 0 ? (
                        <Badge variant="warning" className="rounded-full uppercase tracking-[0.24em]">
                          {deliveryNote.missingRequiredFields.length} missing field(s)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="rounded-full uppercase tracking-[0.24em]">
                          Ready for print
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      {deliveryNote.missingRequiredFields.length > 0 ? (
                        <Alert className="border-warning/30 bg-warning/10">
                          <AlertTitle>Missing data before print</AlertTitle>
                          <AlertDescription>Complete: {deliveryNote.missingRequiredFields.join(", ")}.</AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <AlignmentItem label="Program" value={deliveryNote.programName} note="Mapped from campaign name on create form" />
                        <AlignmentItem label="SO Number" value={deliveryNote.soNumber} note="Used by the delivery note" />
                        <AlignmentItem label="PIC Program" value={deliveryNote.picProgram} note="Entered alongside the order request" />
                        <AlignmentItem label="Deliver to" value={deliverySnapshot.deliveryCompanyName} note={deliverySnapshot.deliveryLocationName} />
                        <AlignmentItem label="Address" value={deliverySnapshot.address} note={deliverySnapshot.phone} />
                        <AlignmentItem label="PIC Client" value={deliverySnapshot.picClient} note={deliverySnapshot.wcode} />
                      </div>

                      <Separator />

                      <div className="grid gap-4 md:grid-cols-3">
                        <AlignmentStat label="Ordered Qty" value={`${totalOrdered} pcs`} />
                        <AlignmentStat label="Delivered Qty" value={`${totalDelivered} pcs`} />
                        <AlignmentStat label="Outstanding Qty" value={`${totalOutstanding} pcs`} />
                      </div>

                      {complaint ? (
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint Revision</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{complaint.id}</p>
                            </div>
                            <StatusChip status={complaint.status} />
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <AlignmentStat label="Requested Qty" value={`${complaintSummary?.totalRequested ?? 0} pcs`} />
                            <AlignmentStat label="Actual Received" value={`${complaintSummary?.totalActual ?? 0} pcs`} />
                            <AlignmentStat label="Delta" value={`${complaintSummary?.totalDelta ?? 0} pcs`} />
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">{complaint.remarks}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="items">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
                      <div>
                        <CardTitle className="text-base">Line Items</CardTitle>
                        <CardDescription>Item quantities and delivery status</CardDescription>
                      </div>
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                        Total Qty: {totalOrdered}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>PO Line</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Delivered</TableHead>
                            <TableHead>Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item) => {
                            const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.productCode}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{item.poLineNumber}</TableCell>
                                <TableCell className="text-sm">{item.quantity} Qty</TableCell>
                                <TableCell className="text-sm">{deliveryLine?.deliveredQty ?? 0} Qty</TableCell>
                                <TableCell className="text-sm">{deliveryLine?.outstandingQty ?? item.quantity} Qty</TableCell>
                                <TableCell className="text-sm font-medium">{item.status}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                    {(fulfillmentStatus === "In Production" || fulfillmentStatus === "Ready to Ship" || fulfillmentStatus === "Overdue") ? (
                      <CardContent className="border-t bg-muted/20 p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Fulfillment Progress</h4>
                          <Button variant="ghost" size="sm" className="gap-1 px-0">
                            <ChevronDown className="h-4 w-4" />
                            8 Progress Logs
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <ProgressRow label="Production" current={200} total={750} />
                          <ProgressRow label="Ready to Ship" current={100} total={750} />
                          <ProgressRow label="On Delivery" current={0} total={750} opacity />
                          <ProgressRow label="Delivered" current={0} total={750} opacity />
                        </div>
                      </CardContent>
                    ) : null}
                  </Card>
                </TabsContent>

                <TabsContent value="timeline">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="border-b bg-muted/20">
                      <CardTitle className="text-base">Timeline Tracking</CardTitle>
                      <CardDescription>Workflow events for this order request</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <TimelineItem status="Created" actor="CUSTOMER (Brand Manager)" date="June 01, 2026" time="14:30" isLast />
                      <TimelineItem status="Assigned" actor="ADMIN (Procurement Manager)" date="June 02, 2026" time="09:15" />
                      <TimelineItem status="Accepted" actor="VENDOR (Supplier)" date="June 02, 2026" time="11:45" />
                      {complaintTimeline.map((entry, index) => (
                        <TimelineItem
                          key={`${entry.status}-${index}`}
                          status={entry.status}
                          actor={entry.actor}
                          date={entry.date}
                          time={entry.time}
                          note={entry.note}
                          active={entry.active}
                        />
                      ))}
                      {fulfillmentStatus === "Ready to Ship" ? (
                        <TimelineItem
                          status="Ready to Ship"
                          actor="VENDOR"
                          date="June 05, 2026"
                          time="10:00"
                          note="Auto-advanced (partial progress)"
                          active
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                  <CardDescription>Quick context and note snapshot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <AlignmentStat label="Order Status" value={fulfillmentStatus} />
                  <AlignmentStat label="Assigned Vendor" value={order.supplier} />
                  <AlignmentStat label="Sales Point" value={deliverySnapshot.wcode} />
                  {complaint ? <AlignmentStat label="Complaint Status" value={complaint.status} /> : null}
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Internal Notes</p>
                    <p className="mt-2 text-sm italic text-muted-foreground">{deliveryNote.note}</p>
                  </div>
                </CardContent>
              </Card>

              {complaint ? (
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Complaint Audit Trail</CardTitle>
                    <CardDescription>Recorded revision history for this order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6">
                    {complaint.history.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{entry.action.replace(/-/g, " ")}</p>
                          <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.actor}</p>
                        {entry.note ? <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p> : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-base">Direct Actions</CardTitle>
                  <CardDescription>Print and workflow shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-6">
                  <Button asChild className="w-full">
                    <Link to={deliveryNotePath}>
                      <Printer className="h-4 w-4" />
                      Delivery Note
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={packagingLabelsPath}>
                      <Package className="h-4 w-4" />
                      Packaging Labels
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isComplaintDialogOpen} onOpenChange={setIsComplaintDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{complaint ? "Complaint Review" : "Raise Quantity Complaint"}</DialogTitle>
            <DialogDescription>
              {complaint
                ? "Review the submitted actual received quantities and vendor response."
                : "Record the actual received quantity for each item before sending the revision request to vendor."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Order</p>
                  <p className="mt-1 text-sm font-medium">{order.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint Status</p>
                  <div className="mt-2">
                    <StatusChip status={complaint?.status ?? "pending"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {complaintDraftItems.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Ordered" value={`${item.orderedQty} pcs`} />
                      <MiniStat label="System Delivered" value={`${item.systemDeliveredQty} pcs`} />
                      <MiniStat label="Delta" value={`${Math.max(item.systemDeliveredQty - item.actualReceivedQty, 0)} pcs`} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Actual Received Qty</p>
                    <Input
                      type="number"
                      min={0}
                      max={item.orderedQty}
                      value={item.actualReceivedQty}
                      disabled={complaintLocked}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value) || 0;
                        setComplaintDraftItems((current) =>
                          current.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  actualReceivedQty: clampQuantity(nextValue, currentItem.orderedQty),
                                }
                              : currentItem,
                          ),
                        );
                      }}
                    />
                  </div>
                  {!complaintLocked ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -5)}>
                        -5
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -1)}>
                        -1
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 1)}>
                        +1
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 5)}>
                        +5
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Remarks</p>
              <Textarea
                value={complaintRemarks}
                disabled={complaintLocked}
                onChange={(event) => setComplaintRemarks(event.target.value)}
                placeholder="Explain the discrepancy and expected correction."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsComplaintDialogOpen(false)}>
              Close
            </Button>
            {!complaintLocked ? (
              <Button onClick={submitComplaint}>
                <Send className="h-4 w-4" />
                Submit Complaint
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function clampQuantity(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(value), max));
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoItem({ label, value, icon: Icon, color = "text-foreground" }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("truncate text-sm font-medium", color)}>{value}</p>
    </div>
  );
}

function AlignmentItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
      {note ? <p className="mt-1 break-words text-xs text-muted-foreground">{note}</p> : null}
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

function ProgressRow({ label, current, total, opacity = false }: { label: string; current: number; total: number; opacity?: boolean }) {
  const percentage = (current / total) * 100;
  return (
    <div className={cn("space-y-1.5", opacity && "opacity-40")}>
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.24em]">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <Progress value={percentage} className="h-2" />
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
        {note ? <p className="mt-1 text-xs font-medium italic text-primary">“{note}”</p> : null}
      </div>
    </div>
  );
}
