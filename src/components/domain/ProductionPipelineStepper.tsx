import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductionStatus } from "@/lib/types/v2/status";

const STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "IN_PRODUCTION", label: "In Production" },
  { key: "READY", label: "Ready to Ship" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const PRODUCTION_STEP_MAP: Record<string, StepKey> = {
  NEW: "SUBMITTED",
  SUBMITTED: "SUBMITTED",
  ACCEPTED: "ACCEPTED",
  PRINTING: "IN_PRODUCTION",
  FINISHING: "IN_PRODUCTION",
  QUALITY_CONTROL: "IN_PRODUCTION",
  READY_FOR_DISTRIBUTION: "READY",
  COMPLETED: "READY",
};

function resolveActiveStep(productionStatus: ProductionStatus): number {
  const stepKey = PRODUCTION_STEP_MAP[productionStatus] ?? "SUBMITTED";
  return STEPS.findIndex((step) => step.key === stepKey);
}

interface ProductionPipelineStepperProps {
  productionStatus: ProductionStatus;
  className?: string;
}

export function ProductionPipelineStepper({
  productionStatus,
  className,
}: ProductionPipelineStepperProps) {
  const activeIndex = resolveActiveStep(productionStatus);

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        const isFuture = index > activeIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-success bg-success/10 text-success",
                  isActive && "border-processing bg-processing/10 text-processing",
                  isFuture && "border-muted bg-muted/30 text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4" />
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
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-1 h-0.5 w-8 sm:w-12",
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
