/**
 * P1-18 — Single source for quantity math.
 *
 * Invariants enforced here (docs/specs/01 §11, 03 §11, 05 §11):
 * - sum(allocated) per product <= ordered
 * - shipped <= allocated (per allocation, across batches)
 * - outstanding = allocated - shipped (never negative)
 * - reservation-aware outstanding ready = ready - reserved
 */

import type { Quantity } from "@/lib/types/v2/foundation";

export function sum(values: Quantity[]): Quantity {
  return values.reduce((total, value) => total + value, 0);
}

export function percentage(numerator: Quantity, denominator: Quantity): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function outstandingToShip(allocated: Quantity, shipped: Quantity): Quantity {
  return Math.max(allocated - shipped, 0);
}

export function remainingToReceive(allocated: Quantity, received: Quantity): Quantity {
  return Math.max(allocated - received, 0);
}

export function variance(received: Quantity, shipped: Quantity): Quantity {
  return received - shipped;
}

export function unreservedReadyQuantity(ready: Quantity, reserved: Quantity): Quantity {
  return Math.max(ready - reserved, 0);
}

/** Validates a proposed batch line quantity against allocation outstanding. */
export function validateBatchLineQuantity(options: {
  requested: Quantity;
  allocated: Quantity;
  previouslyShipped: Quantity;
}): { valid: boolean; message?: string; outstanding: Quantity } {
  const outstanding = outstandingToShip(options.allocated, options.previouslyShipped);

  if (!Number.isFinite(options.requested) || options.requested <= 0) {
    return { valid: false, message: "Batch quantity must be greater than zero.", outstanding };
  }
  if (options.requested > outstanding) {
    return {
      valid: false,
      message: `Batch quantity ${options.requested} exceeds outstanding allocation quantity ${outstanding}.`,
      outstanding,
    };
  }
  return { valid: true, outstanding };
}

/** Validates allocation totals by product against ordered quantities. */
export function validateAllocationTotals(options: {
  orderedByItemId: Map<string, Quantity>;
  allocations: Array<{ orderItemId: string; allocatedQuantity: Quantity }>;
}): { valid: boolean; errors: Array<{ orderItemId: string; message: string }> } {
  const totals = new Map<string, Quantity>();
  for (const allocation of options.allocations) {
    totals.set(allocation.orderItemId, (totals.get(allocation.orderItemId) ?? 0) + allocation.allocatedQuantity);
  }

  const errors: Array<{ orderItemId: string; message: string }> = [];
  for (const [orderItemId, total] of totals) {
    const ordered = options.orderedByItemId.get(orderItemId);
    if (ordered === undefined) {
      errors.push({ orderItemId, message: `Allocation references unknown order item ${orderItemId}.` });
      continue;
    }
    if (total > ordered) {
      errors.push({
        orderItemId,
        message: `Allocated quantity ${total} exceeds ordered quantity ${ordered} for item ${orderItemId}.`,
      });
    }
  }
  return { valid: errors.length === 0, errors };
}
