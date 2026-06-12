/**
 * Canonical V2 status vocabularies.
 *
 * Values match `docs/api-contracts/*` exactly. They are expressed as string-literal
 * unions plus `as const` value lists so existing string-literal comparisons across
 * the UI remain assignable while the value namespace stays iterable for badges,
 * filters, and validation.
 */

export type ProductionStatus =
  | "NEW"
  | "SUBMITTED"
  | "ACCEPTED"
  | "PRINTING"
  | "FINISHING"
  | "QUALITY_CONTROL"
  | "READY_FOR_DISTRIBUTION"
  | "COMPLETED"
  | "CANCELLED";

export const PRODUCTION_STATUSES = [
  "NEW",
  "SUBMITTED",
  "ACCEPTED",
  "PRINTING",
  "FINISHING",
  "QUALITY_CONTROL",
  "READY_FOR_DISTRIBUTION",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly ProductionStatus[];

export type DistributionStatus =
  | "NOT_STARTED"
  | "PARTIALLY_DISTRIBUTED"
  | "FULLY_DISTRIBUTED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "EXCEPTION";

export const DISTRIBUTION_STATUSES = [
  "NOT_STARTED",
  "PARTIALLY_DISTRIBUTED",
  "FULLY_DISTRIBUTED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "EXCEPTION",
] as const satisfies readonly DistributionStatus[];

export type AllocationStatus =
  | "NOT_SHIPPED"
  | "PARTIALLY_SHIPPED"
  | "FULLY_SHIPPED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "EXCEPTION";

export type ShipmentBatchStatus =
  | "DRAFT"
  | "READY"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CLOSED";

export const SHIPMENT_BATCH_STATUSES = [
  "DRAFT",
  "READY",
  "DISPATCHED",
  "IN_TRANSIT",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CLOSED",
] as const satisfies readonly ShipmentBatchStatus[];

export type ShipmentBatchItemStatus =
  | "DRAFT"
  | "READY"
  | "SHIPPED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "VARIANCE"
  | "CANCELLED";

export type DeliveryNoteStatus =
  | "GENERATED"
  | "PRINTED"
  | "SIGNED"
  | "UPLOADED"
  | "VERIFIED"
  | "CLOSED";

export const DELIVERY_NOTE_STATUSES = [
  "GENERATED",
  "PRINTED",
  "SIGNED",
  "UPLOADED",
  "VERIFIED",
  "CLOSED",
] as const satisfies readonly DeliveryNoteStatus[];

export type ShippingLabelStatus = "NOT_GENERATED" | "GENERATED" | "PRINTED" | "VOIDED";

/**
 * Canonical POD verification state (entity contracts + shared foundation, amended).
 */
export type PodStatus =
  | "NOT_REQUIRED"
  | "PENDING_UPLOAD"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUESTED"
  | "VARIANCE";

export const POD_STATUSES = [
  "NOT_REQUIRED",
  "PENDING_UPLOAD",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "CORRECTION_REQUESTED",
  "VARIANCE",
] as const satisfies readonly PodStatus[];

/** Delivery Confirmation document lifecycle (delivery-note-api contract). */
export type DeliveryConfirmationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUESTED"
  | "CANCELLED";

export type ExceptionState = "NONE" | "WARNING" | "BLOCKED" | "RESOLVED";

export type ExceptionSeverity = "INFO" | "WARNING" | "CRITICAL";

export type MasterDataStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "NEEDS_REVIEW";

export type SalesPointDataQualityState =
  | "COMPLETE"
  | "MISSING_CONTACT"
  | "MISSING_ADDRESS"
  | "DELIVERY_INSTRUCTION_MISSING"
  | "REPEATED_ISSUE"
  | "NEEDS_REVIEW";

export type SalesPointContactRole =
  | "ARA"
  | "SRE"
  | "SPV_DPC"
  | "RECEIVER"
  | "LOGISTICS"
  | "CLIENT_PIC"
  | "OTHER";

export type DeadlineState = "UPCOMING" | "DUE_SOON" | "OVERDUE" | "NO_DEADLINE";

export type OrderSource =
  | "ADMIN_CREATE"
  | "OPERATOR_CREATE"
  | "CLIENT_PORTAL"
  | "BULK_IMPORT"
  | "SAP"
  | "COUPA"
  | "LEGACY_MIGRATION";

export type OrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type UnitOfMeasure = "PCS" | "SET" | "BOX" | "ROLL" | "PACK";

export type V2UserRole = "ADMIN" | "OPERATOR" | "ANALYST" | "CLIENT" | "VENDOR";

export type DeliveredItemCondition =
  | "GOOD"
  | "DAMAGED"
  | "MISSING"
  | "PARTIALLY_DAMAGED"
  | "REJECTED";

export type DeliveryVarianceReason =
  | "NO_VARIANCE"
  | "SHORT_SHIPPED"
  | "DAMAGED"
  | "LOST_IN_TRANSIT"
  | "RECEIVER_REJECTED"
  | "OVERAGE"
  | "COUNTING_ERROR"
  | "OTHER";

export type DeliveryConfirmationReviewDecision = "VERIFY" | "REJECT" | "REQUEST_CORRECTION";

// ---------------------------------------------------------------------------
// Legacy compatibility vocabularies (display adapters only — never used for
// V2 calculations; see docs/implementation/01-domain-model-refactor.md)
// ---------------------------------------------------------------------------

export type LegacyOrderStatus =
  | "New"
  | "In Production"
  | "Ready to Ship"
  | "On Delivery"
  | "Delivered"
  | "Completed"
  | "Overdue"
  | "Waiting";

export type LegacyOrderRequestStatus = LegacyOrderStatus | `Partial ${LegacyOrderStatus}`;

/** Legacy persisted POD values that may still exist in `va-trace-orders`. */
export type LegacyPodStatus = "PENDING" | "UPLOADED" | "VERIFIED" | "REJECTED";

/** Maps legacy persisted Delivery Confirmation statuses to the V2 lifecycle. */
export function normalizeDeliveryConfirmationStatus(
  status: string | undefined,
): DeliveryConfirmationStatus {
  switch (status) {
    case "PENDING":
    case "DRAFT":
    case undefined:
      return "DRAFT";
    case "UPLOADED":
    case "SUBMITTED":
      return "SUBMITTED";
    case "VERIFIED":
      return "VERIFIED";
    case "REJECTED":
      return "REJECTED";
    case "CORRECTION_REQUESTED":
      return "CORRECTION_REQUESTED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

/** Maps legacy persisted POD values to the canonical contract `PodStatus`. */
export function normalizePodStatus(status: string | undefined): PodStatus {
  switch (status) {
    case "PENDING":
    case "PENDING_UPLOAD":
    case undefined:
      return "PENDING_UPLOAD";
    case "UPLOADED":
    case "SUBMITTED":
      return "SUBMITTED";
    case "VERIFIED":
      return "VERIFIED";
    case "REJECTED":
      return "REJECTED";
    case "CORRECTION_REQUESTED":
      return "CORRECTION_REQUESTED";
    case "VARIANCE":
      return "VARIANCE";
    case "NOT_REQUIRED":
      return "NOT_REQUIRED";
    default:
      return "PENDING_UPLOAD";
  }
}

