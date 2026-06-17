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

  // Calculate milestone percentages
  const shippedPercent = shippedQuantity !== undefined && allocated > 0 ? Math.min((shippedQuantity / allocated) * 100, 100) : 0;
  const receivedPercent = allocated > 0 ? Math.min((receivedQuantity / allocated) * 100, 100) : 0;

  const milestones = [
    { key: "allocated", label: "Allocated", percent: 0 },
    { key: "shipped", label: "Shipped", percent: shippedPercent },
    { key: "received", label: "Received", percent: receivedPercent },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted">
           <div className="absolute inset-y-0 left-0 rounded-full bg-processing/40" style={{ width: `${shippedPercent}%` }} />
           <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${receivedPercent}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{Math.round(receivedPercent)}%</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex justify-between items-center w-full">
        {milestones.map((milestone, index) => {
          const isActive = index === 2 || (index === 1 && shippedPercent >= 0); // Simplified logic
          const isCompleted = milestone.percent >= 100;

          return (
            <div key={milestone.key} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  milestone.percent > 0 ? "border-success bg-success/10 text-success" : "border-muted bg-muted/30 text-muted-foreground",
                )}
              >
                {milestone.percent >= 100 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs font-medium text-foreground">{milestone.label}</span>
            </div>
          );
        })}
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-processing/40" style={{ width: `${shippedPercent}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${receivedPercent}%` }} />
      </div>

      <p className="text-xs tabular-nums text-muted-foreground">
        {receivedQuantity}/{allocatedQuantity} received
        {shippedQuantity !== undefined ? ` · ${shippedQuantity} shipped` : ""}
      </p>
    </div>
  );
}
