import type { DeliveryProgress, ShipmentBatch } from "@/lib/types/logistics";
import type { Order, OrderItemProgress, SalesPointAllocation } from "@/lib/types/order";
import type {
  DistributionStatus,
  LegacyOrderRequestStatus,
  LegacyOrderStatus,
  ProductionStatus,
  ShipmentBatchStatus,
} from "@/lib/types/status";

export type OrderStatus = LegacyOrderStatus;
export type OrderRequestStatus = LegacyOrderRequestStatus;
export type {
  DeliveryProgress,
  DistributionStatus,
  OrderItemProgress,
  ProductionStatus,
  ShipmentBatchStatus,
};

const legacyStatusRank: LegacyOrderStatus[] = [
  "New",
  "In Production",
  "Ready to Ship",
  "On Delivery",
  "Delivered",
  "Completed",
  "Overdue",
  "Waiting",
];

const productionRank: ProductionStatus[] = [
  "NEW",
  "SUBMITTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function getBaseOrderStatus(status: LegacyOrderRequestStatus): LegacyOrderStatus {
  return status.startsWith("Partial ")
    ? (status.replace("Partial ", "") as LegacyOrderStatus)
    : (status as LegacyOrderStatus);
}

export function getOrderRequestStatus(items: Array<Pick<OrderItemProgress, "status">>): LegacyOrderRequestStatus {
  if (items.length === 0) {
    return "New";
  }

  const uniqueStatuses = [...new Set(items.map((item) => item.status))];

  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0];
  }

  const highestStatus = uniqueStatuses
    .slice()
    .sort((left, right) => legacyStatusRank.indexOf(left) - legacyStatusRank.indexOf(right))
    .at(-1) as LegacyOrderStatus;

  return `Partial ${highestStatus}`;
}

export function productionStatusFromLegacyStatus(status: LegacyOrderRequestStatus): ProductionStatus {
  const baseStatus = getBaseOrderStatus(status);

  switch (baseStatus) {
    case "New":
    case "Waiting":
      return "NEW";
    case "In Production":
    case "Ready to Ship":
      return "IN_PROGRESS";
    case "On Delivery":
    case "Delivered":
    case "Completed":
      return "COMPLETED";
    case "Overdue":
      return "CANCELLED";
  }
}

export function getProductionStatusFromItems(items: Array<Pick<OrderItemProgress, "status">>): ProductionStatus {
  if (items.length === 0) {
    return "NEW";
  }

  const statuses = items.map((item) => productionStatusFromLegacyStatus(item.status));

  if (statuses.includes("CANCELLED")) {
    return "CANCELLED";
  }

  if (statuses.every((status) => status === "COMPLETED")) {
    return "COMPLETED";
  }

  const lowestRank = Math.min(...statuses.map((status) => productionRank.indexOf(status)).filter((rank) => rank >= 0));
  return productionRank[Math.max(lowestRank, 0)] ?? "NEW";
}

export function getDeliveryProgress(
  allocations: SalesPointAllocation[] = [],
  shipmentBatches: ShipmentBatch[] = [],
): DeliveryProgress {
  const allocatedQuantity = allocations.reduce((total, allocation) => total + allocation.allocatedQuantity, 0);
  const shippedQuantity = shipmentBatches.reduce(
    (total, batch) => total + batch.items.reduce((batchTotal, item) => batchTotal + item.quantity, 0),
    0,
  );
  const receivedQuantity = shipmentBatches.reduce(
    (total, batch) => total + batch.items.reduce((batchTotal, item) => batchTotal + item.receivedQuantity, 0),
    0,
  );
  const salesPointIds = new Set(allocations.map((allocation) => allocation.salesPointId));
  const deliveredSalesPointIds = new Set(
    allocations
      .filter((allocation) => allocation.allocatedQuantity > 0 && allocation.receivedQuantity >= allocation.allocatedQuantity)
      .map((allocation) => allocation.salesPointId),
  );
  const podCount = shipmentBatches.reduce((total, batch) => total + batch.deliveryConfirmations.length, 0);

  return {
    allocatedQuantity,
    shippedQuantity,
    receivedQuantity,
    salesPointCount: salesPointIds.size,
    deliveredSalesPointCount: deliveredSalesPointIds.size,
    podCount,
    percentage: allocatedQuantity > 0 ? Math.round((receivedQuantity / allocatedQuantity) * 100) : 0,
  };
}

export function getDistributionStatus(
  allocations: SalesPointAllocation[] = [],
  shipmentBatches: ShipmentBatch[] = [],
): DistributionStatus {
  if (shipmentBatches.some((batch) => batch.status === "CLOSED" && batch.items.some((item) => item.receivedQuantity < item.quantity))) {
    return "EXCEPTION";
  }

  const progress = getDeliveryProgress(allocations, shipmentBatches);

  if (progress.allocatedQuantity === 0 || progress.shippedQuantity === 0) {
    return "NOT_STARTED";
  }

  if (progress.receivedQuantity >= progress.allocatedQuantity) {
    return "FULLY_RECEIVED";
  }

  if (progress.receivedQuantity > 0) {
    return "PARTIALLY_RECEIVED";
  }

  if (progress.shippedQuantity >= progress.allocatedQuantity) {
    return "FULLY_DISTRIBUTED";
  }

  return "PARTIALLY_DISTRIBUTED";
}

export function getLegacyStatusFromDomain(
  productionStatus: ProductionStatus,
  distributionStatus: DistributionStatus,
): LegacyOrderRequestStatus {
  if (productionStatus === "CANCELLED" || distributionStatus === "EXCEPTION") {
    return "Overdue";
  }

  if (productionStatus === "COMPLETED" && distributionStatus === "FULLY_RECEIVED") {
    return "Completed";
  }

  if (distributionStatus === "PARTIALLY_RECEIVED" || distributionStatus === "FULLY_RECEIVED") {
    return "Delivered";
  }

  if (
    distributionStatus === "PARTIALLY_DISTRIBUTED" ||
    distributionStatus === "FULLY_DISTRIBUTED"
  ) {
    return "On Delivery";
  }

  if (productionStatus === "COMPLETED") {
    return "Ready to Ship";
  }

  if (productionStatus === "IN_PROGRESS") {
    return "In Production";
  }

  return "New";
}

export function recomputeOrderDomainState<T extends Pick<Order, "items" | "allocations" | "shipmentBatches">>(
  order: T,
) {
  const productionStatus = getProductionStatusFromItems(order.items);
  const distributionStatus = getDistributionStatus(order.allocations, order.shipmentBatches);
  const deliveryProgress = getDeliveryProgress(order.allocations, order.shipmentBatches);
  const status = getLegacyStatusFromDomain(productionStatus, distributionStatus);

  return {
    productionStatus,
    distributionStatus,
    deliveryProgress,
    status,
  };
}

export function formatDomainStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
