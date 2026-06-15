/**
 * Contract-bound view models (P2-06..P2-10 data layer).
 *
 * React hooks joining the V2 stores into the table row shapes defined by the
 * API contracts. All derived values come from `projections.ts` (CR-07).
 */

import { useMemo } from "react";
import type { DeliveryNoteListRow, PodVerificationQueueRow } from "@/lib/types/v2/deliveryNote";
import type { ID } from "@/lib/types/v2/foundation";
import type { OrderAllocationTableRow, OrderListRow, AllocationProgressRow } from "@/lib/types/v2/orderRequest";
import type { ProductionJobListRow } from "@/lib/types/v2/production";
import type { ShipmentBatchItemTableRow, ShipmentBatchListRow } from "@/lib/types/v2/shipment";
import { useAllocations } from "@/lib/v2/allocationStore";
import { useDeliveryNotes } from "@/lib/v2/deliveryNoteStore";
import { useOperationalExceptions } from "@/lib/v2/exceptionStore";
import { useOrderRequests } from "@/lib/v2/orderRequestStore";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { useProductionJobs } from "@/lib/v2/productionStore";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { hydrateOrder, hydrateShipmentBatch, type HydratedOrder } from "@/lib/v2/projections";
import { deriveDeadlineState, podStatusFromConfirmation } from "@/lib/v2/selectors/derivedStatus";

// ---------------------------------------------------------------------------
// Hydrated aggregates
// ---------------------------------------------------------------------------

export function useHydratedOrders(): HydratedOrder[] {
  const orders = useOrderRequests();
  const allocations = useAllocations();
  const productionJobs = useProductionJobs();
  const shipmentBatches = useShipmentBatches();
  const deliveryNotes = useDeliveryNotes();
  const deliveryConfirmations = useDeliveryConfirmations();
  const exceptions = useOperationalExceptions();

  return useMemo(
    () =>
      orders.map((order) =>
        hydrateOrder(order, {
          allocations,
          productionJobs,
          shipmentBatches,
          deliveryNotes,
          deliveryConfirmations,
          exceptions,
        }),
      ),
    [orders, allocations, productionJobs, shipmentBatches, deliveryNotes, deliveryConfirmations, exceptions],
  );
}

export function useHydratedOrder(orderId: ID | undefined): HydratedOrder | undefined {
  const orders = useHydratedOrders();
  return useMemo(
    () =>
      orderId
        ? orders.find((entry) => entry.order.id === orderId || entry.order.orderRequestNumber === orderId)
        : undefined,
    [orders, orderId],
  );
}

// ---------------------------------------------------------------------------
// Order list rows (order-request-api §7)
// ---------------------------------------------------------------------------

export function useOrderListRows(rolePrefix: string, vendorName?: string): OrderListRow[] {
  const hydrated = useHydratedOrders();

  return useMemo(
    () =>
      hydrated
        .filter((entry) => !vendorName || entry.order.vendor.name === vendorName)
        .map(({ order }) => ({
          id: order.id,
          clientPoNumber: order.clientPoNumber,
          orderRequestNumber: order.orderRequestNumber,
          tags: order.tags,
          referenceLink: order.referenceLink,
          clientName: order.client.name,
          projectName: order.project.name,
          vendorName: order.vendor.name,
          createdAt: order.audit.createdAt,
          deadlineDate: order.deadlineDate,
          deadlineState: deriveDeadlineState(order.deadlineDate),
          productionStatus: order.productionStatus,
          distributionStatus: order.distributionStatus,
          deliveryProgressLabel: `${order.quantitySummary.receivedQuantity}/${order.quantitySummary.allocatedQuantity}`,
          deliveryProgressPercent: order.quantitySummary.deliveryProgressPercent,
          orderedQuantity: order.quantitySummary.orderedQuantity,
          allocatedQuantity: order.quantitySummary.allocatedQuantity,
          productionReadyQuantity: order.quantitySummary.productionReadyQuantity,
          shippedQuantity: order.quantitySummary.shippedQuantity,
          receivedQuantity: order.quantitySummary.receivedQuantity,
          salesPointCount: order.quantitySummary.salesPointCount,
          openPodIssueCount: order.quantitySummary.openPodIssueCount,
          hasException: order.exceptionSummary.hasException,
          legacyStatusLabel: order.legacyStatusLabel,
          actionTargets: {
            detailPath: `${rolePrefix}/orders/${order.id}`,
          },
        })),
    [hydrated, rolePrefix, vendorName],
  );
}

// ---------------------------------------------------------------------------
// Allocation progress rows (per-allocation view for Order Progress page)
// ---------------------------------------------------------------------------

export function useAllocationProgressRows(rolePrefix: string, vendorName?: string): AllocationProgressRow[] {
  const hydrated = useHydratedOrders();

  return useMemo(
    () =>
      hydrated
        .filter((entry) => !vendorName || entry.order.vendor.name === vendorName)
        .flatMap(({ order, allocations }) =>
          allocations.map((allocation) => ({
            allocationId: allocation.id,
            orderRequestId: order.id,
            orderRequestNumber: order.orderRequestNumber,
            clientPoNumber: order.clientPoNumber,
            vendorName: order.vendor.name,
            deadlineDate: order.deadlineDate,
            deadlineState: deriveDeadlineState(order.deadlineDate),
            salesPointName: allocation.salesPoint.name,
            salesPointCode: allocation.salesPoint.wCode,
            productName: allocation.product.name,
            productCode: allocation.product.materialCode,
            allocatedQuantity: allocation.allocatedQuantity,
            shippedQuantity: allocation.shippedQuantity,
            receivedQuantity: allocation.receivedQuantity,
            outstandingQuantity: allocation.outstandingQuantity,
            deliveryProgressLabel: `${allocation.receivedQuantity}/${allocation.allocatedQuantity}`,
            deliveryProgressPercent:
              allocation.allocatedQuantity > 0
                ? Math.round((allocation.receivedQuantity / allocation.allocatedQuantity) * 100)
                : 0,
            allocationStatus: allocation.status,
            podStatus: allocation.podStatus,
            exceptionState: allocation.exceptionState,
            hasException: allocation.exceptionState !== "NONE",
            actionTargets: {
              orderDetailPath: `${rolePrefix}/orders/${order.id}`,
            },
          })),
        ),
    [hydrated, rolePrefix, vendorName],
  );
}

// ---------------------------------------------------------------------------
// Allocation rows (order-request-api §7)
// ---------------------------------------------------------------------------

export function buildAllocationRows(hydrated: HydratedOrder): OrderAllocationTableRow[] {
  return hydrated.allocations.map((allocation) => ({
    allocationId: allocation.id,
    salesPointCode: allocation.salesPoint.wCode,
    salesPointName: allocation.salesPoint.name,
    zone: allocation.salesPoint.zone,
    region: allocation.salesPoint.region,
    area: allocation.salesPoint.area,
    subArea: allocation.salesPoint.subArea,
    productCode: allocation.product.materialCode,
    productName: allocation.product.name,
    allocatedQuantity: allocation.allocatedQuantity,
    shippedQuantity: allocation.shippedQuantity,
    receivedQuantity: allocation.receivedQuantity,
    outstandingQuantity: allocation.outstandingQuantity,
    shipmentBatchCount: allocation.batchIds.length,
    podStatus: allocation.podStatus,
    allocationStatus: allocation.status,
    exceptionState: allocation.exceptionState,
    canAddToBatch:
      allocation.outstandingQuantity > 0 &&
      allocation.status !== "CANCELLED" &&
      !hydrated.order.cancelledAt,
  }));
}

// ---------------------------------------------------------------------------
// Shipment batch rows (shipment-batch-api §7)
// ---------------------------------------------------------------------------

export function useShipmentBatchRows(rolePrefix: string, vendorName?: string): ShipmentBatchListRow[] {
  const batches = useShipmentBatches();
  const confirmations = useDeliveryConfirmations();
  const exceptions = useOperationalExceptions();

  return useMemo(
    () =>
      batches
        .filter((batch) => !vendorName || batch.vendor.name === vendorName)
        .map((raw) => {
          const batch = hydrateShipmentBatch(raw, confirmations, exceptions);
          return {
            id: batch.id,
            batchNumber: batch.batchNumber,
            orderRequestId: batch.orderRequestId,
            orderRequestNumber: batch.orderRequestNumber,
            clientPoNumber: batch.clientPoNumber,
            vendorName: batch.vendor.name,
            clientName: batch.client.name,
            projectName: batch.project.name,
            salesPointCount: batch.quantitySummary.salesPointCount,
            itemCount: batch.quantitySummary.itemCount,
            shippedQuantity: batch.quantitySummary.shippedQuantity,
            receivedQuantity: batch.quantitySummary.verifiedReceivedQuantity,
            varianceQuantity: batch.quantitySummary.varianceQuantity,
            plannedDispatchDate: batch.plannedDispatchDate,
            dispatchedAt: batch.dispatchedAt,
            status: batch.status,
            deliveryNoteStatus: batch.deliveryNoteStatus,
            podStatus: batch.podStatus,
            hasPartialShipment: batch.quantitySummary.partialShipmentLineCount > 0,
            hasPartialDelivery: batch.quantitySummary.partialDeliveryLineCount > 0,
            hasException: batch.exceptionSummary.hasException,
            actionTargets: {
              detailPath: `${rolePrefix}/shipments/${batch.id}`,
              deliveryNotePrintPath: batch.deliveryNoteId ? `${rolePrefix}/shipments/${batch.id}/delivery-note` : undefined,
              labelsPrintPath: `${rolePrefix}/shipments/${batch.id}/labels`,
            },
          } satisfies ShipmentBatchListRow;
        }),
    [batches, confirmations, exceptions, rolePrefix, vendorName],
  );
}

export function buildBatchItemRows(items: ShipmentBatchItemTableRow[] | undefined): ShipmentBatchItemTableRow[] {
  return items ?? [];
}

// ---------------------------------------------------------------------------
// Delivery Note rows (delivery-note-api §7)
// ---------------------------------------------------------------------------

export function useDeliveryNoteRows(rolePrefix: string, vendorName?: string): DeliveryNoteListRow[] {
  const notes = useDeliveryNotes();
  const batches = useShipmentBatches();
  const confirmations = useDeliveryConfirmations();

  return useMemo(
    () =>
      notes
        .filter((note) => {
          if (!vendorName) return true;
          return note.vendor.name === vendorName;
        })
        .map((note) => {
          const batch = batches.find((entry) => entry.id === note.shipmentBatchId);
          const noteConfirmations = confirmations.filter((entry) => entry.deliveryNoteId === note.id);
          const dispatched = batch
            ? ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(batch.status)
            : false;
          const podStatuses = noteConfirmations.map((entry) =>
            podStatusFromConfirmation(entry.status, entry.quantitySummary.varianceQuantity !== 0),
          );

          return {
            id: note.id,
            deliveryNoteNumber: note.deliveryNoteNumber,
            shipmentBatchId: note.shipmentBatchId,
            batchNumber: note.batchNumber,
            orderRequestId: note.orderRequestId,
            orderRequestNumber: note.orderRequestNumber,
            clientPoNumber: note.clientPoNumber,
            vendorName: note.vendor.name,
            clientName: note.client.name,
            projectName: note.projectName,
            salesPointCount: note.quantitySummary.salesPointCount,
            shippedQuantity: note.quantitySummary.shippedQuantity,
            generatedAt: note.generatedAt,
            printedAt: note.printedAt,
            uploadedAt: note.uploadedAt,
            status: note.status,
            podStatus:
              podStatuses.length > 0
                ? podStatuses[0]
                : dispatched
                  ? "PENDING_UPLOAD"
                  : "NOT_STARTED",
            missingPod: dispatched && noteConfirmations.length === 0,
            hasException: false,
            isActive: note.isActive,
            documentVersion: note.documentVersion,
            actionTargets: {
              printPath: `${rolePrefix}/shipments/${note.shipmentBatchId}/delivery-note`,
              batchDetailPath: `${rolePrefix}/shipments/${note.shipmentBatchId}`,
            },
          } satisfies DeliveryNoteListRow;
        }),
    [notes, batches, confirmations, rolePrefix, vendorName],
  );
}

// ---------------------------------------------------------------------------
// POD verification queue rows (delivery-note-api §7)
// ---------------------------------------------------------------------------

export function usePodQueueRows(vendorName?: string): PodVerificationQueueRow[] {
  const confirmations = useDeliveryConfirmations();
  const batches = useShipmentBatches();

  return useMemo(
    () =>
      confirmations
        .filter((confirmation) => {
          if (!vendorName) return true;
          const batch = batches.find((entry) => entry.id === confirmation.shipmentBatchId);
          return batch?.vendor.name === vendorName;
        })
        .map((confirmation) => ({
          deliveryConfirmationId: confirmation.id,
          shipmentBatchId: confirmation.shipmentBatchId,
          deliveryNoteNumber: confirmation.deliveryNoteNumber,
          orderRequestNumber: confirmation.orderRequestId,
          salesPointName: confirmation.salesPointName,
          receiverName: confirmation.receiverName,
          receivedDate: confirmation.receivedDate,
          submittedByName: confirmation.submittedByUserId,
          submittedAt: confirmation.submittedAt,
          ageHours: Math.max(0, Math.round((Date.now() - Date.parse(confirmation.submittedAt)) / 3_600_000)),
          expectedShippedQuantity: confirmation.quantitySummary.expectedShippedQuantity,
          claimedReceivedQuantity: confirmation.quantitySummary.claimedReceivedQuantity,
          varianceQuantity: confirmation.quantitySummary.varianceQuantity,
          evidenceCount: confirmation.evidence.length,
          status: confirmation.status,
        })),
    [confirmations, batches, vendorName],
  );
}

// ---------------------------------------------------------------------------
// Production rows (production-job-api §7)
// ---------------------------------------------------------------------------

export function useProductionRows(vendorName?: string): ProductionJobListRow[] {
  const jobs = useProductionJobs();
  const orders = useOrderRequests();
  const exceptions = useOperationalExceptions();

  return useMemo(
    () =>
      jobs
        .filter((job) => {
          if (!vendorName) return true;
          const order = orders.find((entry) => entry.id === job.orderRequestId);
          return order?.vendor.name === vendorName;
        })
        .map((job) => {
          const order = orders.find((entry) => entry.id === job.orderRequestId);
          const item = order?.items.find((entry) => entry.id === job.orderItemId);
          return {
            id: job.id,
            jobNumber: job.jobNumber,
            orderRequest: { id: job.orderRequestId, name: order?.orderRequestNumber ?? job.orderRequestId },
            orderItem: {
              id: job.orderItemId,
              code: item?.product.materialCode,
              name: item?.description ?? job.orderItemId,
            },
            vendor: { id: job.vendorId, name: order?.vendor.name ?? job.vendorId },
            status: job.status,
            orderedQuantity: job.orderedQuantity,
            producedQuantity: job.producedQuantity,
            qcPassedQuantity: job.qcPassedQuantity,
            readyQuantity: job.readyQuantity,
            reservedForShipmentQuantity: job.reservedForShipmentQuantity,
            completedQuantity: job.completedQuantity,
            rejectedQuantity: job.rejectedQuantity,
            deadline: order?.deadlineDate,
            hasBlockingException: exceptions.some(
              (exception) =>
                exception.blocking &&
                ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"].includes(exception.status) &&
                exception.sourceEntityId === job.id,
            ),
            updatedAt: job.audit.updatedAt,
          } satisfies ProductionJobListRow;
        }),
    [jobs, orders, exceptions, vendorName],
  );
}
