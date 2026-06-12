import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/components/layout/Sidebar";
import { useDeliveryNotes } from "@/lib/v2/deliveryNoteStore";
import { useActor } from "@/lib/v2/useActor";
import { printDeliveryNote, toApiError } from "@/lib/v2/workflows";

interface BatchDeliveryNotePrintProps {
  userRole?: UserRole;
}

/**
 * P2-16 — Batch-scoped Delivery Note print view
 * (`/:role/shipments/:id/delivery-note`). A4 portrait; screen chrome carries
 * the `delivery-note-chrome` class hidden by the existing print CSS.
 */
export function BatchDeliveryNotePrint({ userRole = "admin" }: BatchDeliveryNotePrintProps) {
  const { id } = useParams<{ id: string }>();
  const rolePrefix = `/${userRole}`;
  const actor = useActor(userRole, "delivery-note-print");
  const notes = useDeliveryNotes();

  const note = useMemo(
    () => notes.find((entry) => entry.shipmentBatchId === id && entry.isActive) ?? notes.find((entry) => entry.id === id),
    [notes, id],
  );

  const handlePrint = () => {
    if (!note) return;
    try {
      printDeliveryNote(note.id, actor);
      window.print();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  if (!note) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-muted-foreground">No active Delivery Note exists for this shipment batch.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to={`${rolePrefix}/shipments/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to batch
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="delivery-note-chrome mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Button asChild variant="outline">
          <Link to={`${rolePrefix}/shipments/${note.shipmentBatchId}`}>
            <ArrowLeft className="h-4 w-4" /> Back to batch
          </Link>
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Print Delivery Note
        </Button>
      </div>

      <div className="mx-auto max-w-3xl border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">Delivery Note</h1>
            <p className="mt-1 font-mono text-sm">{note.deliveryNoteNumber}</p>
            <p className="font-mono text-xs text-neutral-600">Batch {note.batchNumber} · v{note.documentVersion}</p>
          </div>
          <QRCodeSVG value={`va-trace://delivery-note/${note.deliveryNoteNumber}?c=${note.qrPayload.checksum}`} size={72} />
        </header>

        <section className="mt-4 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Sender</p>
            <p className="font-medium">{note.senderSnapshot.name}</p>
            {note.senderSnapshot.address ? <p className="text-xs">{note.senderSnapshot.address}</p> : null}
            <p className="mt-2 text-xs">
              PO: <span className="font-mono">{note.clientPoNumber ?? "—"}</span>
              {note.salesOrderNumber ? (
                <>
                  {" · "}SO: <span className="font-mono">{note.salesOrderNumber}</span>
                </>
              ) : null}
            </p>
            <p className="text-xs">Project: {note.projectName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Deliver to ({note.destinationSnapshots.length} destination{note.destinationSnapshots.length === 1 ? "" : "s"})
            </p>
            {note.destinationSnapshots.map((destination) => (
              <div key={destination.salesPointId} className="mt-1">
                <p className="font-medium">
                  {destination.salesPointName} <span className="font-mono text-xs">({destination.wCode})</span>
                </p>
                <p className="text-xs">{destination.address || "Address on file"}</p>
                {destination.contacts[0] ? (
                  <p className="text-xs">
                    PIC: {destination.contacts[0].name}
                    {destination.contacts[0].phone ? ` · ${destination.contacts[0].phone}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-black text-left text-xs uppercase tracking-wider">
              <th className="py-2 pr-2">Line</th>
              <th className="py-2 pr-2">Sales Point</th>
              <th className="py-2 pr-2">Material</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2 text-right">Allocated</th>
              <th className="py-2 pr-2 text-right">Shipped</th>
              <th className="py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {note.items.map((line) => (
              <tr key={line.id} className="border-b border-neutral-300">
                <td className="py-2 pr-2 font-mono text-xs">{line.poLineNumber}</td>
                <td className="py-2 pr-2 font-mono text-xs">{line.salesPointCode}</td>
                <td className="py-2 pr-2 font-mono text-xs">{line.materialCode}</td>
                <td className="py-2 pr-2 text-xs">{line.description}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.allocatedQuantity}</td>
                <td className="py-2 pr-2 text-right font-medium tabular-nums">{line.shippedQuantity}</td>
                <td className="py-2 text-right tabular-nums">{line.outstandingQuantityAfterShipment}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-medium">
              <td colSpan={5} className="py-2 pr-2 text-right text-xs uppercase tracking-wider">
                Total shipped
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{note.quantitySummary.shippedQuantity}</td>
              <td className="py-2 text-right tabular-nums">{note.quantitySummary.outstandingQuantityAfterShipment}</td>
            </tr>
          </tfoot>
        </table>

        {note.notes ? <p className="mt-4 text-xs font-medium">{note.notes}</p> : null}

        <section className="mt-10 grid grid-cols-2 gap-12 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Delivered by</p>
            <div className="mt-12 border-t border-black pt-1 text-xs">Name / Date / Signature</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Received by</p>
            <div className="mt-12 border-t border-black pt-1 text-xs">Name / Date / Signature / Stamp</div>
          </div>
        </section>
      </div>
    </div>
  );
}
