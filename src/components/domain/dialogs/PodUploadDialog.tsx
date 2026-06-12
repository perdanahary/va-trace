import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type { ShipmentBatch } from "@/lib/types/v2/shipment";
import { submitBatchPod, toApiError, type Actor } from "@/lib/v2/workflows";

interface PodUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: ShipmentBatch | undefined;
  actor: Actor;
  onSubmitted?: () => void;
}

/**
 * P3-22 UI — Vendor POD upload: receiver details, received date, signed DN
 * evidence reference, and claimed received quantities per shipment item.
 */
export function PodUploadDialog({ open, onOpenChange, batch, actor, onSubmitted }: PodUploadDialogProps) {
  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salesPointId, setSalesPointId] = useState<string>("");
  const [claims, setClaims] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const destinations = batch?.destinationSnapshots ?? [];
  const effectiveSalesPointId = salesPointId || destinations[0]?.salesPointId || "";
  const items = useMemo(
    () => (batch ? batch.items.filter((item) => item.salesPoint.salesPointId === effectiveSalesPointId) : []),
    [batch, effectiveSalesPointId],
  );

  const handleSubmit = () => {
    if (!batch || items.length === 0) return;
    setSubmitting(true);
    try {
      submitBatchPod(
        {
          shipmentBatchId: batch.id,
          salesPointId: effectiveSalesPointId,
          receiverName,
          receiverRole: receiverRole || undefined,
          receivedDate,
          evidence: [
            {
              fileName: `${batch.deliveryNoteNumber ?? batch.batchNumber}-signed.pdf`,
              mimeType: "application/pdf",
              sizeBytes: 1024,
              storageKey: `pod/${batch.id}/${Date.now()}-signed.pdf`,
            },
          ],
          itemConfirmations: items.map((item) => ({
            shipmentBatchItemId: item.id,
            claimedReceivedQuantity: claims[item.id] ?? item.shippedQuantity,
            condition: (claims[item.id] ?? item.shippedQuantity) < item.shippedQuantity ? "PARTIALLY_DAMAGED" : "GOOD",
          })),
        },
        actor,
      );
      toast.success("POD submitted for verification.");
      setClaims({});
      setReceiverName("");
      onOpenChange(false);
      onSubmitted?.();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Proof of Delivery</DialogTitle>
          <DialogDescription>
            {batch
              ? `Batch ${batch.batchNumber}. A signed Delivery Note is attached as evidence; enter received quantities per line.`
              : "No batch selected."}
          </DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="space-y-4">
            {destinations.length > 1 ? (
              <div className="space-y-1.5">
                <Label>Sales Point</Label>
                <Select value={effectiveSalesPointId} onValueChange={setSalesPointId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((destination) => (
                      <SelectItem key={destination.salesPointId} value={destination.salesPointId}>
                        {destination.salesPointName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pod-receiver">Receiver name</Label>
                <Input id="pod-receiver" value={receiverName} onChange={(event) => setReceiverName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pod-receiver-role">Receiver role</Label>
                <Input
                  id="pod-receiver-role"
                  value={receiverRole}
                  onChange={(event) => setReceiverRole(event.target.value)}
                  placeholder="ARA / SPV DPC"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pod-received-date">Received date</Label>
              <Input
                id="pod-received-date"
                type="date"
                value={receivedDate}
                onChange={(event) => setReceivedDate(event.target.value)}
              />
            </div>

            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_5rem_6rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Product</span>
                <span className="text-right">Shipped</span>
                <span className="text-right">Received</span>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_5rem_6rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
                >
                  <p className="truncate">{item.product.name}</p>
                  <span className="text-right tabular-nums">{item.shippedQuantity}</span>
                  <Input
                    type="number"
                    min={0}
                    value={claims[item.id] ?? item.shippedQuantity}
                    onChange={(event) =>
                      setClaims((current) => ({
                        ...current,
                        [item.id]: Math.max(0, Number(event.target.value) || 0),
                      }))
                    }
                    className="h-8 text-right"
                    aria-label={`Received quantity for ${item.product.name}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!batch || !receiverName || items.length === 0 || submitting}>
            Submit POD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
