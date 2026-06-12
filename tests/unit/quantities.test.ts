import { describe, expect, it } from "vitest";

import {
  outstandingToShip,
  percentage,
  unreservedReadyQuantity,
  validateAllocationTotals,
  validateBatchLineQuantity,
} from "@/lib/v2/selectors/quantities";

describe("quantity math (P4-11)", () => {
  it("computes outstanding and never goes negative", () => {
    expect(outstandingToShip(100, 40)).toBe(60);
    expect(outstandingToShip(100, 120)).toBe(0);
  });

  it("handles division by zero in percentages", () => {
    expect(percentage(50, 0)).toBe(0);
    expect(percentage(50, 100)).toBe(50);
  });

  it("computes reservation-aware ready quantity", () => {
    expect(unreservedReadyQuantity(100, 30)).toBe(70);
    expect(unreservedReadyQuantity(20, 30)).toBe(0);
  });

  it("rejects batch line quantities above outstanding allocation", () => {
    const over = validateBatchLineQuantity({ requested: 80, allocated: 100, previouslyShipped: 40 });
    expect(over.valid).toBe(false);
    expect(over.outstanding).toBe(60);

    const ok = validateBatchLineQuantity({ requested: 60, allocated: 100, previouslyShipped: 40 });
    expect(ok.valid).toBe(true);
  });

  it("rejects zero/negative batch quantities", () => {
    expect(validateBatchLineQuantity({ requested: 0, allocated: 100, previouslyShipped: 0 }).valid).toBe(false);
    expect(validateBatchLineQuantity({ requested: -5, allocated: 100, previouslyShipped: 0 }).valid).toBe(false);
  });

  it("enforces allocation sum <= ordered per product (P4-07)", () => {
    const orderedByItemId = new Map([["item-1", 100]]);
    const valid = validateAllocationTotals({
      orderedByItemId,
      allocations: [
        { orderItemId: "item-1", allocatedQuantity: 60 },
        { orderItemId: "item-1", allocatedQuantity: 40 },
      ],
    });
    expect(valid.valid).toBe(true);

    const invalid = validateAllocationTotals({
      orderedByItemId,
      allocations: [
        { orderItemId: "item-1", allocatedQuantity: 60 },
        { orderItemId: "item-1", allocatedQuantity: 50 },
      ],
    });
    expect(invalid.valid).toBe(false);
  });

  it("invariants hold for random valid partial sequences", () => {
    for (let run = 0; run < 50; run += 1) {
      const allocated = Math.floor(Math.random() * 500) + 1;
      let shipped = 0;
      while (shipped < allocated) {
        const outstanding = outstandingToShip(allocated, shipped);
        const next = Math.min(Math.floor(Math.random() * outstanding) + 1, outstanding);
        const check = validateBatchLineQuantity({ requested: next, allocated, previouslyShipped: shipped });
        expect(check.valid).toBe(true);
        shipped += next;
        expect(shipped).toBeLessThanOrEqual(allocated);
      }
      expect(outstandingToShip(allocated, shipped)).toBe(0);
    }
  });
});
