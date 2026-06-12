/**
 * P1-16 — Operational Exception store (CR-01).
 * Storage key: `va-trace-v2-exceptions`.
 *
 * Closure blockers: HIGH/CRITICAL exceptions are blocking; batch closure and
 * order completion must check `getOpenBlockingExceptionsFor`.
 */

import type {
  CreateOperationalExceptionDto,
  OperationalException,
  ReopenOperationalExceptionDto,
  ResolveOperationalExceptionDto,
} from "@/lib/types/v2/exception";
import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";

const store = createCollectionStore<OperationalException>({
  storageKey: "va-trace-v2-exceptions",
  entityType: "OPERATIONAL_EXCEPTION",
});

const OPEN_STATUSES = ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"] as const;

let exceptionSequence = 0;

export function useOperationalExceptions(): OperationalException[] {
  return store.useAll();
}

export function getOperationalExceptions(): OperationalException[] {
  return store.getAll();
}

export function getOpenExceptionsFor(entityId: ID): OperationalException[] {
  return store
    .getAll()
    .filter(
      (exception) =>
        (OPEN_STATUSES as readonly string[]).includes(exception.status) &&
        (exception.sourceEntityId === entityId ||
          exception.affectedEntityRefs.some((ref) => ref.entityId === entityId)),
    );
}

export function getOpenBlockingExceptionsFor(entityId: ID): OperationalException[] {
  return getOpenExceptionsFor(entityId).filter((exception) => exception.blocking);
}

export function openException(
  dto: CreateOperationalExceptionDto,
  command: CommandMetadata,
): MutationResponse<OperationalException> {
  return runCommand({
    command,
    execute: (context) => {
      if (!dto.title || !dto.description) {
        throw validationError("Exception title and description are required.");
      }

      exceptionSequence += 1;
      const now = nowIso();
      const exception: OperationalException = {
        id: newId("exc"),
        exceptionNumber: `EXC-${now.slice(0, 10).replace(/-/g, "")}-${String(
          store.getAll().length + exceptionSequence,
        ).padStart(4, "0")}`,
        type: dto.type,
        severity: dto.severity,
        status: "OPEN",
        ownerRole: dto.ownerRole,
        sourceEntityType: dto.sourceEntityType,
        sourceEntityId: dto.sourceEntityId,
        affectedEntityRefs: dto.affectedEntityRefs ?? [],
        title: dto.title,
        description: dto.description,
        blocking: dto.severity === "HIGH" || dto.severity === "CRITICAL",
        dueAt: dto.dueAt,
        auditEventIds: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const auditId = context.audit({
        eventType: "EXCEPTION_OPENED",
        sourceEntityType: dto.sourceEntityType,
        sourceEntityId: dto.sourceEntityId,
        newValue: { exceptionId: exception.id, type: dto.type, severity: dto.severity },
      });
      context.domainEvent({
        eventType: "EXCEPTION_STATE_CHANGED",
        aggregateType: "OPERATIONAL_EXCEPTION",
        aggregateId: exception.id,
        payload: { status: "OPEN" },
      });
      context.sideEffect({
        type: "EXCEPTION_OPENED",
        entityType: "OPERATIONAL_EXCEPTION",
        entityId: exception.id,
        description: dto.title,
      });

      const record = { ...exception, auditEventIds: [auditId] };
      store.upsert(record);
      return record;
    },
  });
}

export function resolveException(
  dto: ResolveOperationalExceptionDto,
  command: CommandMetadata,
): MutationResponse<OperationalException> {
  return runCommand({
    command,
    execute: (context) => {
      const exception = store.getById(dto.exceptionId);
      if (!exception) throw notFoundError("OPERATIONAL_EXCEPTION", dto.exceptionId);
      assertVersion(exception, dto.expectedVersion, "OPERATIONAL_EXCEPTION");
      if (!(OPEN_STATUSES as readonly string[]).includes(exception.status)) {
        throw invalidTransitionError(`Exception ${exception.id} is not open.`);
      }
      if (!dto.resolution.reason) {
        throw validationError("Resolution reason is required.");
      }

      const resolved: OperationalException = {
        ...exception,
        status: dto.resolution.resolutionType === "WAIVED_BY_POLICY" ? "WAIVED" : "RESOLVED",
        resolution: dto.resolution,
        resolvedAt: nowIso(),
        resolvedBy: command.actorUserId,
        updatedAt: nowIso(),
        version: exception.version + 1,
      };

      context.audit({
        eventType: "EXCEPTION_RESOLVED",
        sourceEntityType: "OPERATIONAL_EXCEPTION",
        sourceEntityId: exception.id,
        previousValue: exception.status,
        newValue: resolved.status,
        reason: dto.resolution.reason,
      });
      context.domainEvent({
        eventType: "EXCEPTION_STATE_CHANGED",
        aggregateType: "OPERATIONAL_EXCEPTION",
        aggregateId: exception.id,
        payload: { status: resolved.status },
      });
      context.sideEffect({
        type: "EXCEPTION_RESOLVED",
        entityType: "OPERATIONAL_EXCEPTION",
        entityId: exception.id,
        description: dto.resolution.reason,
      });

      store.upsert(resolved);
      return resolved;
    },
  });
}

export function reopenException(
  dto: ReopenOperationalExceptionDto,
  command: CommandMetadata,
): MutationResponse<OperationalException> {
  return runCommand({
    command,
    execute: (context) => {
      const exception = store.getById(dto.exceptionId);
      if (!exception) throw notFoundError("OPERATIONAL_EXCEPTION", dto.exceptionId);
      assertVersion(exception, dto.expectedVersion, "OPERATIONAL_EXCEPTION");
      if (exception.status !== "RESOLVED" && exception.status !== "WAIVED") {
        throw invalidTransitionError(`Exception ${exception.id} cannot be reopened from ${exception.status}.`);
      }
      if (!dto.reason) throw validationError("Reopen reason is required.");

      const reopened: OperationalException = {
        ...exception,
        status: "REOPENED",
        ownerRole: dto.ownerRole,
        resolution: undefined,
        resolvedAt: undefined,
        resolvedBy: undefined,
        updatedAt: nowIso(),
        version: exception.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "OPERATIONAL_EXCEPTION",
        sourceEntityId: exception.id,
        previousValue: exception.status,
        newValue: "REOPENED",
        reason: dto.reason,
      });
      context.domainEvent({
        eventType: "EXCEPTION_STATE_CHANGED",
        aggregateType: "OPERATIONAL_EXCEPTION",
        aggregateId: exception.id,
        payload: { status: "REOPENED" },
      });

      store.upsert(reopened);
      return reopened;
    },
  });
}
