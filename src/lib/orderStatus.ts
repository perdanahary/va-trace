import type { OrderStatus } from "@/components/ui/StatusBadge";

export type OrderRequestStatus = OrderStatus | `Partial ${OrderStatus}`;

const statusRank: OrderStatus[] = [
  "New",
  "In Production",
  "Ready to Ship",
  "On Delivery",
  "Delivered",
  "Completed",
  "Overdue",
  "Urgent",
  "Waiting",
];

export interface OrderItemProgress {
  id: string;
  name: string;
  quantity: number;
  status: OrderStatus;
}

export function getBaseOrderStatus(status: OrderRequestStatus): OrderStatus {
  return status.startsWith("Partial ")
    ? (status.replace("Partial ", "") as OrderStatus)
    : (status as OrderStatus);
}

export function getOrderRequestStatus(items: Array<Pick<OrderItemProgress, "status">>): OrderRequestStatus {
  if (items.length === 0) {
    return "New";
  }

  const uniqueStatuses = [...new Set(items.map((item) => item.status))];

  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0];
  }

  const highestStatus = uniqueStatuses
    .slice()
    .sort((left, right) => statusRank.indexOf(left) - statusRank.indexOf(right))
    .at(-1) as OrderStatus;

  return `Partial ${highestStatus}`;
}
