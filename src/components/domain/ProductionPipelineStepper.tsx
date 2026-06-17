import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductionStatus } from "@/lib/types/v2/status";

const STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Done" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const PRODUCTION_STEP_MAP: Record<string, StepKey> = {
  NEW: "SUBMITTED",
  SUBMITTED: "SUBMITTED",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

function resolveActiveStep(productionStatus: ProductionStatus): number {
  const stepKey = PRODUCTION_STEP_MAP[productionStatus] ?? "SUBMITTED";
  return STEPS.findIndex((step) => step.key === stepKey);
}

interface ProductionPipelineStepperProps {
  productionStatus: ProductionStatus;
  jobStatuses?: ProductionStatus[];
  className?: string;
}

function buildStepJobCounts(jobStatuses: ProductionStatus[]): Record<StepKey, number> {
  const counts: Record<string, number> = {};
  for (const status of jobStatuses) {
    const stepKey = PRODUCTION_STEP_MAP[status] ?? "SUBMITTED";
    counts[stepKey] = (counts[stepKey] ?? 0) + 1;
  }
  return counts as Record<StepKey, number>;
}

export function ProductionPipelineStepper({
  productionStatus,
  jobStatuses,
  className,
}: ProductionPipelineStepperProps) {
  const activeIndex = resolveActiveStep(productionStatus);
  const stepCounts = jobStatuses ? buildStepJobCounts(jobStatuses) : undefined;
  const hasMultipleJobs = jobStatuses && jobStatuses.length > 1;
  const isSplit = hasMultipleJobs && Object.keys(stepCounts!).length > 1;

  return (
    <div className={cn("flex items-start gap-0", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        const isFuture = index > activeIndex;
        const count = stepCounts?.[step.key] ?? 0;

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
              {isSplit && count > 0 ? (
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    isActive ? "text-processing" : isCompleted ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {count} {count === 1 ? "job" : "jobs"}
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
