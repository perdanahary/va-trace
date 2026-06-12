import {
  getDeliveryProgress,
  getDistributionStatus,
  getLegacyStatusFromDomain,
  getProductionStatusFromItems,
} from "@/lib/orderStatus";
import type { ShipmentBatch } from "@/lib/types/logistics";
import type { Order, OrderLine, ProductionJob, SalesPointAllocation } from "@/lib/types/order";
import { normalizeDeliveryConfirmationStatus } from "@/lib/types/status";

type OrderWithOptionalDomain = Omit<
  Order,
  "status" | "productionStatus" | "distributionStatus" | "deliveryProgress" | "productionJobs" | "allocations" | "shipmentBatches"
> &
  Partial<
    Pick<Order, "status" | "productionStatus" | "distributionStatus" | "deliveryProgress" | "productionJobs" | "allocations" | "shipmentBatches">
  >;

export function normalizeOrder<T extends OrderWithOptionalDomain>(order: T): T & Order {
  const baseAllocations = order.allocations?.length ? order.allocations : createAllocationsFromOrder(order);
  const rawShipmentBatches = order.shipmentBatches?.length
    ? order.shipmentBatches
    : createShipmentBatchesFromOrder(order, baseAllocations);
  const shipmentBatches = rawShipmentBatches.map(normalizeShipmentBatchRecord);
  const allocations = syncAllocationQuantities(baseAllocations, shipmentBatches);
  const productionStatus = order.productionStatus ?? getProductionStatusFromItems(order.items);
  const distributionStatus = order.distributionStatus ?? getDistributionStatus(allocations, shipmentBatches);
  const deliveryProgress = getDeliveryProgress(allocations, shipmentBatches);
  const productionJobs = order.productionJobs?.length ? order.productionJobs : [createProductionJob(order.id, productionStatus)];
  const status = getLegacyStatusFromDomain(productionStatus, distributionStatus);

  return {
    ...order,
    status,
    productionStatus,
    distributionStatus,
    deliveryProgress,
    productionJobs,
    allocations,
    shipmentBatches,
  };
}

export function normalizeOrders<T extends OrderWithOptionalDomain>(orders: T[]): Array<T & Order> {
  return orders.map((order) => normalizeOrder(order));
}

export function createAllocationsFromOrder(order: Pick<Order, "id" | "salesPointId" | "items">): SalesPointAllocation[] {
  return order.items.map((item) => ({
    id: `${order.id}-${order.salesPointId}-${item.id}`,
    orderId: order.id,
    salesPointId: order.salesPointId,
    orderLineId: item.id,
    productCode: item.productCode,
    allocatedQuantity: item.quantity,
    shippedQuantity: item.deliveredQuantity ?? 0,
    receivedQuantity: isReceivedItem(item) ? item.deliveredQuantity ?? item.quantity : 0,
  }));
}

export function createShipmentBatchesFromOrder(
  order: Pick<Order, "id" | "salesPointId" | "items" | "createdDate">,
  allocations = createAllocationsFromOrder(order),
): ShipmentBatch[] {
  const shipmentItems = order.items
    .filter((item) => (item.deliveredQuantity ?? 0) > 0)
    .map((item) => ({
      id: `${order.id}-SHP-1-${item.id}`,
      orderLineId: item.id,
      productCode: item.productCode,
      salesPointId: order.salesPointId,
      quantity: item.deliveredQuantity ?? 0,
      receivedQuantity: isReceivedItem(item) ? item.deliveredQuantity ?? 0 : 0,
    }));

  if (shipmentItems.length === 0) {
    return [];
  }

  const shippedQuantity = shipmentItems.reduce((total, item) => total + item.quantity, 0);
  const receivedQuantity = shipmentItems.reduce((total, item) => total + item.receivedQuantity, 0);
  const allocatedQuantity = allocations.reduce((total, allocation) => total + allocation.allocatedQuantity, 0);
  const status = getShipmentStatus(shippedQuantity, receivedQuantity, allocatedQuantity);

  return [
    {
      id: `${order.id}-SHP-1`,
      orderId: order.id,
      batchNumber: 1,
      status,
      salesPointIds: [order.salesPointId],
      items: shipmentItems,
      deliveryNoteId: `${order.id}-SHP-1-DN`,
      dispatchedAt: order.createdDate,
      source: "LEGACY_COMPATIBILITY",
      deliveryConfirmations:
        receivedQuantity > 0
          ? [
              {
                id: `${order.id}-POD-1`,
                shipmentBatchId: `${order.id}-SHP-1`,
                salesPointId: order.salesPointId,
                receiverName: "",
                receivedAt: order.createdDate,
                status: "DRAFT",
                photoUrls: [],
              },
            ]
          : [],
    },
  ];
}

export function createProductionJob(orderId: string, status: ProductionJob["status"]): ProductionJob {
  return {
    id: `${orderId}-PROD-1`,
    orderId,
    status,
  };
}

export function syncAllocationQuantities(
  allocations: SalesPointAllocation[],
  shipmentBatches: ShipmentBatch[],
): SalesPointAllocation[] {
  return allocations.map((allocation) => {
    const shippedQuantity = shipmentBatches.reduce(
      (total, batch) =>
        total +
        batch.items
          .filter((item) => item.orderLineId === allocation.orderLineId && item.salesPointId === allocation.salesPointId)
          .reduce((itemTotal, item) => itemTotal + item.quantity, 0),
      0,
    );
    const receivedQuantity = shipmentBatches.reduce(
      (total, batch) =>
        total +
        batch.items
          .filter((item) => item.orderLineId === allocation.orderLineId && item.salesPointId === allocation.salesPointId)
          .reduce((itemTotal, item) => itemTotal + item.receivedQuantity, 0),
      0,
    );

    return {
      ...allocation,
      shippedQuantity,
      receivedQuantity,
    };
  });
}

/**
 * Normalizes persisted shipment batches: maps legacy POD status values
 * ("PENDING" -> DRAFT, "UPLOADED" -> SUBMITTED) so stored V1 data keeps working
 * with the canonical V2 lifecycle.
 */
function normalizeShipmentBatchRecord(batch: ShipmentBatch): ShipmentBatch {
  if (batch.deliveryConfirmations.every((confirmation) => isCanonicalConfirmationStatus(confirmation.status))) {
    return batch;
  }

  return {
    ...batch,
    deliveryConfirmations: batch.deliveryConfirmations.map((confirmation) => ({
      ...confirmation,
      status: normalizeDeliveryConfirmationStatus(confirmation.status),
    })),
  };
}

function isCanonicalConfirmationStatus(status: string): boolean {
  return (
    status === "DRAFT" ||
    status === "SUBMITTED" ||
    status === "VERIFIED" ||
    status === "REJECTED" ||
    status === "CORRECTION_REQUESTED" ||
    status === "CANCELLED"
  );
}

function isReceivedItem(item: Pick<OrderLine, "status" | "deliveredQuantity" | "quantity">) {
  return item.status === "Delivered" || item.status === "Completed" || (item.deliveredQuantity ?? 0) >= item.quantity;
}

function getShipmentStatus(shippedQuantity: number, receivedQuantity: number, allocatedQuantity: number): ShipmentBatch["status"] {
  if (receivedQuantity >= allocatedQuantity) return "FULLY_RECEIVED";
  if (receivedQuantity > 0) return "PARTIALLY_RECEIVED";
  if (shippedQuantity > 0) return "IN_TRANSIT";
  return "DRAFT";
}
