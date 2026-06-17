import { Fragment } from "react";
import { Factory, Package, Truck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DeliveryLifecycleTimelineProps {
  readyQuantity: number;
  orderedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  allocatedQuantity: number;
  batchStatus?: string;
}

function StatisticCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm bg-card">
      <CardHeader className="space-y-0 pb-1.5 pt-4 px-4">
        <CardDescription className="text-xs text-muted-foreground">{label}</CardDescription>
        <CardTitle className={cn("text-2xl font-bold tracking-tight", color ?? "text-foreground")}>
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pb-4 px-4 pt-0">
          <p className="text-[10px] text-muted-foreground font-mono leading-none">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function DeliveryLifecycleTimeline({
  readyQuantity,
  orderedQuantity,
  shippedQuantity,
  receivedQuantity,
  allocatedQuantity,
  batchStatus,
}: DeliveryLifecycleTimelineProps) {
  const isProdCompleted = readyQuantity >= orderedQuantity && orderedQuantity > 0;
  const isProdActive = readyQuantity > 0;

  const isBatchCompleted = shippedQuantity >= allocatedQuantity && allocatedQuantity > 0;
  const isBatchActive = shippedQuantity > 0 || allocatedQuantity > 0;

  const isTransitCompleted = ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batchStatus ?? "");
  const isTransitActive = isTransitCompleted || batchStatus === "READY";

  const isPodCompleted = receivedQuantity >= allocatedQuantity && allocatedQuantity > 0;
  const isPodActive = receivedQuantity > 0;

  const steps = [
    {
      label: "Production",
      icon: Factory,
      status: isProdCompleted ? "success" : isProdActive ? "processing" : "pending",
      valueText: `${readyQuantity} / ${orderedQuantity} pcs ready`,
    },
    {
      label: "Shipment Batching",
      icon: Package,
      status: isBatchCompleted ? "success" : isBatchActive ? "processing" : "pending",
      valueText: `${shippedQuantity} / ${allocatedQuantity} pcs batched`,
    },
    {
      label: "Dispatch & Transit",
      icon: Truck,
      status: isTransitCompleted ? "success" : isTransitActive ? "processing" : "pending",
      valueText: isTransitCompleted
        ? "In Transit / Dispatched"
        : batchStatus === "READY"
        ? "Ready to Ship"
        : "Not Dispatched",
    },
    {
      label: "Delivery Receipt (POD)",
      icon: CheckCircle2,
      status: isPodCompleted ? "success" : isPodActive ? "processing" : "pending",
      valueText: `${receivedQuantity} / ${allocatedQuantity} pcs verified`,
    },
  ];

  return (
    <div className="w-full space-y-8 py-2">
      {/* Horizontal timeline track with edge padding to prevent edge label overflow */}
      <div className="relative flex items-center justify-between px-14 sm:px-20">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const statusBorderColor = 
            step.status === "success" 
              ? "border-success" 
              : step.status === "processing" 
              ? "border-processing" 
              : "border-muted";

          const statusBgColor = 
            step.status === "success" 
              ? "bg-success/10 text-success" 
              : step.status === "processing" 
              ? "bg-processing/10 text-processing" 
              : "bg-muted/10 text-muted-foreground";

          const isPending = step.status === "pending";
          const labelColor = isPending ? "text-muted-foreground" : "text-foreground";

          return (
            <Fragment key={index}>
              {/* Step Node */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background font-semibold transition-all duration-300", 
                  statusBorderColor
                )}>
                  <div className={cn(
                    "flex h-full w-full items-center justify-center rounded-full transition-all duration-300",
                    statusBgColor
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="absolute top-12 w-28 text-center flex flex-col items-center">
                  <p className={cn("text-xs font-semibold leading-tight", labelColor)}>{step.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono leading-none">{step.valueText}</p>
                </div>
              </div>

              {/* Connecting Line Segment with spacing */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-border min-w-4 sm:mx-6">
                  <div 
                    className="h-full bg-success transition-all duration-500" 
                    style={{ 
                      width: 
                        index === 0 && (isProdCompleted || isBatchCompleted || isTransitCompleted)
                          ? "100%" 
                          : index === 1 && (isBatchCompleted || isTransitCompleted)
                          ? "100%" 
                          : index === 2 && isTransitCompleted 
                          ? "100%" 
                          : "0%" 
                    }} 
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Extra spacing for the absolutely positioned labels */}
      <div className="h-6" />

      {/* Metrics Summary Grid using standard StatisticCard components */}
      <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
        <StatisticCard
          label="Production Progress"
          value={`${orderedQuantity > 0 ? Math.round((readyQuantity / orderedQuantity) * 100) : 0}%`}
          hint={`${readyQuantity} of ${orderedQuantity} pcs ready`}
          color={isProdCompleted ? "text-success" : isProdActive ? "text-processing" : "text-muted-foreground"}
        />
        <StatisticCard
          label="Allocated to Batches"
          value={`${allocatedQuantity > 0 ? Math.round((shippedQuantity / allocatedQuantity) * 100) : 0}%`}
          hint={`${shippedQuantity} of ${allocatedQuantity} pcs batched`}
          color={isBatchCompleted ? "text-success" : isBatchActive ? "text-processing" : "text-muted-foreground"}
        />
        <StatisticCard
          label="Transit Status"
          value={isTransitCompleted ? "In Transit" : batchStatus === "READY" ? "Ready" : "Draft"}
          hint={`Active: ${batchStatus ?? "None"}`}
          color={isTransitCompleted ? "text-success" : isTransitActive ? "text-processing" : "text-muted-foreground"}
        />
        <StatisticCard
          label="Receipt Progress (POD)"
          value={`${allocatedQuantity > 0 ? Math.round((receivedQuantity / allocatedQuantity) * 100) : 0}%`}
          hint={`${receivedQuantity} of ${allocatedQuantity} pcs received`}
          color={isPodCompleted ? "text-success" : isPodActive ? "text-processing" : "text-muted-foreground"}
        />
      </div>
    </div>
  );
}
