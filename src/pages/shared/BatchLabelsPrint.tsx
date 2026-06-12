import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/components/layout/Sidebar";
import { useLabelState } from "@/lib/v2/labelStore";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { useActor } from "@/lib/v2/useActor";
import { generateBatchLabels, printBatchLabels, toApiError } from "@/lib/v2/workflows";

interface BatchLabelsPrintProps {
  userRole?: UserRole;
}

/**
 * P2-16 — Batch-scoped shipping labels print view
 * (`/:role/shipments/:id/labels`). Screen chrome uses the existing
 * `packaging-label-chrome` print-hidden class.
 */
export function BatchLabelsPrint({ userRole = "admin" }: BatchLabelsPrintProps) {
  const { id } = useParams<{ id: string }>();
  const rolePrefix = `/${userRole}`;
  const actor = useActor(userRole, "labels-print");
  const labelState = useLabelState();
  const batches = useShipmentBatches();

  const batch = batches.find((entry) => entry.id === id);
  const labels = useMemo(
    () => labelState.labels.filter((label) => label.shipmentBatchId === id && label.status !== "VOIDED"),
    [labelState, id],
  );

  const handleGenerate = () => {
    if (!batch) return;
    try {
      generateBatchLabels(batch.id, actor);
      toast.success("Labels generated.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const handlePrint = () => {
    if (!batch || labels.length === 0) return;
    try {
      printBatchLabels(batch.id, labels.map((label) => label.id), actor);
      window.print();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="packaging-label-chrome mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Button asChild variant="outline">
          <Link to={`${rolePrefix}/shipments/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to batch
          </Link>
        </Button>
        <div className="flex gap-2">
          {labels.length === 0 ? (
            <Button onClick={handleGenerate} disabled={!batch}>
              Generate Labels
            </Button>
          ) : (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print {labels.length} Label{labels.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </div>

      {!batch ? (
        <p className="px-8 text-sm text-muted-foreground">Shipment batch not found.</p>
      ) : labels.length === 0 ? (
        <p className="px-8 text-sm text-muted-foreground">No labels generated for this batch yet.</p>
      ) : (
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-6 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
          {labels.map((label) => (
            <div key={label.id} className="break-inside-avoid border-2 border-black bg-white p-4 text-black">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs font-bold">{label.labelNumber}</p>
                  <p className="text-xs">{label.projectName}</p>
                </div>
                <QRCodeSVG value={`va-trace://label/${label.labelNumber}?c=${label.qrPayload.checksum}`} size={56} />
              </div>
              <div className="mt-3 border-t border-black pt-2">
                <p className="text-sm font-bold uppercase">{label.destinationName}</p>
                <p className="text-xs">{label.destinationAddress || "Address on file"}</p>
              </div>
              <div className="mt-2 flex items-end justify-between border-t border-black pt-2">
                <div className="min-w-0">
                  <p className="truncate text-xs">{label.productName}</p>
                  <p className="font-mono text-xs text-neutral-600">{label.productCode}</p>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {label.quantity} <span className="text-xs font-normal">{label.unitOfMeasure}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
