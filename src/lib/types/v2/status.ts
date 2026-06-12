/**
 * P1-02 — Canonical V2 status vocabularies.
 * Source: docs/v2-status-lifecycle.md (normative member lists),
 * docs/api-contracts/shared-foundation-api.md (amended), entity contracts.
 *
 * Documented resolutions:
 * - `PodStatus` projection replaces the ambiguous `PENDING` member with the
 *   entity-contract pair `PENDING_UPLOAD` / `SUBMITTED` (see shared-foundation
 *   amendment note and docs/execution/02 removal table).
 * - `ExceptionSeverity` (LOW..CRITICAL) is the OperationalException severity;
 *   `AlertSeverity` (INFO/WARNING/CRITICAL) is the display-summary severity used
 *   by entity contract view models. Both exist because the contracts use both.
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
  | "CANCELLED"
  | "EXCEPTION";

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
  "EXCEPTION",
] as const satisfies readonly ProductionStatus[];

export type DistributionStatus =
  | "NOT_STARTED"
  | "PARTIALLY_DISTRIBUTED"
  | "FULLY_DISTRIBUTED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED"
  | "EXCEPTION";

export const DISTRIBUTION_STATUSES = [
  "NOT_STARTED",
  "PARTIALLY_DISTRIBUTED",
  "FULLY_DISTRIBUTED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CANCELLED",
  "EXCEPTION",
] as const satisfies readonly DistributionStatus[];

export type ShipmentBatchStatus =
  | "DRAFT"
  | "READY"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "EXCEPTION"
  | "CLOSED"
  | "CANCELLED"
  | "VOIDED";

export const SHIPMENT_BATCH_STATUSES = [
  "DRAFT",
  "READY",
  "DISPATCHED",
  "IN_TRANSIT",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "FAILED_DELIVERY",
  "RETURNED",
  "EXCEPTION",
  "CLOSED",
  "CANCELLED",
  "VOIDED",
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
  | "CLOSED"
  | "SUPERSEDED"
  | "REGENERATED"
  | "VOIDED";

export const DELIVERY_NOTE_STATUSES = [
  "GENERATED",
  "PRINTED",
  "SIGNED",
  "UPLOADED",
  "VERIFIED",
  "CLOSED",
  "SUPERSEDED",
  "REGENERATED",
  "VOIDED",
] as const satisfies readonly DeliveryNoteStatus[];

export type AllocationStatus =
  | "NOT_SHIPPED"
  | "PARTIALLY_SHIPPED"
  | "FULLY_SHIPPED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "SHORT_RECEIVED"
  | "OVER_RECEIVED"
  | "ADJUSTED"
  | "CANCELLED"
  | "EXCEPTION";

export const ALLOCATION_STATUSES = [
  "NOT_SHIPPED",
  "PARTIALLY_SHIPPED",
  "FULLY_SHIPPED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "SHORT_RECEIVED",
  "OVER_RECEIVED",
  "ADJUSTED",
  "CANCELLED",
  "EXCEPTION",
] as const satisfies readonly AllocationStatus[];

export type DeliveryConfirmationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_VERIFICATION"
  | "PARTIALLY_VERIFIED"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUESTED"
  | "RESUBMITTED"
  | "WITHDRAWN"
  | "SUPERSEDED"
  | "CLOSED";

export const DELIVERY_CONFIRMATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_VERIFICATION",
  "PARTIALLY_VERIFIED",
  "VERIFIED",
  "REJECTED",
  "CORRECTION_REQUESTED",
  "RESUBMITTED",
  "WITHDRAWN",
  "SUPERSEDED",
  "CLOSED",
] as const satisfies readonly DeliveryConfirmationStatus[];

/** POD read projection for lists, dashboards, and badges. */
export type PodStatus =
  | "NOT_REQUIRED"
  | "NOT_STARTED"
  | "DRAFT"
  | "PENDING_UPLOAD"
  | "SUBMITTED"
  | "PARTIALLY_VERIFIED"
  | "VERIFIED"
  | "REJECTED"
  | "CORRECTION_REQUESTED"
  | "VARIANCE"
  | "MISSING";

export const POD_STATUSES = [
  "NOT_REQUIRED",
  "NOT_STARTED",
  "DRAFT",
  "PENDING_UPLOAD",
  "SUBMITTED",
  "PARTIALLY_VERIFIED",
  "VERIFIED",
  "REJECTED",
  "CORRECTION_REQUESTED",
  "VARIANCE",
  "MISSING",
] as const satisfies readonly PodStatus[];

export type ShippingLabelStatus =
  | "NOT_GENERATED"
  | "GENERATED"
  | "PRINTED"
  | "REPRINTED"
  | "VOIDED"
  | "SUPERSEDED";

export type ShippingPackageStatus =
  | "PLANNED"
  | "PACKED"
  | "LABELLED"
  | "DISPATCHED"
  | "DELIVERED"
  | "VOIDED";

export type OperationalExceptionStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "RESOLVED"
  | "WAIVED"
  | "REOPENED"
  | "CANCELLED";

export const OPERATIONAL_EXCEPTION_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_REVIEW",
  "RESOLVED",
  "WAIVED",
  "REOPENED",
  "CANCELLED",
] as const satisfies readonly OperationalExceptionStatus[];

export type ExceptionState = "NONE" | "WARNING" | "BLOCKED" | "RESOLVED";

/** OperationalException severity (shared-foundation §6). */
export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Display-summary severity used by entity contract view models. */
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

// ---------------------------------------------------------------------------
// Master data, demand metadata, and document vocabularies
// ---------------------------------------------------------------------------

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

export type SalesPointEntityType =
  | "DPC"
  | "RETAIL"
  | "DISTRIBUTION_POINT"
  | "WAREHOUSE"
  | "OFFICE"
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

export type ImportMatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "MANUAL";

// ---------------------------------------------------------------------------
// POD evidence and review vocabularies
// ---------------------------------------------------------------------------

export type PodEvidenceType =
  | "SIGNED_DN"
  | "POD_PHOTO"
  | "RECEIVER_STAMP"
  | "INSTALLATION_PHOTO"
  | "OTHER";

/** Union of delivery-note-api and shared-foundation condition vocabularies. */
export type DeliveredItemCondition =
  | "GOOD"
  | "DAMAGED"
  | "MISSING"
  | "EXCESS"
  | "PARTIALLY_DAMAGED"
  | "REJECTED";

/** Union of delivery-note-api and shared-foundation variance vocabularies. */
export type DeliveryVarianceReason =
  | "NO_VARIANCE"
  | "SHORT_SHIPPED"
  | "SHORT_SHIPMENT"
  | "DAMAGED"
  | "LOST_IN_TRANSIT"
  | "MISSING_AT_DESTINATION"
  | "RECEIVER_REJECTED"
  | "OVERAGE"
  | "OVER_RECEIVED"
  | "COUNTING_ERROR"
  | "DATA_ENTRY_ERROR"
  | "CLIENT_ACCEPTED_VARIANCE"
  | "OTHER";

export type DeliveryConfirmationReviewDecision =
  | "VERIFY"
  | "PARTIALLY_VERIFY"
  | "REJECT"
  | "REQUEST_CORRECTION";

export type DeliveryConfirmationItemDecision =
  | "ACCEPT"
  | "REJECT"
  | "REQUEST_CORRECTION"
  | "ACCEPT_WITH_VARIANCE";

// ---------------------------------------------------------------------------
// Labels and print events
// ---------------------------------------------------------------------------

export type ShippingLabelType = "PACKAGE" | "SALES_POINT" | "PALLET";

export type ShippingLabelVoidReason =
  | "WRONG_PACKAGE"
  | "WRONG_DESTINATION"
  | "DAMAGED_PRINT"
  | "BATCH_CANCELLED"
  | "DOCUMENT_REGENERATED";

export type PrintEventStatus = "REQUESTED" | "PRINTED" | "FAILED";

export type DeliveryNoteFileType = "GENERATED_PDF" | "SIGNED_SCAN" | "CORRECTED_VERSION";
