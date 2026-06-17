import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { HydratedOrder } from "@/lib/v2/projections";
import { createBatchFromAllocations, toApiError, type Actor } from "@/lib/v2/workflows";
import { getUnreservedReadyQuantity } from "@/lib/v2/productionStore";

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

  const draftFor = (allocationId: string, outstanding: number, readyQty: number): LineDraft =>
    drafts[allocationId] ?? {
      selected: readyQty > 0 && (preselectedAllocationIds?.includes(allocationId) ?? false),
      quantity: readyQty > 0 ? Math.min(outstanding, readyQty) : 0,
    };

  const selectedLines = eligible
    .map((allocation) => {
      const readyQty = getUnreservedReadyQuantity(allocation.orderItemId);
      return {
        allocation,
        draft: draftFor(allocation.id, allocation.outstandingQuantity, readyQty),
      };
    })
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
          <div className="space-y-3 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No eligible outstanding allocations exist on this order. This can happen when:
              </AlertDescription>
            </Alert>
            <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li className="list-disc">All items have already been fully shipped in previous batches</li>
              <li className="list-disc">No sales point allocations have been created yet</li>
              <li className="list-disc">All allocations have been cancelled</li>
            </ul>
          </div>
        ) : null}

        {order && eligible.length > 0 ? (
          <div className="space-y-3">
            {(() => {
              const unreadyCount = eligible.filter((a) => getUnreservedReadyQuantity(a.orderItemId) === 0).length;
              if (unreadyCount === 0) return null;
              return (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {unreadyCount} line{unreadyCount > 1 ? "s have" : " has"} no ready quantity yet. These items are still in production and cannot be batched until they reach "Ready for Distribution" status.
                  </AlertDescription>
                </Alert>
              );
            })()}
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
                const readyQty = getUnreservedReadyQuantity(allocation.orderItemId);
                const draft = draftFor(allocation.id, allocation.outstandingQuantity, readyQty);
                const isDisabled = readyQty === 0;
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
                      disabled={isDisabled}
                      aria-label={`Select allocation for ${allocation.salesPoint.name}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{allocation.salesPoint.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{allocation.salesPoint.wCode}</p>
                    </div>
                    <p className="truncate text-xs">{allocation.product.name}</p>
                    <span className="text-right tabular-nums">{allocation.outstandingQuantity}</span>
                    {isDisabled ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-right tabular-nums text-warning cursor-help underline decoration-dotted underline-offset-2">
                              {readyQty}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-balance">
                            Production in progress — items must reach "Ready for Distribution" before they can be batched.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-right tabular-nums">{readyQty}</span>
                    )}
                    <Input
                      type="number"
                      min={isDisabled ? 0 : 1}
                      max={Math.min(allocation.outstandingQuantity, readyQty)}
                      value={draft.quantity}
                      disabled={isDisabled}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [allocation.id]: {
                            selected: true,
                            quantity: Math.max(1, Math.min(Number(event.target.value) || 1, allocation.outstandingQuantity, readyQty)),
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
