import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PodStatusBadge, ShipmentBatchStatusBadge } from "@/components/domain/badges/badges";
import { PodQueueTable } from "@/components/domain/tables/PodQueueTable";
import { PodUploadDialog } from "@/components/domain/dialogs/PodUploadDialog";
import { hydrateShipmentBatch } from "@/lib/v2/projections";
import { useOperationalExceptions } from "@/lib/v2/exceptionStore";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { usePodQueueRows } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";

/**
 * P2-19 — Vendor POD upload and correction queue (`/vendor/pod`).
 * Lists dispatched batches awaiting POD and submissions returned for correction.
 */
export function VendorPodUpload() {
  const actor = useActor("vendor", "vendor-pod-upload");
  const batches = useShipmentBatches();
  const confirmations = useDeliveryConfirmations();
  const exceptions = useOperationalExceptions();
  const podRows = usePodQueueRows();

  const [uploadBatchId, setUploadBatchId] = useState<string | null>(null);

  const backlog = useMemo(
    () =>
      batches
        .filter((batch) => ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(batch.status))
        .map((batch) => hydrateShipmentBatch(batch, confirmations, exceptions))
        .filter((batch) => {
          const batchConfirmations = confirmations.filter((entry) => entry.shipmentBatchId === batch.id);
          return (
            batchConfirmations.length === 0 ||
            batchConfirmations.some((entry) => ["REJECTED", "CORRECTION_REQUESTED"].includes(entry.status))
          );
        }),
    [batches, confirmations, exceptions],
  );

  const correctionRows = useMemo(
    () => podRows.filter((row) => ["REJECTED", "CORRECTION_REQUESTED"].includes(row.status)),
    [podRows],
  );
  const submittedRows = useMemo(
    () => podRows.filter((row) => ["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(row.status)),
    [podRows],
  );

  const uploadBatch = batches.find((batch) => batch.id === uploadBatchId);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="vendor" />
      <ContentArea>
        <Header title="POD Uploads" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Awaiting POD ({backlog.length})</CardTitle>
              <CardDescription>Dispatched batches without a verified Proof of Delivery.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {backlog.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">No batches awaiting POD upload.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Dispatched</TableHead>
                        <TableHead className="text-right">Shipped</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>POD</TableHead>
                        <TableHead className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backlog.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Link to={`/vendor/shipments/${batch.id}`} className="font-mono text-xs text-link hover:underline">
                              {batch.batchNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{batch.orderRequestNumber}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {batch.dispatchedAt ? batch.dispatchedAt.slice(0, 10) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {batch.quantitySummary.shippedQuantity}
                          </TableCell>
                          <TableCell>
                            <ShipmentBatchStatusBadge status={batch.status} />
                          </TableCell>
                          <TableCell>
                            <PodStatusBadge status={batch.podStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => setUploadBatchId(batch.id)}>
                              Upload POD
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Correction Queue ({correctionRows.length})</CardTitle>
              <CardDescription>Submissions rejected or returned by Admin for correction.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PodQueueTable
                rows={correctionRows}
                emptyMessage="No POD submissions need correction."
                onOpen={(confirmationId) => {
                  const confirmation = confirmations.find((entry) => entry.id === confirmationId);
                  if (confirmation) setUploadBatchId(confirmation.shipmentBatchId);
                }}
                openLabel="Resubmit"
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Awaiting Admin Verification ({submittedRows.length})</CardTitle>
              <CardDescription>Submitted evidence pending Admin review.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PodQueueTable rows={submittedRows} emptyMessage="Nothing pending verification." />
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      <PodUploadDialog
        open={Boolean(uploadBatch)}
        onOpenChange={(open) => !open && setUploadBatchId(null)}
        batch={uploadBatch}
        actor={actor}
      />
    </div>
  );
}
