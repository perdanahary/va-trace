import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderRequestStatus } from "@/lib/orderStatus";

export type OrderStatus =
  | "New"
  | "In Production"
  | "Ready to Ship"
  | "On Delivery"
  | "Delivered"
  | "Completed"
  | "Overdue"
  | "Urgent"
  | "Waiting";

export type SupplierStatusLabel = "Active" | "Inactive";
export type StatusBadgeValue = OrderStatus | OrderRequestStatus | SupplierStatusLabel;

interface StatusBadgeProps {
  status: StatusBadgeValue;
  labelMap?: Record<string, string>;
  className?: string;
}

const statusVariants: Partial<Record<StatusBadgeValue, "success" | "processing" | "warning" | "destructive" | "secondary">> = {
  New: "secondary",
  "In Production": "processing",
  "Ready to Ship": "processing",
  "On Delivery": "processing",
  Delivered: "success",
  Completed: "success",
  Overdue: "destructive",
  Urgent: "destructive",
  Waiting: "warning",
  Active: "success",
  Inactive: "secondary",
};

export function StatusBadge({ status, labelMap, className }: StatusBadgeProps) {
  const displayStatus = (labelMap?.[status] ?? status) as StatusBadgeValue;

  if (status.startsWith("Partial ")) {
    const baseStatus = status.replace("Partial ", "") as OrderStatus;

    return (
      <span className={className}>
        <Badge variant="warning" className="mr-1 rounded-full uppercase tracking-[0.18em]">
          Partial
        </Badge>
        <Badge variant={statusVariants[baseStatus]} className="rounded-full uppercase tracking-[0.18em]">
          {baseStatus}
        </Badge>
      </span>
    );
  }

  const variant = statusVariants[status] ?? "secondary";
  const textTransformClass = displayStatus === "Active" || displayStatus === "Inactive" ? "normal-case" : "uppercase";

  return (
    <Badge variant={variant} className={cn("rounded-full tracking-[0.18em]", textTransformClass, className)}>
      {displayStatus}
    </Badge>
  );
}
