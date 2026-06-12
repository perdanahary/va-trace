import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { HydratedOrder } from "@/lib/v2/projections";
import { createBatchFromAllocations, toApiError, type Actor } from "@/lib/v2/workflows";

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: HydratedOrder | undefined;
  actor: Actor;
  preselectedAllocationIds?: string[];
  onCreated?: (batchId: string) => void;
}

interface LineDraft {
  selected: boolean;
  quantity: number;
}

/**
 * P3-17 — Batch creation dialog: select outstanding allocations, set batch
 * quantities (default = outstanding), optionally generate DN, then create.
 */
export function CreateBatchDialog({
  open,
  onOpenChange,
  order,
  actor,
  preselectedAllocationIds,
  onCreated,
}: CreateBatchDialogProps) {
  const eligible = useMemo(
    () =>
      order?.allocations.filter(
        (allocation) => allocation.outstandingQuantity > 0 && allocation.status !== "CANCELLED",
      ) ?? [],
    [order],
  );

  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [generateDn, setGenerateDn] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const draftFor = (allocationId: string, outstanding: number): LineDraft =>
    drafts[allocationId] ?? {
      selected: preselectedAllocationIds?.includes(allocationId) ?? false,
      quantity: outstanding,
    };

  const selectedLines = eligible
    .map((allocation) => ({ allocation, draft: draftFor(allocation.id, allocation.outstandingQuantity) }))
    .filter((entry) => entry.draft.selected);

  const handleCreate = () => {
    if (!order || selectedLines.length === 0) return;
    setSubmitting(true);
    try {
      const batch = createBatchFromAllocations(
        {
          orderRequestId: order.order.id,
          lines: selectedLines.map((entry) => ({
            allocationId: entry.allocation.id,
            quantity: entry.draft.quantity,
          })),
          generateDeliveryNote: generateDn,
          generateLabels: generateDn,
          markReady: true,
        },
        actor,
      );
      toast.success(`Shipment batch ${batch.batchNumber} created.`);
      setDrafts({});
      onOpenChange(false);
      onCreated?.(batch.id);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Shipment Batch</DialogTitle>
          <DialogDescription>
            {order
              ? `Select outstanding allocations from ${order.order.orderRequestNumber}. Quantities default to the outstanding allocation.`
              : "No order selected."}
          </DialogDescription>
        </DialogHeader>

        {order && eligible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No eligible outstanding allocations exist on this order.
          </p>
        ) : null}

        {order && eligible.length > 0 ? (
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_6rem_6rem_7rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Sales Point</span>
              <span>Product</span>
              <span className="text-right">Outstanding</span>
              <span className="text-right">Ready</span>
              <span className="text-right">Batch Qty</span>
            </div>
            {eligible.map((allocation) => {
              const draft = draftFor(allocation.id, allocation.outstandingQuantity);
              return (
                <div
                  key={allocation.id}
                  className="grid grid-cols-[2.5rem_1fr_1fr_6rem_6rem_7rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
                >
                  <Checkbox
                    checked={draft.selected}
                    onCheckedChange={(checked) =>
                      setDrafts((current) => ({
                        ...current,
                        [allocation.id]: { ...draft, selected: checked === true },
                      }))
                    }
                    aria-label={`Select allocation for ${allocation.salesPoint.name}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{allocation.salesPoint.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{allocation.salesPoint.wCode}</p>
                  </div>
                  <p className="truncate text-xs">{allocation.product.name}</p>
                  <span className="text-right tabular-nums">{allocation.outstandingQuantity}</span>
                  <span className="text-right tabular-nums text-muted-foreground">—</span>
                  <Input
                    type="number"
                    min={1}
                    max={allocation.outstandingQuantity}
                    value={draft.quantity}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [allocation.id]: {
                          selected: true,
                          quantity: Math.max(1, Math.min(Number(event.target.value) || 1, allocation.outstandingQuantity)),
                        },
                      }))
                    }
                    className="h-8 text-right"
                    aria-label={`Batch quantity for ${allocation.salesPoint.name}`}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Checkbox
            id="generate-dn"
            checked={generateDn}
            onCheckedChange={(checked) => setGenerateDn(checked === true)}
          />
          <Label htmlFor="generate-dn" className="text-sm font-normal">
            Generate Delivery Note and labels for this batch
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!order || selectedLines.length === 0 || submitting}>
            Create batch ({selectedLines.length} line{selectedLines.length === 1 ? "" : "s"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
