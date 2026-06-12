/**
 * P1-11 — Order Request store.
 * Storage key: `va-trace-v2-orders`.
 *
 * Owns `OrderRequest` and `OrderItem` demand facts. It never owns shipped or
 * received truth: those derive from batch items and verified POD (CR-07).
 * Commands: create draft, submit, amend, cancel, accept (Phase 3 workflow 1).
 */

import type { CommandMetadata, ID, MutationResponse, ProductReference } from "@/lib/types/v2/foundation";
import type {
  AcceptOrderRequestDto,
  AmendOrderRequestDto,
  CancelOrderRequestDto,
  CreateOrderRequestDto,
  OrderItem,
  OrderRequest,
  SubmitOrderRequestDto,
} from "@/lib/types/v2/orderRequest";
import { normalizeOrderReferenceLink, normalizeOrderTags } from "@/lib/orderMetadata";
import { newId, nowIso, todayIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  permissionDeniedError,
  policyBlockedError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { resolveWorkflowPolicy } from "@/lib/v2/policyStore";

const store = createCollectionStore<OrderRequest>({
  storageKey: "va-trace-v2-orders",
  entityType: "ORDER_REQUEST",
  seed: () => buildV2SeedData().orderRequests,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useOrderRequests(): OrderRequest[] {
  return store.useAll();
}

export function getOrderRequests(): OrderRequest[] {
  return store.getAll();
}

export function getOrderRequestById(id: ID): OrderRequest | undefined {
  return store.getById(id) ?? store.getAll().find((order) => order.orderRequestNumber === id);
}

export function subscribeToOrderRequests(listener: () => void): () => void {
  return store.subscribe(listener);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface OrderReferenceInputs {
  client: OrderRequest["client"];
  project: OrderRequest["project"];
  vendor: OrderRequest["vendor"];
  requester: OrderRequest["requester"];
  productsById: Map<ID, ProductReference>;
}

function nextOrderNumber(): string {
  return `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function createOrderRequestDraft(
  dto: CreateOrderRequestDto,
  refs: OrderReferenceInputs,
  command: CommandMetadata,
): MutationResponse<OrderRequest> {
  return runCommand({
    command,
    execute: (context) => {
      if (dto.items.length === 0) {
        throw validationError("At least one order item is required.", [
          { field: "items", code: "REQUIRED", message: "Add at least one product line." },
        ]);
      }
      for (const item of dto.items) {
        if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity <= 0) {
          throw validationError("Ordered quantity must be greater than zero.", [
            { field: `items.${item.lineNumber}.orderedQuantity`, code: "INVALID_QUANTITY", message: "Quantity must be > 0." },
          ]);
        }
        if (!refs.productsById.has(item.productId)) {
          throw validationError(`Product ${item.productId} does not resolve to the product master.`, [
            { field: `items.${item.lineNumber}.productId`, code: "UNKNOWN_PRODUCT", message: "Unknown product." },
          ]);
        }
      }
      const lineNumbers = dto.items.map((item) => item.lineNumber);
      if (new Set(lineNumbers).size !== lineNumbers.length) {
        throw validationError("Order item line numbers must be unique within an order.");
      }

      const now = nowIso();
      const id = nextOrderNumber();
      const items: OrderItem[] = dto.items.map((item) => {
        const product = refs.productsById.get(item.productId) as ProductReference;
        return {
          id: `${id}::line-${item.lineNumber}`,
          orderRequestId: id,
          lineNumber: item.lineNumber,
          product,
          description: item.description ?? product.name,
          specification: item.specification,
          orderedQuantity: item.orderedQuantity,
          unitOfMeasure: item.unitOfMeasure,
          productionStatus: "NEW",
          productionReadyQuantity: 0,
          productionCompletedQuantity: 0,
          allocatedQuantity: 0,
          shippedQuantity: 0,
          receivedQuantity: 0,
          remainingToAllocateQuantity: item.orderedQuantity,
          notes: item.notes,
        };
      });

      const order: OrderRequest = {
        id,
        orderRequestNumber: id,
        clientPoNumber: dto.clientPoNumber?.trim() || null,
        tags: normalizeOrderTags(dto.tags),
        referenceLink: normalizeOrderReferenceLink(dto.referenceLink),
        client: refs.client,
        project: refs.project,
        vendor: refs.vendor,
        requester: refs.requester,
        source: dto.source,
        priority: dto.priority ?? "NORMAL",
        productionStatus: "NEW",
        distributionStatus: "NOT_STARTED",
        deadlineDate: dto.deadlineDate || todayIso(),
        requestedDeliveryDate: dto.requestedDeliveryDate,
        remarks: dto.remarks,
        underAllocationReason: dto.underAllocationReason,
        externalReferences: dto.externalReferences ?? [],
        items,
        allocationIds: [],
        quantitySummary: {
          orderedQuantity: items.reduce((total, item) => total + item.orderedQuantity, 0),
          allocatedQuantity: 0,
          shippedQuantity: 0,
          receivedQuantity: 0,
          outstandingToShipQuantity: 0,
          outstandingToReceiveQuantity: 0,
          productionReadyQuantity: 0,
          productionCompletionPercent: 0,
          deliveryProgressPercent: 0,
          salesPointCount: 0,
          salesPointsFullyReceived: 0,
          openPodIssueCount: 0,
        },
        documentSummary: {
          shipmentBatchCount: 0,
          deliveryNoteCount: 0,
          printedDeliveryNoteCount: 0,
          uploadedPodCount: 0,
          verifiedPodCount: 0,
          missingPodCount: 0,
        },
        exceptionSummary: { hasException: false, exceptionCount: 0 },
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      };

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: order.id,
        newValue: { orderRequestNumber: order.orderRequestNumber, clientPoNumber: order.clientPoNumber },
      });

      store.upsert(order);
      return order;
    },
  });
}

export function submitOrderRequest(
  dto: SubmitOrderRequestDto,
  options: { allocationCount: number; allocationTotalsValid: boolean; fullyAllocated: boolean },
  command: CommandMetadata,
): MutationResponse<OrderRequest> {
  return runCommand({
    command,
    execute: (context) => {
      const order = store.getById(dto.orderRequestId);
      if (!order) throw notFoundError("ORDER_REQUEST", dto.orderRequestId);
      assertVersion(order, dto.expectedVersion, "ORDER_REQUEST");
      if (order.productionStatus !== "NEW") {
        throw invalidTransitionError(`Order ${order.id} cannot be submitted from ${order.productionStatus}.`);
      }

      const policy = resolveWorkflowPolicy({
        clientId: order.client.id,
        projectId: order.project.id,
        vendorId: order.vendor.id,
      });

      const fieldErrors = [];
      if (policy.orderRules.clientPoRequired && !order.clientPoNumber) {
        fieldErrors.push({ field: "clientPoNumber", code: "REQUIRED", message: "Client PO is required by policy." });
      }
      if (!order.client.id) fieldErrors.push({ field: "clientId", code: "REQUIRED", message: "Client is required." });
      if (!order.vendor.id) fieldErrors.push({ field: "vendorId", code: "REQUIRED", message: "Vendor is required." });
      if (!order.deadlineDate) fieldErrors.push({ field: "deadlineDate", code: "REQUIRED", message: "Deadline is required." });
      if (order.items.length === 0) fieldErrors.push({ field: "items", code: "REQUIRED", message: "At least one item is required." });
      if (options.allocationCount === 0) {
        fieldErrors.push({ field: "allocations", code: "REQUIRED", message: "At least one Sales Point allocation is required." });
      }
      if (fieldErrors.length > 0) {
        throw validationError("Order Request is not valid for submission.", fieldErrors);
      }
      if (!options.allocationTotalsValid) {
        throw validationError("Allocation totals exceed ordered quantities.");
      }
      if (!options.fullyAllocated) {
        if (!policy.orderRules.allowUnderAllocationOnSubmit) {
          throw policyBlockedError("Under-allocated orders cannot be submitted under the active policy.");
        }
        if (policy.orderRules.requireUnderAllocationApproval && !order.underAllocationReason) {
          throw validationError("Under-allocation requires an approved reason before submission.", [
            { field: "underAllocationReason", code: "REQUIRED", message: "Provide an under-allocation reason." },
          ]);
        }
      }

      const next: OrderRequest = {
        ...order,
        productionStatus: "SUBMITTED",
        items: order.items.map((item) => ({ ...item, productionStatus: "SUBMITTED" })),
        submittedAt: nowIso(),
        audit: { ...order.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: order.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: order.id,
        previousValue: "NEW",
        newValue: "SUBMITTED",
      });
      context.domainEvent({
        eventType: "ORDER_SUBMITTED",
        aggregateType: "ORDER_REQUEST",
        aggregateId: order.id,
        payload: { orderRequestNumber: order.orderRequestNumber },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function acceptOrderRequest(dto: AcceptOrderRequestDto, command: CommandMetadata): MutationResponse<OrderRequest> {
  return runCommand({
    command,
    execute: (context) => {
      const order = store.getById(dto.orderRequestId);
      if (!order) throw notFoundError("ORDER_REQUEST", dto.orderRequestId);
      if (order.vendor.id !== dto.vendorId) {
        throw permissionDeniedError("orders:accept", "Order is not assigned to this vendor.");
      }
      if (order.productionStatus !== "SUBMITTED") {
        throw invalidTransitionError(`Order ${order.id} cannot be accepted from ${order.productionStatus}.`);
      }

      const next: OrderRequest = {
        ...order,
        productionStatus: "ACCEPTED",
        items: order.items.map((item) => ({ ...item, productionStatus: "ACCEPTED" })),
        acceptedAt: dto.acceptedAt,
        audit: { ...order.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: order.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: order.id,
        previousValue: "SUBMITTED",
        newValue: "ACCEPTED",
      });

      store.upsert(next);
      return next;
    },
  });
}

export function amendOrderRequest(dto: AmendOrderRequestDto, command: CommandMetadata): MutationResponse<OrderRequest> {
  return runCommand({
    command,
    execute: (context) => {
      const order = store.getById(dto.orderRequestId);
      if (!order) throw notFoundError("ORDER_REQUEST", dto.orderRequestId);
      assertVersion(order, dto.expectedVersion, "ORDER_REQUEST");
      if (!dto.amendmentReason) throw validationError("Amendment reason is required.");
      if (order.cancelledAt) throw invalidTransitionError("Cancelled orders cannot be amended.");

      const policy = resolveWorkflowPolicy({
        clientId: order.client.id,
        projectId: order.project.id,
        vendorId: order.vendor.id,
      });
      const hasShipment = order.quantitySummary.shippedQuantity > 0;
      if (hasShipment && !policy.orderRules.allowOrderAmendmentAfterShipment) {
        throw policyBlockedError("Order amendment after shipment is blocked by the active policy.");
      }

      const metadata = dto.metadataChanges ?? {};
      const itemUpdates = new Map((dto.itemChanges ?? []).map((change) => [change.id, change]));

      const next: OrderRequest = {
        ...order,
        clientPoNumber:
          metadata.clientPoNumber === null ? null : metadata.clientPoNumber ?? order.clientPoNumber,
        deadlineDate: metadata.deadlineDate ?? order.deadlineDate,
        requestedDeliveryDate:
          metadata.requestedDeliveryDate === null ? undefined : metadata.requestedDeliveryDate ?? order.requestedDeliveryDate,
        priority: metadata.priority ?? order.priority,
        remarks: metadata.remarks === null ? undefined : metadata.remarks ?? order.remarks,
        underAllocationReason:
          metadata.underAllocationReason === null ? undefined : metadata.underAllocationReason ?? order.underAllocationReason,
        items: order.items.map((item) => {
          const change = itemUpdates.get(item.id);
          if (!change) return item;
          const orderedQuantity = change.orderedQuantity ?? item.orderedQuantity;
          if (orderedQuantity <= 0) {
            throw validationError(`Ordered quantity for item ${item.id} must be greater than zero.`);
          }
          return {
            ...item,
            description: change.description ?? item.description,
            specification: change.specification === null ? undefined : change.specification ?? item.specification,
            orderedQuantity,
            unitOfMeasure: change.unitOfMeasure ?? item.unitOfMeasure,
            notes: change.notes === null ? undefined : change.notes ?? item.notes,
          };
        }),
        audit: { ...order.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: order.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: order.id,
        reason: dto.amendmentReason,
        previousValue: { version: order.version },
        newValue: { version: next.version },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function cancelOrderRequest(dto: CancelOrderRequestDto, command: CommandMetadata): MutationResponse<OrderRequest> {
  return runCommand({
    command,
    execute: (context) => {
      const order = store.getById(dto.orderRequestId);
      if (!order) throw notFoundError("ORDER_REQUEST", dto.orderRequestId);
      assertVersion(order, dto.expectedVersion, "ORDER_REQUEST");
      if (!dto.reason) throw validationError("Cancellation reason is required.");
      if (order.productionStatus === "COMPLETED" || order.cancelledAt) {
        throw invalidTransitionError(`Order ${order.id} cannot be cancelled from its current state.`);
      }

      const next: OrderRequest = {
        ...order,
        productionStatus: "CANCELLED",
        items: order.items.map((item) => ({ ...item, productionStatus: "CANCELLED" })),
        cancelledAt: nowIso(),
        cancellationReason: dto.reason,
        audit: { ...order.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: order.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "ORDER_REQUEST",
        sourceEntityId: order.id,
        previousValue: order.productionStatus,
        newValue: "CANCELLED",
        reason: dto.reason,
      });

      store.upsert(next);
      return next;
    },
  });
}
