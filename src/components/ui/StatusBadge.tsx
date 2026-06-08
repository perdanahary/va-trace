import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderRequestStatus } from "@/lib/orderStatus";

export type OrderStatus =
  | "Created"
  | "Accepted"
  | "In Production"
  | "Ready to Ship"
  | "On Delivery"
  | "Delivered"
  | "Completed"
  | "Overdue"
  | "Urgent"
  | "Waiting";

interface StatusBadgeProps {
  status: OrderStatus | OrderRequestStatus;
  className?: string;
}

const statusVariants: Record<OrderStatus, "success" | "processing" | "warning" | "destructive" | "secondary"> = {
  Created: "secondary",
  Accepted: "success",
  "In Production": "processing",
  "Ready to Ship": "processing",
  "On Delivery": "processing",
  Delivered: "success",
  Completed: "success",
  Overdue: "destructive",
  Urgent: "destructive",
  Waiting: "warning",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
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

  const variant = statusVariants[status as OrderStatus] ?? "secondary";

  return (
    <Badge variant={variant} className={cn("rounded-full uppercase tracking-[0.18em]", className)}>
      {status}
    </Badge>
  );
}
