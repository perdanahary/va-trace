/**
 * P1-09 — Repository adapter base for all V2 stores.
 *
 * Responsibilities (docs/execution/01, Batch B1):
 * - collection snapshot reads + `useSyncExternalStore` hooks per aggregate key,
 * - command dispatch wrapping `CommandMetadata`,
 * - `expectedVersion` checks producing contract `ConflictError`s,
 * - `idempotencyKey` dedupe (duplicate command is a no-op returning the
 *   original `MutationResponse`),
 * - audit/domain event append hooks so every mutation emits >= 1 audit event.
 *
 * The localStorage implementation is hidden behind this boundary so a future
 * API-backed repository can replace it without changing pages or stores.
 */

import type { AuditEvent, DomainEvent } from "@/lib/types/v2/events";
import {
  ApiCommandError,
  type ApiError,
  type ApiWarning,
  type CommandMetadata,
  type EntityType,
  type FieldError,
  type ID,
  type MutationResponse,
  type MutationSideEffect,
} from "@/lib/types/v2/foundation";
import {
  appendAuditEvent,
  appendDomainEvent,
  getProjectionVersion,
} from "@/lib/v2/auditEventStore";
import { createLocalRepository, type LocalRepository } from "@/lib/v2/localRepository";

// ---------------------------------------------------------------------------
// Collection store
// ---------------------------------------------------------------------------

export interface CollectionStore<T extends { id: ID }> {
  entityType: EntityType;
  getAll: () => T[];
  useAll: () => T[];
  getById: (id: ID) => T | undefined;
  /** Internal write — only command executors may call this. */
  replaceAll: (next: T[]) => void;
  upsert: (entity: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createCollectionStore<T extends { id: ID }>(options: {
  storageKey: string;
  entityType: EntityType;
  seed?: () => T[];
  migrate?: (persisted: unknown) => T[];
}): CollectionStore<T> {
  const repository: LocalRepository<T[]> = createLocalRepository<T[]>({
    storageKey: options.storageKey,
    seed: options.seed ?? (() => []),
    migrate:
      options.migrate ??
      ((persisted) => (Array.isArray(persisted) ? (persisted as T[]) : options.seed?.() ?? [])),
  });

  return {
    entityType: options.entityType,
    getAll: repository.getSnapshot,
    useAll: repository.useSnapshot,
    getById: (id) => repository.getSnapshot().find((entity) => entity.id === id),
    replaceAll: repository.write,
    upsert: (entity) =>
      repository.update((current) =>
        current.some((existing) => existing.id === entity.id)
          ? current.map((existing) => (existing.id === entity.id ? entity : existing))
          : [entity, ...current],
      ),
    subscribe: repository.subscribe,
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function validationError(message: string, fieldErrors: FieldError[] = []): ApiCommandError {
  return new ApiCommandError({ code: "VALIDATION_FAILED", message, fieldErrors });
}

export function notFoundError(entityType: EntityType, entityId: ID): ApiCommandError {
  return new ApiCommandError({
    code: "NOT_FOUND",
    message: `${entityType} ${entityId} not found.`,
  });
}

export function invalidTransitionError(message: string): ApiCommandError {
  return new ApiCommandError({ code: "INVALID_STATE_TRANSITION", message });
}

export function policyBlockedError(message: string): ApiCommandError {
  return new ApiCommandError({ code: "POLICY_BLOCKED", message });
}

export function permissionDeniedError(action: string, message: string): ApiCommandError {
  return new ApiCommandError({
    code: "PERMISSION_DENIED",
    message,
    permission: { action, reason: "WRONG_ROLE" },
  });
}

export function assertVersion(
  entity: { id: ID; version: number },
  expectedVersion: number,
  entityType: EntityType,
): void {
  if (entity.version !== expectedVersion) {
    throw new ApiCommandError({
      code: "VERSION_CONFLICT",
      message: `${entityType} ${entity.id} version conflict: expected ${expectedVersion}, actual ${entity.version}.`,
      conflict: {
        entityType,
        entityId: entity.id,
        expectedVersion,
        actualVersion: entity.version,
        resolution: "REFETCH",
      },
    });
  }
}

export function isApiError(error: unknown): error is ApiCommandError {
  return error instanceof ApiCommandError;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiCommandError) {
    return error.apiError;
  }
  return { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : String(error) };
}

// ---------------------------------------------------------------------------
// Command execution with audit emission and idempotency dedupe
// ---------------------------------------------------------------------------

export interface CommandContext {
  command: CommandMetadata;
  audit: (event: Omit<AuditEvent, "id" | "occurredAt" | "actorUserId" | "actorRole">) => ID;
  domainEvent: (event: Omit<DomainEvent, "id" | "occurredAt">) => ID;
  sideEffect: (effect: MutationSideEffect) => void;
  warn: (warning: ApiWarning) => void;
}

interface IdempotencyRecord {
  key: string;
  response: MutationResponse<unknown>;
  recordedAt: string;
}

const idempotencyRepository = createLocalRepository<IdempotencyRecord[]>({
  storageKey: "va-trace-v2-idempotency",
  seed: () => [],
});

const IDEMPOTENCY_LIMIT = 300;

/**
 * Executes a mutating command:
 * 1. Replays the stored response when the `idempotencyKey` was already applied.
 * 2. Runs `execute`, collecting audit/domain events and side effects.
 * 3. Returns a contract `MutationResponse` and records it for dedupe.
 */
export function runCommand<T extends { version?: number }>(options: {
  command: CommandMetadata;
  execute: (context: CommandContext) => T;
}): MutationResponse<T> {
  const { command } = options;

  if (command.idempotencyKey) {
    const existing = idempotencyRepository
      .getSnapshot()
      .find((record) => record.key === command.idempotencyKey);
    if (existing) {
      return existing.response as MutationResponse<T>;
    }
  }

  const auditEventIds: ID[] = [];
  const domainEventIds: ID[] = [];
  const sideEffects: MutationSideEffect[] = [];
  const warnings: ApiWarning[] = [];

  const context: CommandContext = {
    command,
    audit: (event) => {
      const id = appendAuditEvent({
        ...event,
        actorUserId: command.actorUserId,
        actorRole: command.actorRole,
        reason: event.reason ?? command.reason,
        sourceScreen: event.sourceScreen ?? command.sourceScreen,
        correlationId: event.correlationId ?? command.correlationId,
      });
      auditEventIds.push(id);
      return id;
    },
    domainEvent: (event) => {
      const id = appendDomainEvent({ ...event, correlationId: event.correlationId ?? command.correlationId });
      domainEventIds.push(id);
      return id;
    },
    sideEffect: (effect) => sideEffects.push(effect),
    warn: (warning) => warnings.push(warning),
  };

  const data = options.execute(context);

  const response: MutationResponse<T> = {
    data,
    version: data.version ?? 1,
    auditEventIds,
    domainEventIds,
    projectionVersion: getProjectionVersion(),
    sideEffects,
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  if (command.idempotencyKey) {
    idempotencyRepository.update((records) =>
      [{ key: command.idempotencyKey, response: response as MutationResponse<unknown>, recordedAt: new Date().toISOString() }, ...records].slice(
        0,
        IDEMPOTENCY_LIMIT,
      ),
    );
  }

  return response;
}
