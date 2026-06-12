/**
 * P1-12 — Sales Point Allocation store.
 * Storage key: `va-trace-v2-allocations`.
 *
 * Owns allocation facts (allocated quantity, identity, notes, exception state).
 * Shipped/received/status/podStatus are read projections rebuilt from batch
 * items and verified POD via `hydrateAllocation` (CR-07); the persisted copies
 * are rebuildable caches only.
 *
 * Validation per docs/specs/05 §6:
 * - quantity > 0; sum by product <= ordered (validated by the workflow layer
 *   which passes ordered quantities in),
 * - quantity cannot be reduced below already shipped quantity,
 * - cannot delete after shipment dependency; corrections require a reason.
 */

import type { CommandMetadata, ID, MutationResponse, Quantity } from "@/lib/types/v2/foundation";
import type {
  BulkCreateSalesPointAllocationDto,
  SalesPointAllocation,
  UpdateSalesPointAllocationDto,
} from "@/lib/types/v2/salesPoint";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { validateAllocationTotals } from "@/lib/v2/selectors/quantities";
import { getSalesPointById, toSalesPointReference } from "@/lib/v2/salesPointStore";

const store = createCollectionStore<SalesPointAllocation>({
  storageKey: "va-trace-v2-allocations",
  entityType: "SALES_POINT_ALLOCATION",
  seed: () => buildV2SeedData().allocations,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useAllocations(): SalesPointAllocation[] {
  return store.useAll();
}

export function getAllocations(): SalesPointAllocation[] {
  return store.getAll();
}

export function getAllocationById(id: ID): SalesPointAllocation | undefined {
  return store.getById(id);
}

export function getAllocationsForOrder(orderRequestId: ID): SalesPointAllocation[] {
  return store.getAll().filter((allocation) => allocation.orderRequestId === orderRequestId);
}

/** Internal cache refresh used by the workflow layer after batch/POD commands. */
export function refreshAllocationCaches(updated: SalesPointAllocation[]): void {
  if (updated.length === 0) return;
  const updatedById = new Map(updated.map((allocation) => [allocation.id, allocation]));
  store.replaceAll(store.getAll().map((allocation) => updatedById.get(allocation.id) ?? allocation));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface CreateAllocationsContext {
  /** Ordered quantity per order item ID, used for sum-by-product validation. */
  orderedByItemId: Map<ID, Quantity>;
  /** Products per order item for reference snapshots. */
  productByItemId: Map<ID, SalesPointAllocation["product"]>;
}

export function createAllocations(
  dto: BulkCreateSalesPointAllocationDto,
  orderContext: CreateAllocationsContext,
  command: CommandMetadata,
): MutationResponse<SalesPointAllocation[]> {
  const response = runCommand<{ allocations: SalesPointAllocation[]; version: number }>({
    command,
    execute: (context) => {
      if (dto.allocations.length === 0) {
        throw validationError("At least one allocation is required.");
      }

      for (const entry of dto.allocations) {
        if (!Number.isFinite(entry.allocatedQuantity) || entry.allocatedQuantity <= 0) {
          throw validationError("Allocation quantity must be greater than zero.", [
            { field: "allocatedQuantity", code: "INVALID_QUANTITY", message: "Quantity must be > 0." },
          ]);
        }
      }

      const existing = getAllocationsForOrder(dto.orderRequestId).filter(
        (allocation) => allocation.status !== "CANCELLED",
      );
      const combined = [
        ...existing.map((allocation) => ({
          orderItemId: allocation.orderItemId,
          allocatedQuantity: allocation.allocatedQuantity,
        })),
        ...dto.allocations.map((entry) => ({
          orderItemId: entry.orderItemId,
          allocatedQuantity: entry.allocatedQuantity,
        })),
      ];
      const totals = validateAllocationTotals({ orderedByItemId: orderContext.orderedByItemId, allocations: combined });
      if (!totals.valid) {
        throw validationError("Allocation totals exceed ordered quantities.", [
          ...totals.errors.map((error) => ({
            field: `allocations.${error.orderItemId}`,
            code: "OVER_ALLOCATION",
            message: error.message,
          })),
        ]);
      }

      // Uniqueness: (orderRequestId, orderItemId, salesPointId) active allocation.
      for (const entry of dto.allocations) {
        const duplicate = existing.find(
          (allocation) =>
            allocation.orderItemId === entry.orderItemId && allocation.salesPoint.id === entry.salesPointId,
        );
        if (duplicate) {
          throw validationError(
            `An active allocation already exists for item ${entry.orderItemId} and Sales Point ${entry.salesPointId}.`,
          );
        }
      }

      const now = nowIso();
      const created = dto.allocations.map((entry) => {
        const salesPoint = getSalesPointById(entry.salesPointId);
        if (!salesPoint) {
          throw validationError(`Sales Point ${entry.salesPointId} does not exist. Free-text destinations are invalid.`);
        }
        if (salesPoint.status === "INACTIVE") {
          throw validationError(`Sales Point ${salesPoint.name} is inactive and cannot receive new allocations.`);
        }
        const product = orderContext.productByItemId.get(entry.orderItemId);
        if (!product) {
          throw validationError(`Order item ${entry.orderItemId} does not exist on order ${dto.orderRequestId}.`);
        }

        const allocation: SalesPointAllocation = {
          id: newId("alloc"),
          orderRequestId: dto.orderRequestId,
          orderItemId: entry.orderItemId,
          product,
          salesPoint: toSalesPointReference(salesPoint),
          allocatedQuantity: entry.allocatedQuantity,
          shippedQuantity: 0,
          receivedQuantity: 0,
          outstandingQuantity: entry.allocatedQuantity,
          remainingToReceiveQuantity: entry.allocatedQuantity,
          status: "NOT_SHIPPED",
          podStatus: "NOT_STARTED",
          exceptionState: "NONE",
          batchIds: [],
          underAllocationReason: dto.underAllocationReason,
          notes: entry.notes,
          audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
          version: 1,
        };

        context.audit({
          eventType: "CREATED",
          sourceEntityType: "SALES_POINT_ALLOCATION",
          sourceEntityId: allocation.id,
          newValue: {
            orderRequestId: allocation.orderRequestId,
            salesPointId: allocation.salesPoint.id,
            allocatedQuantity: allocation.allocatedQuantity,
          },
        });
        return allocation;
      });

      store.replaceAll([...created, ...store.getAll()]);
      return { allocations: created, version: 1 };
    },
  });

  return { ...response, data: response.data.allocations };
}

export function adjustAllocation(
  dto: UpdateSalesPointAllocationDto,
  command: CommandMetadata,
): MutationResponse<SalesPointAllocation> {
  return runCommand({
    command,
    execute: (context) => {
      const allocation = store.getById(dto.salesPointAllocationId);
      if (!allocation) throw notFoundError("SALES_POINT_ALLOCATION", dto.salesPointAllocationId);
      assertVersion(allocation, dto.expectedVersion, "SALES_POINT_ALLOCATION");
      if (allocation.status === "CANCELLED") {
        throw invalidTransitionError("Cancelled allocations cannot be adjusted.");
      }

      const nextQuantity = dto.allocatedQuantity ?? allocation.allocatedQuantity;
      if (nextQuantity <= 0) {
        throw validationError("Allocation quantity must be greater than zero.");
      }
      if (nextQuantity < allocation.shippedQuantity) {
        throw validationError(
          `Allocation cannot be reduced below already shipped quantity (${allocation.shippedQuantity}).`,
        );
      }
      if (allocation.shippedQuantity > 0 && !dto.correctionReason) {
        throw validationError("A correction reason is required after shipment exists.");
      }

      const next: SalesPointAllocation = {
        ...allocation,
        allocatedQuantity: nextQuantity,
        outstandingQuantity: Math.max(nextQuantity - allocation.shippedQuantity, 0),
        remainingToReceiveQuantity: Math.max(nextQuantity - allocation.receivedQuantity, 0),
        correctionReason: dto.correctionReason ?? allocation.correctionReason,
        notes: dto.notes === null ? undefined : dto.notes ?? allocation.notes,
        audit: { ...allocation.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: allocation.version + 1,
      };

      context.audit({
        eventType: "QUANTITY_ADJUSTED",
        sourceEntityType: "SALES_POINT_ALLOCATION",
        sourceEntityId: allocation.id,
        previousValue: allocation.allocatedQuantity,
        newValue: nextQuantity,
        reason: dto.correctionReason,
      });
      context.domainEvent({
        eventType: "ALLOCATION_ADJUSTED",
        aggregateType: "SALES_POINT_ALLOCATION",
        aggregateId: allocation.id,
        payload: { allocatedQuantity: nextQuantity },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function approveAllocation(
  allocationId: ID,
  approvalReason: string,
  expectedVersion: number,
  command: CommandMetadata,
): MutationResponse<SalesPointAllocation> {
  return runCommand({
    command,
    execute: (context) => {
      const allocation = store.getById(allocationId);
      if (!allocation) throw notFoundError("SALES_POINT_ALLOCATION", allocationId);
      assertVersion(allocation, expectedVersion, "SALES_POINT_ALLOCATION");
      if (!approvalReason.trim()) throw validationError("Approval reason is required.");
      if (allocation.status === "CANCELLED") {
        throw invalidTransitionError("Cancelled allocations cannot be approved.");
      }

      const next: SalesPointAllocation = {
        ...allocation,
        exceptionState: allocation.exceptionState === "BLOCKED" ? "NONE" : allocation.exceptionState,
        notes: [allocation.notes, `Approved: ${approvalReason.trim()}`].filter(Boolean).join("\n"),
        audit: { ...allocation.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: allocation.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SALES_POINT_ALLOCATION",
        sourceEntityId: allocation.id,
        reason: approvalReason,
        newValue: { approved: true },
      });
      context.domainEvent({
        eventType: "ALLOCATION_ADJUSTED",
        aggregateType: "SALES_POINT_ALLOCATION",
        aggregateId: allocation.id,
        payload: { approved: true, approvalReason },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function cancelAllocation(
  allocationId: ID,
  reason: string,
  expectedVersion: number,
  command: CommandMetadata,
): MutationResponse<SalesPointAllocation> {
  return runCommand({
    command,
    execute: (context) => {
      const allocation = store.getById(allocationId);
      if (!allocation) throw notFoundError("SALES_POINT_ALLOCATION", allocationId);
      assertVersion(allocation, expectedVersion, "SALES_POINT_ALLOCATION");
      if (allocation.shippedQuantity > 0) {
        throw invalidTransitionError(
          "Allocations with shipped quantity cannot be cancelled; use an audited correction instead.",
        );
      }
      if (!reason) throw validationError("Cancellation reason is required.");

      const next: SalesPointAllocation = {
        ...allocation,
        status: "CANCELLED",
        audit: { ...allocation.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: allocation.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SALES_POINT_ALLOCATION",
        sourceEntityId: allocation.id,
        previousValue: allocation.status,
        newValue: "CANCELLED",
        reason,
      });

      store.upsert(next);
      return next;
    },
  });
}

export function setAllocationExceptionState(
  allocationId: ID,
  exceptionState: SalesPointAllocation["exceptionState"],
  command: CommandMetadata,
): MutationResponse<SalesPointAllocation> {
  return runCommand({
    command,
    execute: (context) => {
      const allocation = store.getById(allocationId);
      if (!allocation) throw notFoundError("SALES_POINT_ALLOCATION", allocationId);

      const next: SalesPointAllocation = {
        ...allocation,
        exceptionState,
        audit: { ...allocation.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: allocation.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "SALES_POINT_ALLOCATION",
        sourceEntityId: allocation.id,
        previousValue: allocation.exceptionState,
        newValue: exceptionState,
      });

      store.upsert(next);
      return next;
    },
  });
}
