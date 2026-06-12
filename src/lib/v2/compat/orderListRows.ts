import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import type { StoredOrder } from "@/lib/orderStore";
import { deriveDeadlineState } from "@/lib/v2/selectors/derivedStatus";

const READY_LEGACY_STATUSES = new Set(["Ready to Ship", "On Delivery", "Delivered", "Completed"]);

export function buildOrderListRowsFromStoredOrders(orders: StoredOrder[], rolePrefix: string): OrderListRow[] {
  return orders.map((order) => {
    const orderedQuantity = order.items.reduce((total, item) => total + item.quantity, 0);
    const productionReadyQuantity = order.items.reduce(
      (total, item) => total + (READY_LEGACY_STATUSES.has(item.status) ? item.quantity : 0),
      0,
    );
    const salesPointIds = new Set([
      order.salesPointId,
      ...order.allocations.map((allocation) => allocation.salesPointId),
      ...order.shipmentBatches.flatMap((batch) => batch.salesPointIds),
    ].filter(Boolean));

    return {
      id: order.id,
      clientPoNumber: order.clientPO || null,
      orderRequestNumber: order.id,
      tags: order.tags,
      referenceLink: order.referenceLink,
      clientName: order.clientName ?? order.clientEntityName ?? "PMG Asia",
      projectName: order.campaign ?? "",
      vendorName: order.supplier,
      createdAt: order.createdDate,
      deadlineDate: order.deadline,
      deadlineState: deriveDeadlineState(order.deadline),
      productionStatus: order.productionStatus,
      distributionStatus: order.distributionStatus,
      deliveryProgressLabel: `${order.deliveryProgress.receivedQuantity}/${order.deliveryProgress.allocatedQuantity}`,
      deliveryProgressPercent: order.deliveryProgress.percentage,
      orderedQuantity,
      allocatedQuantity: order.deliveryProgress.allocatedQuantity,
      productionReadyQuantity,
      shippedQuantity: order.deliveryProgress.shippedQuantity,
      receivedQuantity: order.deliveryProgress.receivedQuantity,
      salesPointCount: salesPointIds.size,
      openPodIssueCount: order.shipmentBatches.reduce(
        (total, batch) =>
          total +
          batch.deliveryConfirmations.filter((confirmation) =>
            ["REJECTED", "CORRECTION_REQUESTED", "PARTIALLY_VERIFIED"].includes(confirmation.status),
          ).length,
        0,
      ),
      hasException: order.distributionStatus === "EXCEPTION" || Boolean(order.complaint),
      legacyStatusLabel: order.status,
      actionTargets: {
        detailPath: `${rolePrefix}/orders/${order.id}`,
        deliveryNotesPath: `${rolePrefix}/orders/${order.id}/delivery-note`,
      },
    };
  });
}
