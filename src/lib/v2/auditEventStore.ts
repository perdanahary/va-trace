/**
 * P1-10 — Append-only audit/domain event store (CR-02).
 * Storage key: `va-trace-v2-events`.
 *
 * Events are append-only: no command may edit or delete a recorded event.
 * The event count doubles as the global projection version so every
 * `MutationResponse.projectionVersion` is monotonic.
 */

import type { AuditEvent, DomainEvent } from "@/lib/types/v2/events";
import type { ID } from "@/lib/types/v2/foundation";
import { newId, nowIso } from "@/lib/v2/ids";
import { createLocalRepository } from "@/lib/v2/localRepository";

interface EventLog {
  auditEvents: AuditEvent[];
  domainEvents: DomainEvent[];
}

const repository = createLocalRepository<EventLog>({
  storageKey: "va-trace-v2-events",
  seed: () => ({ auditEvents: [], domainEvents: [] }),
  migrate: (persisted) => {
    const log = persisted as Partial<EventLog> | null;
    return {
      auditEvents: Array.isArray(log?.auditEvents) ? log.auditEvents : [],
      domainEvents: Array.isArray(log?.domainEvents) ? log.domainEvents : [],
    };
  },
});

type ProjectionListener = (event: DomainEvent) => void;
const projectionListeners = new Set<ProjectionListener>();

/** Register a projection rebuild hook fired on every appended domain event. */
export function onDomainEvent(listener: ProjectionListener): () => void {
  projectionListeners.add(listener);
  return () => projectionListeners.delete(listener);
}

export function appendAuditEvent(event: Omit<AuditEvent, "id" | "occurredAt">): ID {
  const record: AuditEvent = { ...event, id: newId("audit"), occurredAt: nowIso() };
  repository.update((log) => ({ ...log, auditEvents: [...log.auditEvents, record] }));
  return record.id;
}

export function appendDomainEvent(event: Omit<DomainEvent, "id" | "occurredAt">): ID {
  const record: DomainEvent = { ...event, id: newId("domain"), occurredAt: nowIso() };
  repository.update((log) => ({ ...log, domainEvents: [...log.domainEvents, record] }));
  projectionListeners.forEach((listener) => listener(record));
  return record.id;
}

export function getAuditEventsFor(entityId: ID): AuditEvent[] {
  return repository.getSnapshot().auditEvents.filter((event) => event.sourceEntityId === entityId);
}

export function useAuditEvents(): AuditEvent[] {
  return repository.useSnapshot().auditEvents;
}

export function getProjectionVersion(): number {
  const log = repository.getSnapshot();
  return log.auditEvents.length + log.domainEvents.length;
}
