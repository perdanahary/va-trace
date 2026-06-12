/**
 * P1-13 — Production Job store (HI-01).
 * Storage key: `va-trace-v2-production`.
 *
 * Owns `ProductionJob`. Transition guards follow
 * docs/api-contracts/production-job-api.md §5. Ready quantity feeds shipment
 * batch eligibility; reservations adjust `reservedForShipmentQuantity`.
 */

import type { CommandMetadata, ID, MutationResponse, Quantity } from "@/lib/types/v2/foundation";
import type {
  AcceptProductionJobDto,
  CancelProductionJobDto,
  CreateProductionJobDto,
  MarkProductionReadyDto,
  ProductionJob,
  ReopenProductionJobDto,
  UpdateProductionProgressDto,
} from "@/lib/types/v2/production";
import type { ProductionStatus } from "@/lib/types/v2/status";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  permissionDeniedError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { unreservedReadyQuantity } from "@/lib/v2/selectors/quantities";

const store = createCollectionStore<ProductionJob>({
  storageKey: "va-trace-v2-production",
  entityType: "PRODUCTION_JOB",
  seed: () => buildV2SeedData().productionJobs,
});

const ALLOWED_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  NEW: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "CANCELLED", "EXCEPTION"],
  ACCEPTED: ["PRINTING", "CANCELLED", "EXCEPTION"],
  PRINTING: ["FINISHING", "QUALITY_CONTROL", "CANCELLED", "EXCEPTION"],
  FINISHING: ["QUALITY_CONTROL", "CANCELLED", "EXCEPTION"],
  QUALITY_CONTROL: ["READY_FOR_DISTRIBUTION", "PRINTING", "FINISHING", "CANCELLED", "EXCEPTION"],
  READY_FOR_DISTRIBUTION: ["COMPLETED", "QUALITY_CONTROL", "CANCELLED", "EXCEPTION"],
  COMPLETED: [],
  CANCELLED: [],
  EXCEPTION: ["PRINTING", "FINISHING", "QUALITY_CONTROL", "READY_FOR_DISTRIBUTION", "CANCELLED"],
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useProductionJobs(): ProductionJob[] {
  return store.useAll();
}

export function getProductionJobs(): ProductionJob[] {
  return store.getAll();
}

export function getProductionJobById(id: ID): ProductionJob | undefined {
  return store.getById(id);
}

export function getProductionJobsForOrder(orderRequestId: ID): ProductionJob[] {
  return store.getAll().filter((job) => job.orderRequestId === orderRequestId);
}

/** Ready quantity still unreserved for one order item (HI-13 readiness pool). */
export function getUnreservedReadyQuantity(orderItemId: ID): Quantity {
  return store
    .getAll()
    .filter((job) => job.orderItemId === orderItemId && job.status !== "CANCELLED")
    .reduce((total, job) => total + unreservedReadyQuantity(job.readyQuantity, job.reservedForShipmentQuantity), 0);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function assertVendorScope(job: ProductionJob, command: CommandMetadata): void {
  if (command.actorRole === "VENDOR" && job.vendorId !== commandVendorId(command)) {
    throw permissionDeniedError("production:update", "Vendor can update only assigned production jobs.");
  }
}

/** Vendor scope travels in correlationId as `vendor:<id>` for mock auth. */
function commandVendorId(command: CommandMetadata): ID | undefined {
  const match = command.correlationId?.match(/^vendor:(.+)$/);
  return match?.[1];
}

export function createProductionJobs(
  dtos: CreateProductionJobDto[],
  command: CommandMetadata,
): MutationResponse<ProductionJob[]> {
  const response = runCommand<{ jobs: ProductionJob[]; version: number }>({
    command,
    execute: (context) => {
      const now = nowIso();
      const jobs = dtos.map((dto, index) => {
        const job: ProductionJob = {
          id: newId("job"),
          jobNumber: `JOB-${dto.orderRequestId.replace(/^OR-/, "")}-${String(index + 1).padStart(2, "0")}`,
          orderRequestId: dto.orderRequestId,
          orderItemId: dto.orderItemId,
          vendorId: dto.vendorId,
          status: "SUBMITTED",
          orderedQuantity: dto.orderedQuantity,
          producedQuantity: 0,
          qcPassedQuantity: 0,
          readyQuantity: 0,
          reservedForShipmentQuantity: 0,
          completedQuantity: 0,
          reworkQuantity: 0,
          rejectedQuantity: 0,
          assignedUserId: dto.assignedUserId,
          attachmentFileAssetIds: [],
          exceptionIds: [],
          audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
          version: 1,
        };
        context.audit({
          eventType: "CREATED",
          sourceEntityType: "PRODUCTION_JOB",
          sourceEntityId: job.id,
          newValue: { orderRequestId: job.orderRequestId, orderItemId: job.orderItemId },
        });
        return job;
      });

      store.replaceAll([...jobs, ...store.getAll()]);
      return { jobs, version: 1 };
    },
  });

  return { ...response, data: response.data.jobs };
}

export function acceptProductionJob(dto: AcceptProductionJobDto, command: CommandMetadata): MutationResponse<ProductionJob> {
  return runCommand({
    command,
    execute: (context) => {
      const job = store.getById(dto.productionJobId);
      if (!job) throw notFoundError("PRODUCTION_JOB", dto.productionJobId);
      assertVersion(job, dto.expectedVersion, "PRODUCTION_JOB");
      assertVendorScope(job, command);
      if (job.status !== "SUBMITTED") {
        throw invalidTransitionError(`Production job ${job.id} cannot be accepted from ${job.status}.`);
      }

      const next: ProductionJob = {
        ...job,
        status: "ACCEPTED",
        audit: { ...job.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: job.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "PRODUCTION_JOB",
        sourceEntityId: job.id,
        previousValue: "SUBMITTED",
        newValue: "ACCEPTED",
      });

      store.upsert(next);
      return next;
    },
  });
}

export function updateProductionProgress(
  dto: UpdateProductionProgressDto,
  command: CommandMetadata,
): MutationResponse<ProductionJob> {
  return runCommand({
    command,
    execute: (context) => {
      const job = store.getById(dto.productionJobId);
      if (!job) throw notFoundError("PRODUCTION_JOB", dto.productionJobId);
      assertVersion(job, dto.expectedVersion, "PRODUCTION_JOB");
      assertVendorScope(job, command);

      if (dto.status !== job.status && !ALLOWED_TRANSITIONS[job.status].includes(dto.status)) {
        throw invalidTransitionError(`Transition ${job.status} -> ${dto.status} is not allowed.`);
      }

      const producedQuantity = dto.producedQuantity ?? job.producedQuantity;
      const qcPassedQuantity = dto.qcPassedQuantity ?? job.qcPassedQuantity;
      const readyQuantity = dto.readyQuantity ?? job.readyQuantity;
      const completedQuantity = dto.completedQuantity ?? job.completedQuantity;

      for (const [field, value] of Object.entries({ producedQuantity, qcPassedQuantity, readyQuantity, completedQuantity })) {
        if (value < 0) throw validationError(`${field} cannot be negative.`);
      }
      if (completedQuantity > job.orderedQuantity) {
        throw validationError("Completed quantity cannot exceed ordered quantity.");
      }
      if (readyQuantity > job.orderedQuantity) {
        throw validationError("Ready quantity cannot exceed ordered quantity.");
      }
      if (readyQuantity > qcPassedQuantity && command.actorRole !== "ADMIN") {
        throw validationError("Ready quantity cannot exceed QC-passed quantity without an Admin override.");
      }
      if (readyQuantity < job.reservedForShipmentQuantity) {
        throw invalidTransitionError(
          "Ready quantity cannot be reduced below already reserved quantity; resolve through an operational exception.",
        );
      }
      if (dto.status === "READY_FOR_DISTRIBUTION" && readyQuantity <= 0) {
        throw validationError("READY_FOR_DISTRIBUTION requires a ready quantity greater than zero.");
      }

      const next: ProductionJob = {
        ...job,
        status: dto.status,
        producedQuantity,
        qcPassedQuantity,
        readyQuantity,
        completedQuantity,
        reworkQuantity: dto.reworkQuantity ?? job.reworkQuantity,
        rejectedQuantity: dto.rejectedQuantity ?? job.rejectedQuantity,
        startedAt: job.startedAt ?? (dto.status === "PRINTING" ? nowIso() : undefined),
        qcStartedAt: job.qcStartedAt ?? (dto.status === "QUALITY_CONTROL" ? nowIso() : undefined),
        readyAt: job.readyAt ?? (readyQuantity > 0 ? nowIso() : undefined),
        completedAt: dto.status === "COMPLETED" ? nowIso() : job.completedAt,
        notes: dto.notes ?? job.notes,
        attachmentFileAssetIds: dto.attachmentFileAssetIds ?? job.attachmentFileAssetIds,
        audit: { ...job.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: job.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "PRODUCTION_JOB",
        sourceEntityId: job.id,
        previousValue: { status: job.status, readyQuantity: job.readyQuantity },
        newValue: { status: next.status, readyQuantity: next.readyQuantity },
      });
      if (readyQuantity !== job.readyQuantity) {
        context.domainEvent({
          eventType: "PRODUCTION_READY_QUANTITY_CHANGED",
          aggregateType: "PRODUCTION_JOB",
          aggregateId: job.id,
          payload: { readyQuantity },
        });
      }

      store.upsert(next);
      return next;
    },
  });
}

export function markProductionReady(dto: MarkProductionReadyDto, command: CommandMetadata): MutationResponse<ProductionJob> {
  const job = store.getById(dto.productionJobId);
  if (!job) throw notFoundError("PRODUCTION_JOB", dto.productionJobId);
  return updateProductionProgress(
    {
      productionJobId: dto.productionJobId,
      expectedVersion: dto.expectedVersion,
      status: "READY_FOR_DISTRIBUTION",
      producedQuantity: Math.max(job.producedQuantity, dto.readyQuantity),
      qcPassedQuantity: Math.max(job.qcPassedQuantity, dto.readyQuantity),
      readyQuantity: dto.readyQuantity,
    },
    command,
  );
}

export function cancelProductionJob(dto: CancelProductionJobDto, command: CommandMetadata): MutationResponse<ProductionJob> {
  return runCommand({
    command,
    execute: (context) => {
      const job = store.getById(dto.productionJobId);
      if (!job) throw notFoundError("PRODUCTION_JOB", dto.productionJobId);
      assertVersion(job, dto.expectedVersion, "PRODUCTION_JOB");
      if (!dto.cancelReason) throw validationError("Cancellation reason is required.");
      if (job.status === "COMPLETED" || job.status === "CANCELLED") {
        throw invalidTransitionError(`Production job ${job.id} cannot be cancelled from ${job.status}.`);
      }

      const next: ProductionJob = {
        ...job,
        status: "CANCELLED",
        cancelledAt: nowIso(),
        audit: { ...job.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: job.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "PRODUCTION_JOB",
        sourceEntityId: job.id,
        previousValue: job.status,
        newValue: "CANCELLED",
        reason: dto.cancelReason,
      });

      store.upsert(next);
      return next;
    },
  });
}

export function reopenProductionJob(dto: ReopenProductionJobDto, command: CommandMetadata): MutationResponse<ProductionJob> {
  return runCommand({
    command,
    execute: (context) => {
      const job = store.getById(dto.productionJobId);
      if (!job) throw notFoundError("PRODUCTION_JOB", dto.productionJobId);
      assertVersion(job, dto.expectedVersion, "PRODUCTION_JOB");
      if (command.actorRole !== "ADMIN") {
        throw permissionDeniedError("production:update", "Only Admin can reopen production jobs.");
      }
      if (job.status !== "COMPLETED" && job.status !== "CANCELLED") {
        throw invalidTransitionError(`Production job ${job.id} is not in a terminal state.`);
      }
      if (!dto.reopenReason) throw validationError("Reopen reason is required.");

      const next: ProductionJob = {
        ...job,
        status: "READY_FOR_DISTRIBUTION",
        cancelledAt: undefined,
        audit: { ...job.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: job.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "PRODUCTION_JOB",
        sourceEntityId: job.id,
        previousValue: job.status,
        newValue: next.status,
        reason: dto.reopenReason,
      });

      store.upsert(next);
      return next;
    },
  });
}

/** Adjusts the reserved-for-shipment counter (called by the batch workflow). */
export function adjustReservedQuantity(
  productionJobId: ID,
  deltaQuantity: Quantity,
  command: CommandMetadata,
): MutationResponse<ProductionJob> {
  return runCommand({
    command,
    execute: (context) => {
      const job = store.getById(productionJobId);
      if (!job) throw notFoundError("PRODUCTION_JOB", productionJobId);

      const reserved = job.reservedForShipmentQuantity + deltaQuantity;
      if (reserved < 0) throw validationError("Reserved quantity cannot become negative.");
      if (reserved > job.readyQuantity) {
        throw invalidTransitionError(
          `Cannot reserve ${reserved} of ${job.readyQuantity} ready units for job ${job.id}.`,
        );
      }

      const next: ProductionJob = {
        ...job,
        reservedForShipmentQuantity: reserved,
        audit: { ...job.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: job.version + 1,
      };

      context.audit({
        eventType: "QUANTITY_ADJUSTED",
        sourceEntityType: "PRODUCTION_JOB",
        sourceEntityId: job.id,
        previousValue: job.reservedForShipmentQuantity,
        newValue: reserved,
      });

      store.upsert(next);
      return next;
    },
  });
}
