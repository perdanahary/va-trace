import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Printer, Tags, Truck } from "lucide-react";
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

interface ShipmentBatchDetailProps {
  userRole?: UserRole;
}

/** P2-14 — Shipment Batch detail with Items / Delivery Note / Labels / POD / Audit tabs. */
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
                <ArrowLeft className="h-4 w-4" /> Back to Shipment Batches
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={batch.batchNumber} />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold">{batch.batchNumber}</span>
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
              <DeliveryProgressBar
                receivedQuantity={batch.quantitySummary.verifiedReceivedQuantity}
                allocatedQuantity={batch.quantitySummary.shippedQuantity}
                className="max-w-xs pt-1"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!batchNote && isVendorLike ? (
                <Button
                  variant="outline"
                  onClick={() => run(() => generateBatchDeliveryNote(batch.id, actor))}
                >
                  <FileText className="h-4 w-4" /> Generate DN
                </Button>
              ) : null}
              {batchNote ? (
                <Button asChild variant="outline">
                  <Link to={`${rolePrefix}/shipments/${batch.id}/delivery-note`}>
                    <Printer className="h-4 w-4" /> Print DN
                  </Link>
                </Button>
              ) : null}
              {batchLabels.length === 0 && isVendorLike ? (
                <Button variant="outline" onClick={() => run(() => generateBatchLabels(batch.id, actor))}>
                  <Tags className="h-4 w-4" /> Generate Labels
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to={`${rolePrefix}/shipments/${batch.id}/labels`}>
                    <Tags className="h-4 w-4" /> Labels
                  </Link>
                </Button>
              )}
              {canDispatch ? (
                <Button
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
              {canUploadPod ? <Button onClick={() => setPodOpen(true)}>Upload Proof of Delivery (POD)</Button> : null}
              {canClose ? (
                <Button
                  variant="outline"
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
            </div>
          </section>

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
        </main>
      </ContentArea>

      <PodUploadDialog open={podOpen} onOpenChange={setPodOpen} batch={batch} actor={actor} />
    </div>
  );
}
