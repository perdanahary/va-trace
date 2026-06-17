/**
 * DeliveryProgressBar — visual progress representation aligning with ProductionPipelineStepper.
 */

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
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
  const allocated = allocatedQuantity > 0 ? allocatedQuantity : 0;

  const shippedPercent = shippedQuantity !== undefined && allocated > 0 ? Math.min((shippedQuantity / allocated) * 100, 100) : 0;
  const receivedPercent = allocated > 0 ? Math.min((receivedQuantity / allocated) * 100, 100) : 0;

  const milestones = [
    { key: "allocated", label: "Allocated", percent: 0 },
    { key: "shipped", label: "Shipped", percent: shippedPercent },
    { key: "received", label: "Received", percent: receivedPercent },
  ];

  if (compact) {
    return (
      <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-processing/40" style={{ width: `${shippedPercent}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${receivedPercent}%` }} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      <div className="flex items-center justify-between w-full px-2">
        {milestones.map((milestone, index) => {
          const isActive = (index === 0) || (index === 1 && shippedPercent > 0) || (index === 2 && receivedPercent > 0);
          const isCompleted = (index === 0 && allocated > 0) || (index === 1 && shippedPercent >= 100) || (index === 2 && receivedPercent >= 100);

          return (
            <div key={milestone.key} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-success bg-success/10 text-success"
                    : isActive
                      ? "border-processing bg-processing/10 text-processing"
                      : "border-muted bg-muted/30 text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <span className={cn("text-xs font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>{milestone.label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-processing/40" style={{ width: `${shippedPercent}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${receivedPercent}%` }} />
        </div>
        <p className="text-xs font-medium text-muted-foreground tabular-nums">
          {receivedQuantity}/{allocatedQuantity} received
          {shippedQuantity !== undefined ? ` · ${shippedQuantity} shipped` : ""}
        </p>
      </div>
    </div>
  );
}
