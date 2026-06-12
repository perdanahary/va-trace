/**
 * P1-17 — Derived status selectors (read projections; CR-07).
 *
 * Sources: docs/v2-status-lifecycle.md, docs/implementation/02 (Derived State),
 * docs/specs/01 §5, 05 §5, 06 §5.
 *
 * These functions are pure. They are the only sanctioned derivation of
 * DistributionStatus, AllocationStatus, the PodStatus projection,
 * DeliveryProgress, and the order completion rule. Nothing here mutates state.
 */

import type { Quantity } from "@/lib/types/v2/foundation";
import type {
  AllocationStatus,
  DeadlineState,
  DeliveryConfirmationStatus,
  DistributionStatus,
  PodStatus,
  ProductionStatus,
} from "@/lib/types/v2/status";
import { percentage, sum } from "@/lib/v2/selectors/quantities";

export interface AllocationFacts {
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  cancelled?: boolean;
  adjusted?: boolean;
  hasBlockingException?: boolean;
  /** All shipped quantity has a final POD decision (nothing pending). */
  receiptFinalized?: boolean;
}

/** Allocation status matrix (docs/v2-status-lifecycle.md Allocation Status). */
export function deriveAllocationStatus(facts: AllocationFacts): AllocationStatus {
  if (facts.hasBlockingException) return "EXCEPTION";
  if (facts.cancelled) return "CANCELLED";

  const { allocatedQuantity: allocated, shippedQuantity: shipped, receivedQuantity: received } = facts;

  if (allocated > 0 && received > allocated) return "OVER_RECEIVED";
  if (
    facts.receiptFinalized &&
    shipped >= allocated &&
    received < shipped
  ) {
    return "SHORT_RECEIVED";
  }
  if (allocated > 0 && received >= allocated) return "FULLY_RECEIVED";
  if (received > 0) return "PARTIALLY_RECEIVED";
  if (facts.adjusted) return "ADJUSTED";
  if (allocated > 0 && shipped >= allocated) return "FULLY_SHIPPED";
  if (shipped > 0) return "PARTIALLY_SHIPPED";
  return "NOT_SHIPPED";
}

/** Order-level distribution status derived from all allocation rows. */
export function deriveDistributionStatus(
  allocations: AllocationFacts[],
  options: { cancelled?: boolean; hasBlockingException?: boolean } = {},
): DistributionStatus {
  if (options.hasBlockingException || allocations.some((allocation) => allocation.hasBlockingException)) {
    return "EXCEPTION";
  }

  const active = allocations.filter((allocation) => !allocation.cancelled);
  if (options.cancelled && active.every((allocation) => allocation.shippedQuantity === 0)) {
    return "CANCELLED";
  }

  const allocated = sum(active.map((allocation) => allocation.allocatedQuantity));
  const shipped = sum(active.map((allocation) => allocation.shippedQuantity));
  const received = sum(active.map((allocation) => allocation.receivedQuantity));

  if (allocated === 0 || shipped === 0) return "NOT_STARTED";
  if (received >= allocated) return "FULLY_RECEIVED";
  if (received > 0) return "PARTIALLY_RECEIVED";
  if (shipped >= allocated) return "FULLY_DISTRIBUTED";
  return "PARTIALLY_DISTRIBUTED";
}

/** PodStatus projection for one confirmation lifecycle state. */
export function podStatusFromConfirmation(status: DeliveryConfirmationStatus, hasVariance: boolean): PodStatus {
  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "SUBMITTED":
    case "PENDING_VERIFICATION":
    case "RESUBMITTED":
      return "SUBMITTED";
    case "PARTIALLY_VERIFIED":
      return "PARTIALLY_VERIFIED";
    case "VERIFIED":
    case "CLOSED":
      return hasVariance ? "VARIANCE" : "VERIFIED";
    case "REJECTED":
      return "REJECTED";
    case "CORRECTION_REQUESTED":
      return "CORRECTION_REQUESTED";
    case "WITHDRAWN":
    case "SUPERSEDED":
      return "PENDING_UPLOAD";
    default:
      return "PENDING_UPLOAD";
  }
}

/** Worst-state-first rollup for sets of POD projections. */
export function rollupPodStatus(statuses: PodStatus[], options: { dispatched?: boolean; missingThresholdBreached?: boolean } = {}): PodStatus {
  if (statuses.length === 0) {
    if (options.missingThresholdBreached) return "MISSING";
    return options.dispatched ? "PENDING_UPLOAD" : "NOT_STARTED";
  }
  const precedence: PodStatus[] = [
    "REJECTED",
    "CORRECTION_REQUESTED",
    "VARIANCE",
    "MISSING",
    "PARTIALLY_VERIFIED",
    "PENDING_UPLOAD",
    "DRAFT",
    "SUBMITTED",
    "VERIFIED",
    "NOT_STARTED",
    "NOT_REQUIRED",
  ];
  for (const status of precedence) {
    if (statuses.includes(status)) return status;
  }
  return "NOT_STARTED";
}

export interface DeliveryProgress {
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  salesPointCount: number;
  fullyReceivedSalesPointCount: number;
  podCount: number;
  percentage: number;
}

export function deriveDeliveryProgress(
  allocations: Array<AllocationFacts & { salesPointId: string }>,
  podCount: number,
): DeliveryProgress {
  const active = allocations.filter((allocation) => !allocation.cancelled);
  const allocatedQuantity = sum(active.map((allocation) => allocation.allocatedQuantity));
  const shippedQuantity = sum(active.map((allocation) => allocation.shippedQuantity));
  const receivedQuantity = sum(active.map((allocation) => allocation.receivedQuantity));

  const salesPointIds = new Set(active.map((allocation) => allocation.salesPointId));
  const fullyReceived = new Set(
    [...salesPointIds].filter((salesPointId) =>
      active
        .filter((allocation) => allocation.salesPointId === salesPointId)
        .every((allocation) => allocation.receivedQuantity >= allocation.allocatedQuantity && allocation.allocatedQuantity > 0),
    ),
  );

  return {
    allocatedQuantity,
    shippedQuantity,
    receivedQuantity,
    salesPointCount: salesPointIds.size,
    fullyReceivedSalesPointCount: fullyReceived.size,
    podCount,
    percentage: percentage(receivedQuantity, allocatedQuantity),
  };
}

/**
 * Completion rule (docs/v2-status-lifecycle.md):
 * production COMPLETED + distribution FULLY_RECEIVED + every active allocation
 * verified received + no open blocking exception.
 */
export function isOrderComplete(options: {
  productionStatus: ProductionStatus;
  distributionStatus: DistributionStatus;
  allocations: AllocationFacts[];
  hasOpenBlockingException: boolean;
}): boolean {
  if (options.productionStatus !== "COMPLETED") return false;
  if (options.distributionStatus !== "FULLY_RECEIVED") return false;
  if (options.hasOpenBlockingException) return false;
  return options.allocations
    .filter((allocation) => !allocation.cancelled)
    .every((allocation) => allocation.allocatedQuantity > 0 && allocation.receivedQuantity >= allocation.allocatedQuantity);
}

/** Order production status derived from the least advanced active job. */
export function deriveOrderProductionStatus(jobStatuses: ProductionStatus[]): ProductionStatus {
  if (jobStatuses.length === 0) return "NEW";
  if (jobStatuses.some((status) => status === "EXCEPTION")) return "EXCEPTION";
  if (jobStatuses.every((status) => status === "CANCELLED")) return "CANCELLED";

  const active = jobStatuses.filter((status) => status !== "CANCELLED");
  if (active.length === 0) return "CANCELLED";
  if (active.every((status) => status === "COMPLETED")) return "COMPLETED";

  const rank: ProductionStatus[] = [
    "NEW",
    "SUBMITTED",
    "ACCEPTED",
    "PRINTING",
    "FINISHING",
    "QUALITY_CONTROL",
    "READY_FOR_DISTRIBUTION",
    "COMPLETED",
  ];
  const lowest = Math.min(
    ...active.map((status) => {
      const index = rank.indexOf(status);
      return index === -1 ? 0 : index;
    }),
  );
  return rank[lowest] ?? "NEW";
}

/** Deadline state for ISO dates and legacy free-text deadlines. */
export function deriveDeadlineState(deadline: string | undefined, dueSoonDays = 7): DeadlineState {
  if (!deadline || deadline.trim() === "") return "NO_DEADLINE";

  const normalized = deadline.trim().toLowerCase();
  if (normalized.includes("overdue")) return "OVERDUE";

  const daysLeftMatch = normalized.match(/(\d+)\s*days?\s*left/);
  if (daysLeftMatch) {
    return Number(daysLeftMatch[1]) <= dueSoonDays ? "DUE_SOON" : "UPCOMING";
  }

  const parsed = Date.parse(deadline);
  if (!Number.isNaN(parsed)) {
    const diffDays = (parsed - Date.now()) / 86_400_000;
    if (diffDays < 0) return "OVERDUE";
    if (diffDays <= dueSoonDays) return "DUE_SOON";
    return "UPCOMING";
  }

  return "UPCOMING";
}

/** Human-readable label for SCREAMING_SNAKE_CASE status values. */
export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
