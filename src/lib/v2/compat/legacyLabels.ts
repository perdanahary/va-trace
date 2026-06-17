/**
 * P1-19 — Legacy compatibility adapters.
 *
 * - V2 -> legacy blended label (`legacyStatusLabel`), display-only.
 * - Legacy persisted value mapping: `PENDING` -> `PENDING_UPLOAD`,
 *   `UPLOADED` -> `SUBMITTED` (docs/implementation/01, status table).
 * - Legacy item status -> V2 ProductionStatus (seed/migration use only).
 *
 * `src/lib/orderStatus.ts` and `src/lib/orderDomain.ts` remain frozen legacy
 * compatibility layers; new code must use this module instead.
 */

import type { LegacyOrderStatus } from "@/lib/types/status";
import type {
  DeliveryConfirmationStatus,
  DistributionStatus,
  PodStatus,
  ProductionStatus,
} from "@/lib/types/v2/status";

/** Legacy blended label derived from the two V2 status models. Display only. */
export function legacyStatusLabel(
  productionStatus: ProductionStatus,
  distributionStatus: DistributionStatus,
): string {
  if (productionStatus === "CANCELLED" || distributionStatus === "CANCELLED") {
    return "Overdue";
  }
  if (productionStatus === "EXCEPTION" || distributionStatus === "EXCEPTION") {
    return "Overdue";
  }
  if (productionStatus === "COMPLETED" && distributionStatus === "FULLY_RECEIVED") {
    return "Completed";
  }
  if (distributionStatus === "PARTIALLY_RECEIVED" || distributionStatus === "FULLY_RECEIVED") {
    return "Delivered";
  }
  if (distributionStatus === "PARTIALLY_DISTRIBUTED" || distributionStatus === "FULLY_DISTRIBUTED") {
    return "On Delivery";
  }
  if (productionStatus === "COMPLETED" || productionStatus === "READY_FOR_DISTRIBUTION") {
    return "Ready to Ship";
  }
  if (productionStatus === "PRINTING" || productionStatus === "FINISHING" || productionStatus === "QUALITY_CONTROL") {
    return "In Production";
  }
  return "New";
}

/** Maps legacy persisted POD values to the canonical projection vocabulary. */
export function mapLegacyPodStatus(status: string | undefined): PodStatus {
  switch (status) {
    case "PENDING":
      return "PENDING_UPLOAD";
    case "UPLOADED":
      return "SUBMITTED";
    case "VERIFIED":
      return "VERIFIED";
    case "REJECTED":
      return "REJECTED";
    default:
      return "PENDING_UPLOAD";
  }
}

/** Maps legacy persisted confirmation statuses to the V2 lifecycle. */
export function mapLegacyConfirmationStatus(status: string | undefined): DeliveryConfirmationStatus {
  switch (status) {
    case "PENDING":
    case "DRAFT":
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
      return "WITHDRAWN";
    default:
      return "DRAFT";
  }
}

/** Maps a legacy order-item status to V2 ProductionStatus (migration only). */
export function productionStatusFromLegacyItemStatus(status: LegacyOrderStatus): ProductionStatus {
  switch (status) {
    case "New":
    case "Waiting":
      return "SUBMITTED";
    case "In Production":
      return "PRINTING";
    case "Ready to Ship":
      return "READY_FOR_DISTRIBUTION";
    case "On Delivery":
    case "Delivered":
    case "Completed":
      return "COMPLETED";
    case "Overdue":
      return "CANCELLED";
  }
}
