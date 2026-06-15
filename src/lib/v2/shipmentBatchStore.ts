/**
 * P1-14 — Shipment Batch store (logistics source of truth).
 * Storage key: `va-trace-v2-shipments`.
 *
 * Owns `ShipmentBatch`, `ShipmentBatchItem`, and `ShipmentReservation` (HI-13).
 * Status transitions per docs/v2-status-lifecycle.md. Every shipped quantity
 * belongs to a batch item; verified received quantities are applied only by
 * the POD workflow through `applyVerifiedQuantities`.
 */

import type {
  CommandMetadata,
  ID,
  MutationResponse,
} from "@/lib/types/v2/foundation";
import type {
  CancelShipmentBatchDto,
  CloseShipmentBatchDto,
  CreateShipmentBatchDto,
  DispatchShipmentBatchDto,
  MarkShipmentBatchReadyDto,
  RecordFailedDeliveryDto,
  RecordReturnDto,
  ReopenShipmentBatchDto,
  ShipmentBatch,
  ShipmentBatchItem,
  ShipmentDestinationSnapshot,
  ShipmentReservation,
  UpdateShipmentBatchDto,
  VoidShipmentBatchDto,
} from "@/lib/types/v2/shipment";
import type { ShipmentBatchStatus } from "@/lib/types/v2/status";
import type { SalesPointAllocation } from "@/lib/types/v2/salesPoint";
import { newId, nowIso } from "@/lib/v2/ids";
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
import { buildBatchQuantitySummary } from "@/lib/v2/projections";
import { validateBatchLineQuantity } from "@/lib/v2/selectors/quantities";
import { resolveWorkflowPolicy } from "@/lib/v2/policyStore";
import { getSalesPointById } from "@/lib/v2/salesPointStore";
import { getOrderRequestById } from "@/lib/v2/orderRequestStore";

interface ShipmentState {
  batches: ShipmentBatch[];
  reservations: ShipmentReservation[];
}

const store = createCollectionStore<ShipmentBatch>({
  storageKey: "va-trace-v2-shipments",
  entityType: "SHIPMENT_BATCH",
  seed: () => buildV2SeedData().shipmentBatches,
});

const reservationStore = createCollectionStore<ShipmentReservation>({
  storageKey: "va-trace-v2-shipment-reservations",
  entityType: "SHIPMENT_BATCH_ITEM",
});

const ALLOWED_TRANSITIONS: Record<ShipmentBatchStatus, ShipmentBatchStatus[]> = {
  DRAFT: ["READY", "CANCELLED", "VOIDED"],
  READY: ["DISPATCHED", "DRAFT", "CANCELLED", "VOIDED"],
  DISPATCHED: ["IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "FAILED_DELIVERY", "RETURNED", "EXCEPTION", "VOIDED"],
  IN_TRANSIT: ["PARTIALLY_RECEIVED", "FULLY_RECEIVED", "FAILED_DELIVERY", "RETURNED", "EXCEPTION", "VOIDED"],
  PARTIALLY_RECEIVED: ["FULLY_RECEIVED", "CLOSED", "EXCEPTION", "RETURNED"],
  FULLY_RECEIVED: ["CLOSED", "EXCEPTION"],
  FAILED_DELIVERY: ["DISPATCHED", "RETURNED", "CLOSED", "VOIDED"],
  RETURNED: ["CLOSED", "VOIDED"],
  EXCEPTION: ["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED", "VOIDED"],
  CLOSED: [],
  CANCELLED: [],
  VOIDED: [],
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useShipmentBatches(): ShipmentBatch[] {
  return store.useAll();
}

export function getShipmentBatches(): ShipmentBatch[] {
  return store.getAll();
}

export function getShipmentBatchById(id: ID): ShipmentBatch | undefined {
  return store.getById(id);
}

export function getShipmentBatchesForOrder(orderRequestId: ID): ShipmentBatch[] {
  return store.getAll().filter((batch) => batch.orderRequestId === orderRequestId);
}

export function getReservations(): ShipmentReservation[] {
  return reservationStore.getAll();
}

/** Total quantity already shipped (or actively drafted) per allocation. */
export function getShippedQuantityForAllocation(allocationId: ID): number {
  return store
    .getAll()
    .filter((batch) => !["CANCELLED", "VOIDED"].includes(batch.status))
    .flatMap((batch) => batch.items)
    .filter((item) => item.salesPointAllocationId === allocationId)
    .reduce((total, item) => total + item.shippedQuantity, 0);
}

function assertVendorScope(batch: ShipmentBatch, command: CommandMetadata): void {
  if (command.actorRole === "VENDOR") {
    const match = command.correlationId?.match(/^vendor:(.+)$/);
    if (match && batch.vendor.id !== match[1]) {
      throw permissionDeniedError("shipments:dispatch", "Vendor can update only its own batches.");
    }
  }
}

function withSummary(batch: ShipmentBatch): ShipmentBatch {
  return { ...batch, quantitySummary: buildBatchQuantitySummary(batch.items) };
}

// ---------------------------------------------------------------------------
// Create / update draft
// ---------------------------------------------------------------------------

export interface CreateBatchAllocationInput {
  allocation: SalesPointAllocation;
  /** Already shipped quantity across other batches (derived by workflow). */
  previouslyShippedQuantity: number;
  /** Unreserved production-ready quantity when readiness gating applies. */
  availableReadyQuantity?: number;
  productionJobId?: ID;
}

export function createShipmentBatch(
  dto: CreateShipmentBatchDto,
  allocationInputs: Map<ID, CreateBatchAllocationInput>,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const order = getOrderRequestById(dto.orderRequestId);
      if (!order) throw notFoundError("ORDER_REQUEST", dto.orderRequestId);
      if (order.cancelledAt) {
        throw invalidTransitionError("Cancelled orders cannot create new shipment batches.");
      }
      if (dto.items.length === 0) {
        throw validationError("A shipment batch requires at least one item.");
      }

      const policy = resolveWorkflowPolicy({
        clientId: order.client.id,
        projectId: order.project.id,
        vendorId: order.vendor.id,
      });

      const seenLines = new Set<string>();
      const now = nowIso();
      const batchId = newId("batch");
      const sequence = getShipmentBatchesForOrder(dto.orderRequestId).length + 1;
      const batchNumber = `BATCH-${now.slice(0, 10).replace(/-/g, "")}-${order.id.replace(/\D/g, "").slice(-4)}${sequence}`;

      const items: ShipmentBatchItem[] = dto.items.map((itemDto) => {
        const input = allocationInputs.get(itemDto.salesPointAllocationId);
        if (!input) {
          throw validationError(`Allocation ${itemDto.salesPointAllocationId} is not eligible for this batch.`);
        }
        const { allocation } = input;
        if (allocation.orderRequestId !== dto.orderRequestId) {
          throw validationError("A batch must reference exactly one source Order Request.");
        }
        if (allocation.status === "CANCELLED") {
          throw validationError(`Allocation ${allocation.id} is cancelled.`);
        }

        const lineKey = `${allocation.id}:${allocation.product.materialCode}`;
        if (seenLines.has(lineKey)) {
          throw validationError(`Duplicate batch line for allocation ${allocation.id}.`);
        }
        seenLines.add(lineKey);

        const lineCheck = validateBatchLineQuantity({
          requested: itemDto.shippedQuantity,
          allocated: allocation.allocatedQuantity,
          previouslyShipped: input.previouslyShippedQuantity,
        });
        if (!lineCheck.valid) {
          throw validationError(lineCheck.message ?? "Invalid batch quantity.");
        }
        if (
          policy.shipmentRules.enforceProductionReadyQuantity &&
          input.availableReadyQuantity !== undefined &&
          itemDto.shippedQuantity > input.availableReadyQuantity
        ) {
          throw policyBlockedError(
            `Batch quantity ${itemDto.shippedQuantity} exceeds unreserved production-ready quantity ${input.availableReadyQuantity}.`,
          );
        }

        const salesPointMaster = getSalesPointById(allocation.salesPoint.id);
        if (salesPointMaster && !salesPointMaster.dataQuality.hasCompleteAddress) {
          context.warn({
            code: "MISSING_ADDRESS",
            message: `Sales Point ${allocation.salesPoint.name} has an incomplete address.`,
            severity: "WARNING",
          });
        }

        return {
          id: newId("sbi"),
          shipmentBatchId: batchId,
          orderRequestId: dto.orderRequestId,
          orderItemId: itemDto.orderItemId,
          salesPointAllocationId: allocation.id,
          product: {
            productId: allocation.product.id,
            sku: allocation.product.sku,
            materialCode: allocation.product.materialCode,
            name: allocation.product.name,
            unitOfMeasure: allocation.product.unitOfMeasure,
          },
          salesPoint: {
            salesPointId: allocation.salesPoint.id,
            code: allocation.salesPoint.code ?? allocation.salesPoint.id,
            wCode: allocation.salesPoint.wCode,
            name: allocation.salesPoint.name,
            zone: allocation.salesPoint.zone,
            region: allocation.salesPoint.region,
            area: allocation.salesPoint.area,
            subArea: allocation.salesPoint.subArea,
          },
          allocatedQuantity: allocation.allocatedQuantity,
          previouslyShippedQuantity: input.previouslyShippedQuantity,
          outstandingBeforeBatchQuantity: lineCheck.outstanding,
          shippedQuantity: itemDto.shippedQuantity,
          verifiedReceivedQuantity: 0,
          outstandingAfterBatchQuantity: lineCheck.outstanding - itemDto.shippedQuantity,
          varianceQuantity: 0,
          status: "DRAFT",
          podStatus: "NOT_STARTED",
          packageCount: itemDto.packageCount,
          labelIds: [],
          remarks: itemDto.remarks,
        } satisfies ShipmentBatchItem;
      });

      const destinationSnapshots: ShipmentDestinationSnapshot[] = [
        ...new Set(items.map((item) => item.salesPoint.salesPointId)),
      ].map((salesPointId) => {
        const master = getSalesPointById(salesPointId);
        if (!master) {
          throw validationError(`Sales Point ${salesPointId} not found in master data.`);
        }
        return {
          salesPointId: master.id,
          salesPointCode: master.code,
          wCode: master.wCode,
          salesPointName: master.name,
          clientId: master.clientId,
          clientName: master.clientName,
          companyName: master.companyName,
          zone: master.geography.zone,
          region: master.geography.region,
          area: master.geography.area,
          subArea: master.geography.subArea,
          address: master.address.fullAddress,
          deliveryInstructions: master.deliveryInstructions,
          contacts: master.contacts.map((contact) => ({
            contactId: contact.id,
            name: contact.name,
            role: contact.role,
            phone: contact.phone,
            email: contact.email,
            isPrimary: contact.isPrimary,
          })),
          snapshotVersion: master.version,
          capturedAt: now,
        };
      });

      const batch: ShipmentBatch = withSummary({
        id: batchId,
        batchNumber,
        orderRequestId: order.id,
        orderRequestNumber: order.orderRequestNumber,
        clientPoNumber: order.clientPoNumber,
        client: order.client,
        project: order.project,
        vendor: order.vendor,
        status: "DRAFT",
        labelStatus: "NOT_GENERATED",
        podStatus: "NOT_STARTED",
        plannedDispatchDate: dto.plannedDispatchDate,
        senderSnapshot: { name: order.vendor.name, address: "" },
        destinationSnapshots,
        items,
        quantitySummary: buildBatchQuantitySummary(items),
        exceptionSummary: { hasException: false, exceptionCount: 0, unresolvedReasons: [] },
        carrier: dto.carrier,
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      });

      // HI-13 — reserve ready quantity transactionally with the batch.
      const reservations: ShipmentReservation[] = [];
      for (const item of items) {
        const input = allocationInputs.get(item.salesPointAllocationId);
        if (input?.productionJobId) {
          reservations.push({
            id: newId("resv"),
            shipmentBatchId: batchId,
            productionJobId: input.productionJobId,
            orderItemId: item.orderItemId,
            salesPointAllocationId: item.salesPointAllocationId,
            quantity: item.shippedQuantity,
            status: "ACTIVE",
            createdAt: now,
          });
        }
      }
      if (reservations.length > 0) {
        reservationStore.replaceAll([...reservations, ...reservationStore.getAll()]);
      }

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        newValue: { batchNumber, itemCount: items.length },
      });
      context.domainEvent({
        eventType: "SHIPMENT_BATCH_CREATED",
        aggregateType: "SHIPMENT_BATCH",
        aggregateId: batch.id,
        payload: { orderRequestId: order.id, batchNumber },
      });
      context.sideEffect({
        type: "CREATED",
        entityType: "SHIPMENT_BATCH",
        entityId: batch.id,
        description: `Shipment batch ${batchNumber} created with ${items.length} line(s).`,
      });

      store.upsert(batch);
      return batch;
    },
  });
}

export function updateShipmentBatchDraft(
  dto: UpdateShipmentBatchDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(dto.shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", dto.shipmentBatchId);
      assertVersion(batch, dto.expectedVersion, "SHIPMENT_BATCH");
      assertVendorScope(batch, command);
      if (batch.status !== "DRAFT" && batch.status !== "READY") {
        throw invalidTransitionError("Dispatched batch quantities cannot be edited without Admin correction.");
      }

      const itemUpdates = new Map((dto.items ?? []).map((item) => [item.id, item]));
      const items = batch.items.map((item) => {
        const update = itemUpdates.get(item.id);
        if (!update) return item;
        const shipped = update.shippedQuantity ?? item.shippedQuantity;
        if (shipped <= 0) throw validationError("Batch quantity must be greater than zero.");
        if (shipped > item.outstandingBeforeBatchQuantity) {
          throw validationError(
            `Batch quantity ${shipped} exceeds outstanding allocation quantity ${item.outstandingBeforeBatchQuantity}.`,
          );
        }
        return {
          ...item,
          shippedQuantity: shipped,
          outstandingAfterBatchQuantity: item.outstandingBeforeBatchQuantity - shipped,
          packageCount: update.packageCount === null ? undefined : update.packageCount ?? item.packageCount,
          remarks: update.remarks === null ? undefined : update.remarks ?? item.remarks,
        };
      });

      const next = withSummary({
        ...batch,
        plannedDispatchDate:
          dto.plannedDispatchDate === null ? undefined : dto.plannedDispatchDate ?? batch.plannedDispatchDate,
        carrier: dto.carrier === null ? undefined : dto.carrier ?? batch.carrier,
        items,
        audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: batch.version + 1,
      });

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: { version: batch.version },
        newValue: { version: next.version },
      });

      store.upsert(next);
      return next;
    },
  });
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

function transition(
  batch: ShipmentBatch,
  to: ShipmentBatchStatus,
  command: CommandMetadata,
  patch: Partial<ShipmentBatch> = {},
): ShipmentBatch {
  if (!ALLOWED_TRANSITIONS[batch.status].includes(to)) {
    throw invalidTransitionError(`Transition ${batch.status} -> ${to} is not allowed for batch ${batch.id}.`);
  }
  return withSummary({
    ...batch,
    ...patch,
    status: to,
    audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
    version: batch.version + 1,
  });
}

export function markShipmentBatchReady(
  dto: MarkShipmentBatchReadyDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(dto.shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", dto.shipmentBatchId);
      assertVersion(batch, dto.expectedVersion, "SHIPMENT_BATCH");
      assertVendorScope(batch, command);
      if (batch.items.length === 0) throw validationError("Batch has no shipment items.");

      const next = transition(batch, "READY", command, {
        items: batch.items.map((item) => ({ ...item, status: "READY" as const })),
      });

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: batch.status,
        newValue: "READY",
      });

      store.upsert(next);
      return next;
    },
  });
}

export function dispatchShipmentBatch(
  dto: DispatchShipmentBatchDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(dto.shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", dto.shipmentBatchId);
      assertVersion(batch, dto.expectedVersion, "SHIPMENT_BATCH");
      assertVendorScope(batch, command);
      if (batch.items.length === 0) throw validationError("Dispatch requires at least one shipment item.");

      const policy = resolveWorkflowPolicy({
        clientId: batch.client.id,
        projectId: batch.project.id,
        vendorId: batch.vendor.id,
      });
      if (policy.shipmentRules.requireDeliveryNoteBeforeDispatch && !batch.deliveryNoteId) {
        throw policyBlockedError("A Delivery Note must be generated before dispatch.");
      }
      if (policy.shipmentRules.requireLabelsBeforeDispatch && batch.labelStatus === "NOT_GENERATED") {
        throw policyBlockedError("Shipping labels must be generated before dispatch.");
      }
      if (policy.shipmentRules.blockDispatchForMissingAddress) {
        const missing = batch.destinationSnapshots.filter((destination) => !destination.address);
        if (missing.length > 0) {
          throw policyBlockedError(
            `Dispatch blocked: missing address for ${missing.map((destination) => destination.salesPointName).join(", ")}.`,
          );
        }
      }

      const next = transition(batch, "DISPATCHED", command, {
        dispatchedAt: dto.dispatchedAt,
        carrier: dto.carrier ?? batch.carrier,
        items: batch.items.map((item) => ({ ...item, status: "SHIPPED" as const, podStatus: "PENDING_UPLOAD" as const })),
        podStatus: "PENDING_UPLOAD",
      });

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: batch.status,
        newValue: "DISPATCHED",
      });
      context.domainEvent({
        eventType: "SHIPMENT_BATCH_DISPATCHED",
        aggregateType: "SHIPMENT_BATCH",
        aggregateId: batch.id,
        payload: { dispatchedAt: dto.dispatchedAt },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function recordFailedDelivery(
  dto: RecordFailedDeliveryDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return simpleTransition(dto.shipmentBatchId, dto.expectedVersion, "FAILED_DELIVERY", dto.reason, command, {
    failureReason: dto.reason,
  });
}

export function recordReturn(dto: RecordReturnDto, command: CommandMetadata): MutationResponse<ShipmentBatch> {
  return simpleTransition(dto.shipmentBatchId, dto.expectedVersion, "RETURNED", dto.reason, command, {
    failureReason: dto.reason,
  });
}

export function cancelShipmentBatch(
  dto: CancelShipmentBatchDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  const response = simpleTransition(dto.shipmentBatchId, dto.expectedVersion, "CANCELLED", dto.reason, command, {
    cancellationReason: dto.reason,
  });
  releaseReservations(dto.shipmentBatchId);
  return response;
}

export function voidShipmentBatch(dto: VoidShipmentBatchDto, command: CommandMetadata): MutationResponse<ShipmentBatch> {
  if (command.actorRole !== "ADMIN") {
    throw permissionDeniedError("shipments:dispatch", "Only Admin can void a shipment batch.");
  }
  const response = simpleTransition(dto.shipmentBatchId, dto.expectedVersion, "VOIDED", dto.reason, command, {
    cancellationReason: dto.reason,
  });
  releaseReservations(dto.shipmentBatchId);
  return response;
}

export function closeShipmentBatch(
  dto: CloseShipmentBatchDto,
  hasOpenBlockingException: boolean,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(dto.shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", dto.shipmentBatchId);
      assertVersion(batch, dto.expectedVersion, "SHIPMENT_BATCH");
      if (command.actorRole !== "ADMIN") {
        throw permissionDeniedError("shipments:dispatch", "Only Admin can close a shipment batch.");
      }
      if (hasOpenBlockingException && !dto.closureReason) {
        throw policyBlockedError(
          "Batch closure is blocked by an open blocking exception; resolve it or record a waiver reason.",
        );
      }

      const next = transition(batch, "CLOSED", command, {
        closedAt: dto.closedAt,
        closedByUserId: command.actorUserId,
        closureReason: dto.closureReason,
      });

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: batch.status,
        newValue: "CLOSED",
        reason: dto.closureReason,
      });

      consumeReservations(batch.id);
      store.upsert(next);
      return next;
    },
  });
}

export function reopenShipmentBatch(
  dto: ReopenShipmentBatchDto,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(dto.shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", dto.shipmentBatchId);
      assertVersion(batch, dto.expectedVersion, "SHIPMENT_BATCH");
      if (command.actorRole !== "ADMIN") {
        throw permissionDeniedError("shipments:dispatch", "Only Admin can reopen a closed batch.");
      }
      if (batch.status !== "CLOSED") throw invalidTransitionError("Only closed batches can be reopened.");
      if (!dto.reason) throw validationError("Reopen reason is required.");

      const priorStatus: ShipmentBatchStatus =
        batch.quantitySummary.verifiedReceivedQuantity >= batch.quantitySummary.shippedQuantity
          ? "FULLY_RECEIVED"
          : batch.quantitySummary.verifiedReceivedQuantity > 0
            ? "PARTIALLY_RECEIVED"
            : "DISPATCHED";

      const next = withSummary({
        ...batch,
        status: priorStatus,
        closedAt: undefined,
        closedByUserId: undefined,
        closureReason: undefined,
        audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: batch.version + 1,
      });

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: "CLOSED",
        newValue: priorStatus,
        reason: dto.reason,
      });

      store.upsert(next);
      return next;
    },
  });
}

function simpleTransition(
  batchId: ID,
  expectedVersion: number,
  to: ShipmentBatchStatus,
  reason: string,
  command: CommandMetadata,
  patch: Partial<ShipmentBatch> = {},
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(batchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", batchId);
      assertVersion(batch, expectedVersion, "SHIPMENT_BATCH");
      assertVendorScope(batch, command);
      if (!reason) throw validationError(`A reason is required to mark a batch ${to}.`);

      const next = transition(batch, to, command, patch);

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: batch.status,
        newValue: to,
        reason,
      });

      store.upsert(next);
      return next;
    },
  });
}

// ---------------------------------------------------------------------------
// POD application and document references (called by workflows only)
// ---------------------------------------------------------------------------

export interface VerifiedQuantityApplication {
  shipmentBatchItemId: ID;
  newVerifiedReceivedQuantity: number;
}

/** Applies Admin-verified received quantities (idempotent set-based update). */
export function applyVerifiedQuantities(
  shipmentBatchId: ID,
  applications: VerifiedQuantityApplication[],
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", shipmentBatchId);

      const applicationById = new Map(applications.map((entry) => [entry.shipmentBatchItemId, entry]));
      const items = batch.items.map((item) => {
        const application = applicationById.get(item.id);
        if (!application) return item;
        const verified = application.newVerifiedReceivedQuantity;
        return {
          ...item,
          verifiedReceivedQuantity: verified,
          varianceQuantity: verified - item.shippedQuantity,
          status:
            verified >= item.shippedQuantity && item.shippedQuantity > 0
              ? ("FULLY_RECEIVED" as const)
              : verified > 0
                ? verified < item.shippedQuantity
                  ? ("VARIANCE" as const)
                  : ("PARTIALLY_RECEIVED" as const)
                : item.status,
          podStatus: verified === item.shippedQuantity ? ("VERIFIED" as const) : ("VARIANCE" as const),
        };
      });

      const summary = buildBatchQuantitySummary(items);
      const allReceived = items.every(
        (item) => item.shippedQuantity > 0 && item.verifiedReceivedQuantity >= item.shippedQuantity,
      );
      const someReceived = items.some((item) => item.verifiedReceivedQuantity > 0);
      const nextStatus: ShipmentBatchStatus =
        batch.status === "CLOSED"
          ? "CLOSED"
          : allReceived
            ? "FULLY_RECEIVED"
            : someReceived
              ? "PARTIALLY_RECEIVED"
              : batch.status;

      const next: ShipmentBatch = {
        ...batch,
        items,
        quantitySummary: summary,
        status: nextStatus,
        receivedAt: someReceived ? batch.receivedAt ?? nowIso() : batch.receivedAt,
        podStatus: allReceived ? "VERIFIED" : someReceived ? "PARTIALLY_VERIFIED" : batch.podStatus,
        audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: batch.version + 1,
      };

      context.audit({
        eventType: "QUANTITY_ADJUSTED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        previousValue: batch.quantitySummary.verifiedReceivedQuantity,
        newValue: summary.verifiedReceivedQuantity,
      });

      store.upsert(next);
      return next;
    },
  });
}

/** Links the batch to its active Delivery Note (called by the DN workflow). */
export function setBatchDeliveryNote(
  shipmentBatchId: ID,
  reference: { deliveryNoteId?: ID; deliveryNoteNumber?: string; deliveryNoteStatus?: ShipmentBatch["deliveryNoteStatus"] },
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", shipmentBatchId);

      const next: ShipmentBatch = {
        ...batch,
        deliveryNoteId: reference.deliveryNoteId,
        deliveryNoteNumber: reference.deliveryNoteNumber,
        deliveryNoteStatus: reference.deliveryNoteStatus,
        audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: batch.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        newValue: { deliveryNoteId: reference.deliveryNoteId, deliveryNoteStatus: reference.deliveryNoteStatus },
      });

      store.upsert(next);
      return next;
    },
  });
}

/** Updates label projection state on the batch (called by the label workflow). */
export function setBatchLabelStatus(
  shipmentBatchId: ID,
  labelStatus: ShipmentBatch["labelStatus"],
  labelIdsByItem: Map<ID, ID[]>,
  command: CommandMetadata,
): MutationResponse<ShipmentBatch> {
  return runCommand({
    command,
    execute: (context) => {
      const batch = store.getById(shipmentBatchId);
      if (!batch) throw notFoundError("SHIPMENT_BATCH", shipmentBatchId);

      const next: ShipmentBatch = {
        ...batch,
        labelStatus,
        items: batch.items.map((item) => ({
          ...item,
          labelIds: labelIdsByItem.get(item.id) ?? item.labelIds,
        })),
        audit: { ...batch.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: batch.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SHIPMENT_BATCH",
        sourceEntityId: batch.id,
        newValue: { labelStatus },
      });

      store.upsert(next);
      return next;
    },
  });
}

function releaseReservations(shipmentBatchId: ID): void {
  reservationStore.replaceAll(
    reservationStore
      .getAll()
      .map((reservation) =>
        reservation.shipmentBatchId === shipmentBatchId && reservation.status === "ACTIVE"
          ? { ...reservation, status: "RELEASED" as const, releasedAt: nowIso() }
          : reservation,
      ),
  );
}

function consumeReservations(shipmentBatchId: ID): void {
  reservationStore.replaceAll(
    reservationStore
      .getAll()
      .map((reservation) =>
        reservation.shipmentBatchId === shipmentBatchId && reservation.status === "ACTIVE"
          ? { ...reservation, status: "CONSUMED" as const }
          : reservation,
      ),
  );
}
