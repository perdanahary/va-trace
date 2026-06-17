import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "ALLOCATED", label: "Allocated" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "RECEIVED", label: "Received" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface DeliveryProgressStepperProps {
  receivedQuantity: number;
  allocatedQuantity: number;
  shippedQuantity?: number;
  className?: string;
}

function resolveActiveStep(
  receivedQuantity: number,
  allocatedQuantity: number,
  shippedQuantity: number | undefined,
): number {
  if (allocatedQuantity === 0) return 0;
  if (receivedQuantity >= allocatedQuantity) return 2;
  if (shippedQuantity !== undefined && shippedQuantity > 0) return 1;
  if (allocatedQuantity > 0) return 0;
  return 0;
}

export function DeliveryProgressStepper({
  receivedQuantity,
  allocatedQuantity,
  shippedQuantity,
  className,
}: DeliveryProgressStepperProps) {
  const activeIndex = resolveActiveStep(receivedQuantity, allocatedQuantity, shippedQuantity);

  const quantities = [
    { key: "ALLOCATED", value: allocatedQuantity },
    { key: "SHIPPED", value: shippedQuantity ?? 0 },
    { key: "RECEIVED", value: receivedQuantity },
  ];

  return (
    <div className={cn("flex items-start gap-0", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        const isFuture = index > activeIndex;
        const qty = quantities.find((q) => q.key === step.key)?.value ?? 0;

        return (
          <div key={step.key} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-colors",
                  isCompleted && "border-success bg-success/10 text-success",
                  isActive && "border-processing bg-processing/10 text-processing",
                  isFuture && "border-muted bg-muted/10 text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  (isCompleted || isActive) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {allocatedQuantity > 0 ? (
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    isActive ? "text-processing" : isCompleted ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {qty} pcs
                </span>
              ) : null}
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-1 mt-[19px] h-0.5 w-8 sm:w-12",
                  index < activeIndex ? "bg-success" : "bg-muted",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
