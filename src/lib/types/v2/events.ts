/**
 * P1-08 — Append-only audit and domain events (CR-02).
 * Source: docs/api-contracts/shared-foundation-api.md §5.
 */

import type { EntityType, ID, ISODateTimeString, UserRole } from "./foundation";

export type AuditEventType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "QUANTITY_ADJUSTED"
  | "FILE_UPLOADED"
  | "PRINTED"
  | "VOIDED"
  | "REGENERATED"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUESTED"
  | "EXCEPTION_OPENED"
  | "EXCEPTION_RESOLVED"
  | "PERMISSION_DENIED"
  | "INTEGRATION_ATTEMPTED";

export type DomainEventType =
  | "ORDER_SUBMITTED"
  | "PRODUCTION_READY_QUANTITY_CHANGED"
  | "ALLOCATION_ADJUSTED"
  | "SHIPMENT_BATCH_CREATED"
  | "SHIPMENT_BATCH_DISPATCHED"
  | "DELIVERY_NOTE_GENERATED"
  | "SHIPPING_LABEL_PRINTED"
  | "POD_SUBMITTED"
  | "POD_VERIFICATION_APPLIED"
  | "POD_VERIFICATION_REVERSED"
  | "EXCEPTION_STATE_CHANGED"
  | "PROJECTION_REBUILD_REQUESTED";

export interface AuditEvent {
  id: ID;
  eventType: AuditEventType;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  actorUserId: ID;
  actorRole: UserRole;
  occurredAt: ISODateTimeString;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  sourceScreen?: string;
  correlationId?: string;
  domainEventId?: ID;
}

export interface DomainEvent {
  id: ID;
  eventType: DomainEventType;
  aggregateType: EntityType;
  aggregateId: ID;
  occurredAt: ISODateTimeString;
  payload: unknown;
  idempotencyKey?: string;
  correlationId?: string;
  projectionVersion?: number;
}
