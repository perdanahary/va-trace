import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Tags,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DeliveryConfirmationStatusBadge,
  DeliveryNoteStatusBadge,
  PodStatusBadge,
  ShipmentBatchStatusBadge,
} from "@/components/domain/badges/badges";
import { DeliveryProgressBar } from "@/components/domain/DeliveryProgressBar";
import { PodUploadDialog } from "@/components/domain/dialogs/PodUploadDialog";
import { useAuditEvents } from "@/lib/v2/auditEventStore";
import { useDeliveryNotes } from "@/lib/v2/deliveryNoteStore";
import { useOperationalExceptions } from "@/lib/v2/exceptionStore";
import { useLabelState } from "@/lib/v2/labelStore";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { hydrateShipmentBatch } from "@/lib/v2/projections";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { useActor } from "@/lib/v2/useActor";
import {
  closeBatch,
  dispatchBatch,
  generateBatchDeliveryNote,
  generateBatchLabels,
  toApiError,
} from "@/lib/v2/workflows";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RailDetail({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-sm", strong ? "font-semibold text-foreground" : "text-foreground")}>{value}</p>
    </div>
  );
}

function DocumentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Focus-card mapping per batch status
// ---------------------------------------------------------------------------

const BATCH_FOCUS: Record<string, { eyebrow: string; color: string; description: string }> = {
  DRAFT: { eyebrow: "Needs Action", color: "text-warning", description: "Batch is in draft. Mark it ready to proceed with dispatch." },
  READY: { eyebrow: "Ready for Dispatch", color: "text-warning", description: "Generate labels and dispatch this batch to destinations." },
  DISPATCHED: { eyebrow: "Dispatched", color: "text-info", description: "Batch has been dispatched. Awaiting delivery confirmations." },
  IN_TRANSIT: { eyebrow: "In Transit", color: "text-info", description: "Shipment is in transit to destinations." },
  PARTIALLY_RECEIVED: { eyebrow: "Partially Received", color: "text-warning", description: "Some items received — awaiting remaining deliveries." },
  FULLY_RECEIVED: { eyebrow: "Complete", color: "text-success", description: "All items have been fully received at destinations." },
  FAILED_DELIVERY: { eyebrow: "Attention Required", color: "text-destructive", description: "Delivery failed. Review reason and take corrective action." },
  RETURNED: { eyebrow: "Returned", color: "text-destructive", description: "Batch has been returned. Review return details." },
  EXCEPTION: { eyebrow: "Exception", color: "text-destructive", description: "An exception has been raised. Review and resolve." },
  CLOSED: { eyebrow: "Closed", color: "text-muted-foreground", description: "Batch has been closed." },
  CANCELLED: { eyebrow: "Cancelled", color: "text-muted-foreground", description: "This batch has been cancelled." },
  VOIDED: { eyebrow: "Voided", color: "text-muted-foreground", description: "This batch has been voided." },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShipmentBatchDetailProps {
  userRole?: UserRole;
}

export function ShipmentBatchDetail({ userRole = "admin" }: ShipmentBatchDetailProps) {
  const { id } = useParams<{ id: string }>();
  const rolePrefix = `/${userRole}`;
  const actor = useActor(userRole, "shipment-batch-detail");

  const batches = useShipmentBatches();
  const confirmations = useDeliveryConfirmations();
  const exceptions = useOperationalExceptions();
  const deliveryNotes = useDeliveryNotes();
  const labelState = useLabelState();
  const auditEvents = useAuditEvents();

  const [podOpen, setPodOpen] = useState(false);

  // Sidebar collapsible state
  const [isEssentialsExpanded, setIsEssentialsExpanded] = useState(true);
  const [isQuantitiesExpanded, setIsQuantitiesExpanded] = useState(false);
  const [isCarrierExpanded, setIsCarrierExpanded] = useState(false);
  const [isDestinationsExpanded, setIsDestinationsExpanded] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isExceptionsExpanded, setIsExceptionsExpanded] = useState(false);

  const batch = useMemo(() => {
    const raw = batches.find((entry) => entry.id === id || entry.batchNumber === id);
    return raw ? hydrateShipmentBatch(raw, confirmations, exceptions) : undefined;
  }, [batches, confirmations, exceptions, id]);

  const batchNote = useMemo(
    () => deliveryNotes.find((note) => note.shipmentBatchId === batch?.id && note.isActive),
    [deliveryNotes, batch],
  );
  const batchConfirmations = useMemo(
    () => confirmations.filter((confirmation) => confirmation.shipmentBatchId === batch?.id),
    [confirmations, batch],
  );
  const batchLabels = useMemo(
    () => labelState.labels.filter((label) => label.shipmentBatchId === batch?.id),
    [labelState, batch],
  );
  const batchAudit = useMemo(
    () =>
      auditEvents
        .filter(
          (event) =>
            event.sourceEntityId === batch?.id ||
            (batch && batchNote && event.sourceEntityId === batchNote.id) ||
            batchConfirmations.some((confirmation) => confirmation.id === event.sourceEntityId),
        )
        .slice()
        .reverse(),
    [auditEvents, batch, batchNote, batchConfirmations],
  );

  const run = (action: () => void) => {
    try {
      action();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  if (!batch) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header title="Shipment Batch" />
          <main className="p-8">
            <p className="text-sm text-muted-foreground">Shipment batch not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={`${rolePrefix}/shipments`}>
                Back to Shipment Batches
              </Link>
            </Button>
          </main>
        </ContentArea>
      </div>
    );
  }

  const isAdmin = userRole === "admin";
  const isVendorLike = userRole === "vendor" || isAdmin || userRole === "operator";
  const canDispatch = isVendorLike && (batch.status === "READY" || batch.status === "DRAFT");
  const canUploadPod =
    (userRole === "vendor" || isAdmin) &&
    ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(batch.status);
  const canClose = isAdmin && ["PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(batch.status);
  const showCarrier = ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(batch.status);
  const focus = BATCH_FOCUS[batch.status] ?? BATCH_FOCUS.DRAFT;

  const headerActions = (
    <>
      {!batchNote && isVendorLike ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => run(() => generateBatchDeliveryNote(batch.id, actor))}
        >
          <FileText className="h-4 w-4" /> Generate DN
        </Button>
      ) : null}
      {batchNote ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`${rolePrefix}/shipments/${batch.id}/delivery-note`}>
            <Printer className="h-4 w-4" /> Print DN
          </Link>
        </Button>
      ) : null}
      {batchLabels.length === 0 && isVendorLike ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => run(() => generateBatchLabels(batch.id, actor))}
        >
          <Tags className="h-4 w-4" /> Generate Labels
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link to={`${rolePrefix}/shipments/${batch.id}/labels`}>
            <Tags className="h-4 w-4" /> Labels
          </Link>
        </Button>
      )}
      {canDispatch ? (
        <Button
          size="sm"
          onClick={() =>
            run(() => {
              dispatchBatch(batch.id, actor);
              toast.success(`Batch ${batch.batchNumber} dispatched.`);
            })
          }
        >
          Mark Dispatched
        </Button>
      ) : null}
      {canUploadPod ? (
        <Button size="sm" onClick={() => setPodOpen(true)}>
          Upload POD
        </Button>
      ) : null}
      {canClose ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            run(() => {
              closeBatch(batch.id, actor);
              toast.success(`Batch ${batch.batchNumber} closed.`);
            })
          }
        >
          Close Batch
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header
          title={batch.batchNumber}
          breadcrumbs={[
            { label: "Shipment Batches", to: `${rolePrefix}/shipments` },
            { label: batch.batchNumber },
          ]}
          actions={headerActions}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">

              {/* ================================================================ */}
              {/* MAIN CONTENT                                                      */}
              {/* ================================================================ */}
              <div className="space-y-5">
                {/* Batch identity */}
                <section className="flex flex-wrap items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold">{batch.batchNumber}</span>
                      <ShipmentBatchStatusBadge status={batch.status} />
                      <PodStatusBadge status={batch.podStatus} />
                      {batch.compatibilitySource ? (
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Legacy compatibility</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order{" "}
                      <Link to={`${rolePrefix}/orders/${batch.orderRequestId}`} className="font-mono text-link hover:underline">
                        {batch.orderRequestNumber}
                      </Link>
                      {" · "}
                      {batch.client.name} · {batch.vendor.name}
                    </p>
                  </div>
                </section>

                {/* Delivery Progress — full stepper */}
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">Delivery Progress</CardTitle>
                    <CardDescription>Item delivery milestones</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <DeliveryProgressBar
                      receivedQuantity={batch.quantitySummary.verifiedReceivedQuantity}
                      allocatedQuantity={batch.quantitySummary.allocatedContextQuantity}
                      shippedQuantity={batch.quantitySummary.shippedQuantity}
                    />
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="items">
                  <TabsList>
                    <TabsTrigger value="items">Items ({batch.items.length})</TabsTrigger>
                    <TabsTrigger value="delivery-note">Delivery Note</TabsTrigger>
                    <TabsTrigger value="labels">Labels ({batchLabels.length})</TabsTrigger>
                    <TabsTrigger value="pod">Proof of Delivery (POD) ({batchConfirmations.length})</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="items">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sales Point</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Allocated</TableHead>
                                <TableHead className="text-right">Prev. Shipped</TableHead>
                                <TableHead className="text-right">Shipped</TableHead>
                                <TableHead className="text-right">Received</TableHead>
                                <TableHead className="text-right">Variance</TableHead>
                                <TableHead>Proof of Delivery (POD)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batch.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <p className="text-sm font-medium">{item.salesPoint.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{item.salesPoint.wCode}</p>
                                  </TableCell>
                                  <TableCell className="max-w-72">
                                    <p className="truncate text-sm">{item.product.name}</p>
                                    <p className="truncate font-mono text-xs text-muted-foreground">{item.product.materialCode}</p>
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">{item.allocatedQuantity}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                                    {item.previouslyShippedQuantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium tabular-nums">{item.shippedQuantity}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">{item.verifiedReceivedQuantity}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {item.varianceQuantity !== 0 ? (
                                      <span className="text-destructive">{item.varianceQuantity}</span>
                                    ) : (
                                      <span className="text-muted-foreground">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <PodStatusBadge status={item.podStatus} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="delivery-note">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Delivery Note</CardTitle>
                        <CardDescription>One active Delivery Note per shipment batch.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {batchNote ? (
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-mono font-medium">{batchNote.deliveryNoteNumber}</span>
                            <DeliveryNoteStatusBadge status={batchNote.status} />
                            <span className="text-muted-foreground">v{batchNote.documentVersion}</span>
                            <span className="text-muted-foreground">
                              {batchNote.quantitySummary.shippedQuantity} pcs · {batchNote.quantitySummary.salesPointCount} sales point(s)
                            </span>
                            <span className="text-muted-foreground">Printed {batchNote.printCount}x</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No Delivery Note generated for this batch yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="labels">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="p-0">
                        {batchLabels.length === 0 ? (
                          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No labels generated yet.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>Destination</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Prints</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batchLabels.map((label) => (
                                <TableRow key={label.id}>
                                  <TableCell className="font-mono text-xs">{label.labelNumber}</TableCell>
                                  <TableCell className="text-sm">{label.destinationName}</TableCell>
                                  <TableCell className="text-sm">{label.productName}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">{label.quantity}</TableCell>
                                  <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">{label.status}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">{label.printCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="pod">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="p-0">
                        {batchConfirmations.length === 0 ? (
                          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                            No Proof of Delivery (POD) submissions for this batch yet.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sales Point</TableHead>
                                <TableHead>Receiver</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead className="text-right">Expected</TableHead>
                                <TableHead className="text-right">Claimed</TableHead>
                                <TableHead className="text-right">Verified</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batchConfirmations.map((confirmation) => (
                                <TableRow key={confirmation.id}>
                                  <TableCell className="text-sm">{confirmation.salesPointName}</TableCell>
                                  <TableCell className="text-sm">{confirmation.receiverName || "—"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{confirmation.receivedDate}</TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {confirmation.quantitySummary.expectedShippedQuantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {confirmation.quantitySummary.claimedReceivedQuantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {confirmation.quantitySummary.verifiedReceivedQuantity}
                                  </TableCell>
                                  <TableCell>
                                    <DeliveryConfirmationStatusBadge status={confirmation.status} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="audit">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="p-0">
                        {batchAudit.length === 0 ? (
                          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No audit events recorded.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Reason</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batchAudit.map((event) => (
                                <TableRow key={event.id}>
                                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {event.occurredAt.replace("T", " ").slice(0, 19)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {event.eventType}
                                    <span className="ml-1 text-xs text-muted-foreground">({event.sourceEntityType})</span>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {event.actorUserId} · {event.actorRole}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{event.reason ?? "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* ================================================================ */}
              {/* AT A GLANCE SIDEBAR                                              */}
              {/* ================================================================ */}
              <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="flex items-center justify-between">
                      <span>At a Glance</span>
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 p-0">

                    {/* Current State */}
                    <div className="space-y-4 border-b border-border/60 p-5">
                      <p className="text-base font-semibold">Current State</p>
                      <ShipmentBatchStatusBadge status={batch.status} />
                      <div>
                        <p className={cn("text-base font-semibold", focus.color)}>{focus.eyebrow}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{focus.description}</p>
                      </div>
                    </div>

                    {/* Batch Essentials */}
                    <div className="border-b border-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-5 text-left"
                        onClick={() => setIsEssentialsExpanded((c) => !c)}
                      >
                        <span className="text-base font-semibold">Batch Essentials</span>
                        {isEssentialsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isEssentialsExpanded ? (
                        <div className="space-y-4 border-t border-border/60 p-5">
                          <RailDetail label="Project" value={batch.project.name} />
                          <RailDetail label="Vendor" value={batch.vendor.name} />
                          <RailDetail label="Client" value={batch.client.name} />
                          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                            <p className="text-sm text-muted-foreground">Order</p>
                            <Link to={`${rolePrefix}/orders/${batch.orderRequestId}`} className="text-sm font-mono text-link hover:underline">
                              {batch.orderRequestNumber}
                            </Link>
                          </div>
                          <RailDetail
                            label="Pl. Dispatch"
                            value={batch.plannedDispatchDate ? formatDateLabel(batch.plannedDispatchDate) : "—"}
                            strong
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* Quantity Summary */}
                    <div className="border-b border-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-5 text-left"
                        onClick={() => setIsQuantitiesExpanded((c) => !c)}
                      >
                        <span className="text-base font-semibold">Quantity Summary</span>
                        {isQuantitiesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isQuantitiesExpanded ? (
                        <div className="space-y-4 border-t border-border/60 p-5">
                          <RailDetail label="Allocated" value={`${batch.quantitySummary.allocatedContextQuantity} pcs`} />
                          <RailDetail label="Shipped" value={`${batch.quantitySummary.shippedQuantity} pcs`} />
                          <RailDetail label="Received" value={`${batch.quantitySummary.verifiedReceivedQuantity} pcs`} />
                          <RailDetail
                            label="Variance"
                            value={batch.quantitySummary.varianceQuantity !== 0 ? `${batch.quantitySummary.varianceQuantity} pcs` : "0 pcs"}
                            strong={batch.quantitySummary.varianceQuantity !== 0}
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* Carrier Info */}
                    {showCarrier ? (
                      <div className="border-b border-border/60">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between p-5 text-left"
                          onClick={() => setIsCarrierExpanded((c) => !c)}
                        >
                          <span className="text-base font-semibold">Carrier</span>
                          {isCarrierExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isCarrierExpanded ? (
                          <div className="space-y-4 border-t border-border/60 p-5">
                            <RailDetail label="Carrier" value={batch.carrier?.carrierName ?? "—"} />
                            <RailDetail label="Driver" value={batch.carrier?.driverName ?? "—"} />
                            <RailDetail label="Vehicle" value={batch.carrier?.vehicleNumber ?? "—"} />
                            <RailDetail label="Tracking" value={batch.carrier?.trackingNumber ?? "—"} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Destinations */}
                    <div className="border-b border-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-5 text-left"
                        onClick={() => setIsDestinationsExpanded((c) => !c)}
                      >
                        <span className="text-base font-semibold">Destinations</span>
                        {isDestinationsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isDestinationsExpanded ? (
                        <div className="space-y-3 border-t border-border/60 p-5">
                          <p className="text-sm text-muted-foreground">
                            {batch.destinationSnapshots.length} sales point{batch.destinationSnapshots.length !== 1 ? "s" : ""}
                          </p>
                          <div className="max-h-48 space-y-2 overflow-y-auto">
                            {batch.destinationSnapshots.map((dest) => (
                              <div key={dest.salesPointId} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                                <p className="text-sm text-muted-foreground">{dest.salesPointName}</p>
                                <p className="text-sm text-foreground">{dest.zone} · {dest.region}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Documents */}
                    <div className="border-b border-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-5 text-left"
                        onClick={() => setIsDocumentsExpanded((c) => !c)}
                      >
                        <span className="text-base font-semibold">Documents</span>
                        {isDocumentsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isDocumentsExpanded ? (
                        <div className="grid gap-3 border-t border-border/60 p-5 sm:grid-cols-2">
                          <DocumentStat label="Delivery Notes" value={batchNote ? "1" : "0"} />
                          <DocumentStat label="Labels" value={String(batchLabels.length)} />
                          <DocumentStat label="POD" value={String(batchConfirmations.length)} />
                        </div>
                      ) : null}
                    </div>

                    {/* Exceptions */}
                    {batch.exceptionSummary.hasException ? (
                      <div className="border-b border-border/60">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between p-5 text-left"
                          onClick={() => setIsExceptionsExpanded((c) => !c)}
                        >
                          <span className="text-base font-semibold">Exceptions</span>
                          {isExceptionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isExceptionsExpanded ? (
                          <div className="space-y-4 border-t border-border/60 p-5">
                            <div
                              className={cn(
                                "rounded-md border px-4 py-3",
                                batch.exceptionSummary.highestSeverity === "CRITICAL"
                                  ? "border-destructive/30 bg-destructive/5"
                                  : "border-warning/30 bg-warning/5",
                              )}
                            >
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  batch.exceptionSummary.highestSeverity === "CRITICAL" ? "text-destructive" : "text-warning",
                                )}
                              >
                                {batch.exceptionSummary.exceptionCount} Open Exception
                                {batch.exceptionSummary.exceptionCount > 1 ? "s" : ""}
                              </p>
                              {batch.exceptionSummary.unresolvedReasons.map((reason) => (
                                <p key={reason} className="mt-1 text-xs text-muted-foreground">{reason}</p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                  </CardContent>
                </Card>
              </aside>

            </div>
          </div>
        </main>
      </ContentArea>

      <PodUploadDialog open={podOpen} onOpenChange={setPodOpen} batch={batch} actor={actor} />
    </div>
  );
}
