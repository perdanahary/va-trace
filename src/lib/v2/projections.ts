/**
 * Pure projection builders (CR-07).
 *
 * All summaries, statuses, and list rows are read projections computed from
 * source aggregates. This module is pure: it never reads or writes stores.
 * Stores and workflows pass raw collections in; UI selectors pass store
 * snapshots in. Persisted summary fields are caches that this module rebuilds.
 */

import type {
  DeliveryConfirmation,
  DeliveryNote,
} from "@/lib/types/v2/deliveryNote";
import type { ID, Quantity } from "@/lib/types/v2/foundation";
import type {
  OrderDocumentSummary,
  OrderExceptionSummary,
  OrderQuantitySummary,
  OrderRequest,
} from "@/lib/types/v2/orderRequest";
import type { ProductionJob } from "@/lib/types/v2/production";
import type { SalesPointAllocation } from "@/lib/types/v2/salesPoint";
import type {
  ShipmentBatch,
  ShipmentBatchItem,
  ShipmentBatchQuantitySummary,
} from "@/lib/types/v2/shipment";
import type { DistributionStatus, PodStatus, ProductionStatus } from "@/lib/types/v2/status";
import type { OperationalException } from "@/lib/types/v2/exception";
import {
  deriveAllocationStatus,
  deriveDistributionStatus,
  deriveOrderProductionStatus,
  podStatusFromConfirmation,
  rollupPodStatus,
} from "@/lib/v2/selectors/derivedStatus";
import { percentage, sum } from "@/lib/v2/selectors/quantities";
import { legacyStatusLabel } from "@/lib/v2/compat/legacyLabels";

export interface OrderProjectionSources {
  allocations: SalesPointAllocation[];
  productionJobs: ProductionJob[];
  shipmentBatches: ShipmentBatch[];
  deliveryNotes: DeliveryNote[];
  deliveryConfirmations: DeliveryConfirmation[];
  exceptions: OperationalException[];
}

// ---------------------------------------------------------------------------
// Allocation hydration
// ---------------------------------------------------------------------------

/** Recomputes the derived fields of one allocation from batch and POD facts. */
export function hydrateAllocation(
  allocation: SalesPointAllocation,
  batches: ShipmentBatch[],
  confirmations: DeliveryConfirmation[],
): SalesPointAllocation {
  const relevantBatches = batches.filter(
    (batch) =>
      !["CANCELLED", "VOIDED"].includes(batch.status) &&
      batch.items.some((item) => item.salesPointAllocationId === allocation.id),
  );
  const lines = relevantBatches.flatMap((batch) =>
    batch.items.filter((item) => item.salesPointAllocationId === allocation.id),
  );

  const shippedQuantity = sum(lines.map((line) => line.shippedQuantity));
  const receivedQuantity = sum(lines.map((line) => line.verifiedReceivedQuantity));
  const batchIds = relevantBatches.map((batch) => batch.id);
  const latestBatch = relevantBatches.at(-1);

  const relatedConfirmations = confirmations.filter((confirmation) =>
    confirmation.itemConfirmations.some((item) => item.salesPointAllocationId === allocation.id),
  );
  const podStatuses = relatedConfirmations.map((confirmation) =>
    podStatusFromConfirmation(
      confirmation.status,
      confirmation.quantitySummary.varianceQuantity !== 0,
    ),
  );

  const cancelled = allocation.status === "CANCELLED";
  const status = deriveAllocationStatus({
    allocatedQuantity: allocation.allocatedQuantity,
    shippedQuantity,
    receivedQuantity,
    cancelled,
    adjusted: Boolean(allocation.correctionReason),
    hasBlockingException: allocation.exceptionState === "BLOCKED",
    receiptFinalized:
      relatedConfirmations.length > 0 &&
      relatedConfirmations.every((confirmation) =>
        ["VERIFIED", "PARTIALLY_VERIFIED", "CLOSED"].includes(confirmation.status),
      ),
  });

  return {
    ...allocation,
    shippedQuantity,
    receivedQuantity,
    outstandingQuantity: Math.max(allocation.allocatedQuantity - shippedQuantity, 0),
    remainingToReceiveQuantity: Math.max(allocation.allocatedQuantity - receivedQuantity, 0),
    status,
    podStatus: rollupPodStatus(podStatuses, {
      dispatched: relevantBatches.some((batch) =>
        ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batch.status),
      ),
    }),
    batchIds,
    latestShipmentBatchId: latestBatch?.id,
    latestDeliveryNoteId: latestBatch?.deliveryNoteId ?? allocation.latestDeliveryNoteId,
  };
}

// ---------------------------------------------------------------------------
// Shipment batch hydration
// ---------------------------------------------------------------------------

export function buildBatchQuantitySummary(items: ShipmentBatchItem[]): ShipmentBatchQuantitySummary {
  const shippedQuantity = sum(items.map((item) => item.shippedQuantity));
  const claimedReceivedQuantity = sum(items.map((item) => item.claimedReceivedQuantity ?? 0));
  const verifiedReceivedQuantity = sum(items.map((item) => item.verifiedReceivedQuantity));

  return {
    allocatedContextQuantity: sum(items.map((item) => item.allocatedQuantity)),
    shippedQuantity,
    claimedReceivedQuantity,
    verifiedReceivedQuantity,
    varianceQuantity: verifiedReceivedQuantity - shippedQuantity,
    receiptProgressPercent: percentage(verifiedReceivedQuantity, shippedQuantity),
    salesPointCount: new Set(items.map((item) => item.salesPoint.salesPointId)).size,
    itemCount: items.length,
    partialShipmentLineCount: items.filter((item) => item.shippedQuantity < item.outstandingBeforeBatchQuantity).length,
    partialDeliveryLineCount: items.filter(
      (item) => item.verifiedReceivedQuantity > 0 && item.verifiedReceivedQuantity < item.shippedQuantity,
    ).length,
  };
}

export function hydrateShipmentBatch(
  batch: ShipmentBatch,
  confirmations: DeliveryConfirmation[],
  exceptions: OperationalException[],
): ShipmentBatch {
  const quantitySummary = buildBatchQuantitySummary(batch.items);
  const batchConfirmations = confirmations.filter((confirmation) => confirmation.shipmentBatchId === batch.id);
  const podStatuses = batchConfirmations.map((confirmation) =>
    podStatusFromConfirmation(confirmation.status, confirmation.quantitySummary.varianceQuantity !== 0),
  );
  const openExceptions = exceptions.filter(
    (exception) =>
      ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"].includes(exception.status) &&
      (exception.sourceEntityId === batch.id ||
        exception.affectedEntityRefs.some((ref) => ref.entityId === batch.id)),
  );

  const dispatched = ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batch.status);

  return {
    ...batch,
    quantitySummary,
    podStatus: batch.legacyVerificationFlag
      ? rollupPodStatus(podStatuses, { dispatched })
      : rollupPodStatus(podStatuses, { dispatched }),
    exceptionSummary: {
      hasException: openExceptions.length > 0,
      exceptionCount: openExceptions.length,
      highestSeverity: openExceptions.some((exception) => exception.severity === "CRITICAL" || exception.severity === "HIGH")
        ? "CRITICAL"
        : openExceptions.length > 0
          ? "WARNING"
          : undefined,
      unresolvedReasons: openExceptions.map((exception) => exception.title),
    },
  };
}

// ---------------------------------------------------------------------------
// Order hydration
// ---------------------------------------------------------------------------

export function buildOrderQuantitySummary(
  order: OrderRequest,
  allocations: SalesPointAllocation[],
  productionJobs: ProductionJob[],
  confirmations: DeliveryConfirmation[],
): OrderQuantitySummary {
  const orderedQuantity = sum(order.items.map((item) => item.orderedQuantity));
  const active = allocations.filter((allocation) => allocation.status !== "CANCELLED");
  const allocatedQuantity = sum(active.map((allocation) => allocation.allocatedQuantity));
  const shippedQuantity = sum(active.map((allocation) => allocation.shippedQuantity));
  const receivedQuantity = sum(active.map((allocation) => allocation.receivedQuantity));
  const productionReadyQuantity = sum(productionJobs.map((job) => job.readyQuantity));
  const productionCompletedQuantity = sum(productionJobs.map((job) => job.completedQuantity));

  const salesPointIds = new Set(active.map((allocation) => allocation.salesPoint.id));
  const fullyReceived = [...salesPointIds].filter((salesPointId) =>
    active
      .filter((allocation) => allocation.salesPoint.id === salesPointId)
      .every((allocation) => allocation.allocatedQuantity > 0 && allocation.receivedQuantity >= allocation.allocatedQuantity),
  );

  const openPodIssueCount = confirmations.filter((confirmation) =>
    ["SUBMITTED", "PENDING_VERIFICATION", "REJECTED", "CORRECTION_REQUESTED", "RESUBMITTED"].includes(confirmation.status),
  ).length;

  return {
    orderedQuantity,
    allocatedQuantity,
    shippedQuantity,
    receivedQuantity,
    outstandingToShipQuantity: Math.max(allocatedQuantity - shippedQuantity, 0),
    outstandingToReceiveQuantity: Math.max(allocatedQuantity - receivedQuantity, 0),
    productionReadyQuantity,
    productionCompletionPercent: percentage(productionCompletedQuantity, orderedQuantity),
    deliveryProgressPercent: percentage(receivedQuantity, allocatedQuantity),
    salesPointCount: salesPointIds.size,
    salesPointsFullyReceived: fullyReceived.length,
    openPodIssueCount,
  };
}

export function buildOrderDocumentSummary(
  batches: ShipmentBatch[],
  deliveryNotes: DeliveryNote[],
  confirmations: DeliveryConfirmation[],
): OrderDocumentSummary {
  const activeNotes = deliveryNotes.filter((note) => note.isActive);
  const dispatchedBatchIds = new Set(
    batches
      .filter((batch) => ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batch.status))
      .map((batch) => batch.id),
  );
  const batchIdsWithPod = new Set(confirmations.map((confirmation) => confirmation.shipmentBatchId));

  return {
    shipmentBatchCount: batches.filter((batch) => !["CANCELLED", "VOIDED"].includes(batch.status)).length,
    deliveryNoteCount: activeNotes.length,
    printedDeliveryNoteCount: activeNotes.filter((note) => note.printCount > 0).length,
    uploadedPodCount: confirmations.filter((confirmation) =>
      ["SUBMITTED", "PENDING_VERIFICATION", "PARTIALLY_VERIFIED", "VERIFIED", "CLOSED", "RESUBMITTED"].includes(confirmation.status),
    ).length,
    verifiedPodCount: confirmations.filter((confirmation) => ["VERIFIED", "CLOSED"].includes(confirmation.status)).length,
    missingPodCount: [...dispatchedBatchIds].filter((batchId) => !batchIdsWithPod.has(batchId)).length,
  };
}

export function buildOrderExceptionSummary(
  orderId: ID,
  exceptions: OperationalException[],
): OrderExceptionSummary {
  const open = exceptions.filter(
    (exception) =>
      ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"].includes(exception.status) &&
      (exception.sourceEntityId === orderId || exception.affectedEntityRefs.some((ref) => ref.entityId === orderId)),
  );
  const latest = open.at(-1);

  return {
    hasException: open.length > 0,
    exceptionCount: open.length,
    highestSeverity: open.some((exception) => exception.severity === "CRITICAL" || exception.severity === "HIGH")
      ? "CRITICAL"
      : open.length > 0
        ? "WARNING"
        : undefined,
    latestExceptionReason: latest?.title,
  };
}

export interface HydratedOrder {
  order: OrderRequest;
  allocations: SalesPointAllocation[];
  productionJobs: ProductionJob[];
  shipmentBatches: ShipmentBatch[];
  deliveryNotes: DeliveryNote[];
  deliveryConfirmations: DeliveryConfirmation[];
  productionStatus: ProductionStatus;
  distributionStatus: DistributionStatus;
  podStatus: PodStatus;
}

/** Rebuilds every order-level projection from source aggregates. */
export function hydrateOrder(order: OrderRequest, sources: OrderProjectionSources): HydratedOrder {
  const orderBatches = sources.shipmentBatches
    .filter((batch) => batch.orderRequestId === order.id)
    .map((batch) => hydrateShipmentBatch(batch, sources.deliveryConfirmations, sources.exceptions));
  const orderConfirmations = sources.deliveryConfirmations.filter(
    (confirmation) => confirmation.orderRequestId === order.id,
  );
  const orderNotes = sources.deliveryNotes.filter((note) => note.orderRequestId === order.id);
  const orderJobs = sources.productionJobs.filter((job) => job.orderRequestId === order.id);
  const allocations = sources.allocations
    .filter((allocation) => allocation.orderRequestId === order.id)
    .map((allocation) => hydrateAllocation(allocation, orderBatches, orderConfirmations));

  const productionStatus = order.cancelledAt
    ? "CANCELLED"
    : orderJobs.length > 0
      ? deriveOrderProductionStatus(orderJobs.map((job) => job.status))
      : order.productionStatus;

  const allocationFacts = allocations.map((allocation) => ({
    allocatedQuantity: allocation.allocatedQuantity,
    shippedQuantity: allocation.shippedQuantity,
    receivedQuantity: allocation.receivedQuantity,
    cancelled: allocation.status === "CANCELLED",
    hasBlockingException: allocation.exceptionState === "BLOCKED",
  }));
  const distributionStatus = deriveDistributionStatus(allocationFacts, {
    cancelled: Boolean(order.cancelledAt),
    hasBlockingException: buildOrderExceptionSummary(order.id, sources.exceptions).hasException
      ? sources.exceptions.some(
          (exception) =>
            exception.blocking &&
            ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"].includes(exception.status) &&
            (exception.sourceEntityId === order.id ||
              exception.affectedEntityRefs.some((ref) => ref.entityId === order.id)),
        )
      : false,
  });

  const items = order.items.map((item) => {
    const itemAllocations = allocations.filter((allocation) => allocation.orderItemId === item.id);
    const itemJobs = orderJobs.filter((job) => job.orderItemId === item.id);
    const allocated = sum(itemAllocations.map((allocation) => allocation.allocatedQuantity));
    return {
      ...item,
      productionStatus: itemJobs.length > 0 ? deriveOrderProductionStatus(itemJobs.map((job) => job.status)) : item.productionStatus,
      productionReadyQuantity: sum(itemJobs.map((job) => job.readyQuantity)),
      productionCompletedQuantity: sum(itemJobs.map((job) => job.completedQuantity)),
      allocatedQuantity: allocated,
      shippedQuantity: sum(itemAllocations.map((allocation) => allocation.shippedQuantity)),
      receivedQuantity: sum(itemAllocations.map((allocation) => allocation.receivedQuantity)),
      remainingToAllocateQuantity: Math.max(item.orderedQuantity - allocated, 0),
    };
  });

  const hydratedOrder: OrderRequest = {
    ...order,
    items,
    productionStatus,
    distributionStatus,
    legacyStatusLabel: legacyStatusLabel(productionStatus, distributionStatus),
    allocationIds: allocations.map((allocation) => allocation.id),
    quantitySummary: buildOrderQuantitySummary({ ...order, items }, allocations, orderJobs, orderConfirmations),
    documentSummary: buildOrderDocumentSummary(orderBatches, orderNotes, orderConfirmations),
    exceptionSummary: buildOrderExceptionSummary(order.id, sources.exceptions),
  };

  const dispatched = orderBatches.some((batch) =>
    ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batch.status),
  );

  return {
    order: hydratedOrder,
    allocations,
    productionJobs: orderJobs,
    shipmentBatches: orderBatches,
    deliveryNotes: orderNotes,
    deliveryConfirmations: orderConfirmations,
    productionStatus,
    distributionStatus,
    podStatus: rollupPodStatus(
      orderConfirmations.map((confirmation) =>
        podStatusFromConfirmation(confirmation.status, confirmation.quantitySummary.varianceQuantity !== 0),
      ),
      { dispatched },
    ),
  };
}
