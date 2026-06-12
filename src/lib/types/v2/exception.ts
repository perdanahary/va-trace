/**
 * P1-08 — Operational Exception aggregate (CR-01).
 * Source: docs/api-contracts/shared-foundation-api.md §6.
 */

import type { EntityType, ID, ISODateTimeString, UserRole } from "./foundation";
import type { ExceptionSeverity, OperationalExceptionStatus } from "./status";

export type OperationalExceptionType =
  | "QUANTITY_VARIANCE"
  | "MISSING_ADDRESS"
  | "MISSING_CONTACT"
  | "REJECTED_POD"
  | "MISSING_POD"
  | "FAILED_DELIVERY"
  | "RETURNED_SHIPMENT"
  | "DAMAGED_ITEM"
  | "ORDER_CANCELLATION"
  | "ALLOCATION_CORRECTION"
  | "DOCUMENT_CORRECTION"
  | "INTEGRATION_CONFLICT"
  | "MASTER_DATA_DUPLICATE";

export type ExceptionResolutionType =
  | "FIXED"
  | "ACCEPTED_VARIANCE"
  | "WAIVED_BY_POLICY"
  | "CANCELLED_SOURCE"
  | "DUPLICATE";

export interface ExceptionEntityRef {
  entityType: EntityType;
  entityId: ID;
  lineId?: ID;
}

export interface ExceptionResolution {
  resolutionType: ExceptionResolutionType;
  reason: string;
  waiverPolicyId?: ID;
  billableImpact?: "NONE" | "SHORTAGE" | "OVERAGE" | "DISPUTED";
}

export interface OperationalException {
  id: ID;
  exceptionNumber: string;
  type: OperationalExceptionType;
  severity: ExceptionSeverity;
  status: OperationalExceptionStatus;
  ownerRole: UserRole;
  ownerUserId?: ID;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  affectedEntityRefs: ExceptionEntityRef[];
  title: string;
  description: string;
  /** Severity HIGH/CRITICAL blocks closure/completion until resolved or waived. */
  blocking: boolean;
  dueAt?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
  resolvedBy?: ID;
  resolution?: ExceptionResolution;
  reopenedFromExceptionId?: ID;
  auditEventIds: ID[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  version: number;
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CreateOperationalExceptionDto {
  type: OperationalExceptionType;
  severity: ExceptionSeverity;
  ownerRole: UserRole;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  affectedEntityRefs?: ExceptionEntityRef[];
  title: string;
  description: string;
  dueAt?: ISODateTimeString;
}

export interface ResolveOperationalExceptionDto {
  exceptionId: ID;
  expectedVersion: number;
  resolution: ExceptionResolution;
}

export interface ReopenOperationalExceptionDto {
  exceptionId: ID;
  expectedVersion: number;
  reason: string;
  ownerRole: UserRole;
}
