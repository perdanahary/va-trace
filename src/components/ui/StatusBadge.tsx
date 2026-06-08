import { cn } from "@/lib/utils";
import type { OrderRequestStatus } from "@/lib/orderStatus";

export type OrderStatus = 
  | 'Created' 
  | 'Accepted' 
  | 'In Production' 
  | 'Ready to Ship' 
  | 'On Delivery' 
  | 'Delivered' 
  | 'Completed'
  | 'Overdue'
  | 'Urgent'
  | 'Waiting';

interface StatusBadgeProps {
  status: OrderStatus | OrderRequestStatus;
  className?: string;
}

const statusStyles: Record<OrderStatus, string> = {
  'Created': 'bg-slate-100 text-slate-700',
  'Accepted': 'bg-success/10 text-success',
  'In Production': 'bg-processing/10 text-processing',
  'Ready to Ship': 'bg-primary/10 text-primary',
  'On Delivery': 'bg-processing/10 text-processing',
  'Delivered': 'bg-success/10 text-success',
  'Completed': 'bg-success/10 text-success',
  'Overdue': 'bg-destructive/10 text-destructive font-bold',
  'Urgent': 'bg-destructive/10 text-destructive font-bold',
  'Waiting': 'bg-warning/10 text-warning',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status.startsWith("Partial ")) {
    const baseStatus = status.replace("Partial ", "") as OrderStatus;

    return (
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide",
          "bg-warning/10 text-warning",
          className
        )}>
          Partial
        </span>
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase",
          statusStyles[baseStatus],
          className
        )}>
          {baseStatus}
        </span>
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase whitespace-nowrap",
      statusStyles[status as OrderStatus],
      className
    )}>
      {status}
    </span>
  );
}
