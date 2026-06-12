/**
 * DeliveryProgressBar — received over allocated quantity (spec 01 §11).
 * Uses documented status tokens only.
 */

import { cn } from "@/lib/utils";

interface DeliveryProgressBarProps {
  receivedQuantity: number;
  allocatedQuantity: number;
  shippedQuantity?: number;
  className?: string;
  compact?: boolean;
}

export function DeliveryProgressBar({
  receivedQuantity,
  allocatedQuantity,
  shippedQuantity,
  className,
  compact = false,
}: DeliveryProgressBarProps) {
  const receivedPercent = allocatedQuantity > 0 ? Math.min((receivedQuantity / allocatedQuantity) * 100, 100) : 0;
  const shippedPercent =
    allocatedQuantity > 0 && shippedQuantity !== undefined
      ? Math.min((shippedQuantity / allocatedQuantity) * 100, 100)
      : undefined;

  return (
    <div className={cn("min-w-28", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(receivedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Delivery progress"
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        {shippedPercent !== undefined ? (
          <div className="absolute inset-y-0 left-0 rounded-full bg-processing/40" style={{ width: `${shippedPercent}%` }} />
        ) : null}
        <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${receivedPercent}%` }} />
      </div>
      {!compact ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {receivedQuantity}/{allocatedQuantity} received
          {shippedQuantity !== undefined ? ` · ${shippedQuantity} shipped` : ""}
        </p>
      ) : null}
    </div>
  );
}
