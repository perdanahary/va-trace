import { describe, expect, it } from "vitest";

import {
  deriveAllocationStatus,
  deriveDeadlineState,
  deriveDistributionStatus,
  deriveOrderProductionStatus,
  isOrderComplete,
  podStatusFromConfirmation,
  rollupPodStatus,
} from "@/lib/v2/selectors/derivedStatus";

describe("deriveAllocationStatus (P4-07)", () => {
  const base = { allocatedQuantity: 100, shippedQuantity: 0, receivedQuantity: 0 };

  it("derives NOT_SHIPPED when nothing is shipped", () => {
    expect(deriveAllocationStatus(base)).toBe("NOT_SHIPPED");
  });

  it("derives PARTIALLY_SHIPPED for partial shipment", () => {
    expect(deriveAllocationStatus({ ...base, shippedQuantity: 40 })).toBe("PARTIALLY_SHIPPED");
  });

  it("derives FULLY_SHIPPED when shipped equals allocated", () => {
    expect(deriveAllocationStatus({ ...base, shippedQuantity: 100 })).toBe("FULLY_SHIPPED");
  });

  it("derives PARTIALLY_RECEIVED for partial receipt", () => {
    expect(deriveAllocationStatus({ ...base, shippedQuantity: 100, receivedQuantity: 50 })).toBe("PARTIALLY_RECEIVED");
  });

  it("derives FULLY_RECEIVED when received equals allocated", () => {
    expect(deriveAllocationStatus({ ...base, shippedQuantity: 100, receivedQuantity: 100 })).toBe("FULLY_RECEIVED");
  });

  it("derives OVER_RECEIVED when received exceeds allocated", () => {
    expect(deriveAllocationStatus({ ...base, shippedQuantity: 100, receivedQuantity: 110 })).toBe("OVER_RECEIVED");
  });

  it("derives SHORT_RECEIVED when receipt finalized below shipped", () => {
    expect(
      deriveAllocationStatus({
        ...base,
        shippedQuantity: 100,
        receivedQuantity: 0,
        receiptFinalized: true,
      }),
    ).toBe("SHORT_RECEIVED");
  });

  it("derives ADJUSTED when corrected before shipping", () => {
    expect(deriveAllocationStatus({ ...base, adjusted: true })).toBe("ADJUSTED");
  });

  it("derives CANCELLED and EXCEPTION", () => {
    expect(deriveAllocationStatus({ ...base, cancelled: true })).toBe("CANCELLED");
    expect(deriveAllocationStatus({ ...base, hasBlockingException: true })).toBe("EXCEPTION");
  });
});

describe("deriveDistributionStatus", () => {
  it("derives the full lifecycle", () => {
    const make = (shipped: number, received: number) => [
      { allocatedQuantity: 100, shippedQuantity: shipped, receivedQuantity: received },
    ];
    expect(deriveDistributionStatus(make(0, 0))).toBe("NOT_STARTED");
    expect(deriveDistributionStatus(make(40, 0))).toBe("PARTIALLY_DISTRIBUTED");
    expect(deriveDistributionStatus(make(100, 0))).toBe("FULLY_DISTRIBUTED");
    expect(deriveDistributionStatus(make(100, 50))).toBe("PARTIALLY_RECEIVED");
    expect(deriveDistributionStatus(make(100, 100))).toBe("FULLY_RECEIVED");
  });

  it("derives EXCEPTION when a blocking exception exists", () => {
    expect(
      deriveDistributionStatus([{ allocatedQuantity: 10, shippedQuantity: 5, receivedQuantity: 0, hasBlockingException: true }]),
    ).toBe("EXCEPTION");
  });
});

describe("completion rule (P4-04)", () => {
  const fullyReceived = [{ allocatedQuantity: 100, shippedQuantity: 100, receivedQuantity: 100 }];

  it("requires production COMPLETED + distribution FULLY_RECEIVED + all allocations received", () => {
    expect(
      isOrderComplete({
        productionStatus: "COMPLETED",
        distributionStatus: "FULLY_RECEIVED",
        allocations: fullyReceived,
        hasOpenBlockingException: false,
      }),
    ).toBe(true);
  });

  it("fails on incomplete production, partial receipt, or blocking exception", () => {
    expect(
      isOrderComplete({
        productionStatus: "READY_FOR_DISTRIBUTION",
        distributionStatus: "FULLY_RECEIVED",
        allocations: fullyReceived,
        hasOpenBlockingException: false,
      }),
    ).toBe(false);
    expect(
      isOrderComplete({
        productionStatus: "COMPLETED",
        distributionStatus: "PARTIALLY_RECEIVED",
        allocations: [{ allocatedQuantity: 100, shippedQuantity: 100, receivedQuantity: 50 }],
        hasOpenBlockingException: false,
      }),
    ).toBe(false);
    expect(
      isOrderComplete({
        productionStatus: "COMPLETED",
        distributionStatus: "FULLY_RECEIVED",
        allocations: fullyReceived,
        hasOpenBlockingException: true,
      }),
    ).toBe(false);
  });
});

describe("order production status projection (P4-05)", () => {
  it("uses the least advanced active job", () => {
    expect(deriveOrderProductionStatus(["PRINTING", "READY_FOR_DISTRIBUTION"])).toBe("PRINTING");
    expect(deriveOrderProductionStatus(["COMPLETED", "COMPLETED"])).toBe("COMPLETED");
    expect(deriveOrderProductionStatus(["COMPLETED", "CANCELLED"])).toBe("COMPLETED");
    expect(deriveOrderProductionStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED");
    expect(deriveOrderProductionStatus(["EXCEPTION", "PRINTING"])).toBe("EXCEPTION");
  });
});

describe("POD projection", () => {
  it("maps confirmation lifecycle to projection vocabulary", () => {
    expect(podStatusFromConfirmation("SUBMITTED", false)).toBe("SUBMITTED");
    expect(podStatusFromConfirmation("VERIFIED", false)).toBe("VERIFIED");
    expect(podStatusFromConfirmation("VERIFIED", true)).toBe("VARIANCE");
    expect(podStatusFromConfirmation("REJECTED", false)).toBe("REJECTED");
  });

  it("rolls up worst-state-first", () => {
    expect(rollupPodStatus(["VERIFIED", "REJECTED"])).toBe("REJECTED");
    expect(rollupPodStatus(["VERIFIED", "SUBMITTED"])).toBe("SUBMITTED");
    expect(rollupPodStatus([], { dispatched: true })).toBe("PENDING_UPLOAD");
    expect(rollupPodStatus([], { dispatched: false })).toBe("NOT_STARTED");
  });
});

describe("deadline state", () => {
  it("maps legacy free-text and ISO deadlines", () => {
    expect(deriveDeadlineState("Overdue")).toBe("OVERDUE");
    expect(deriveDeadlineState("21 days left")).toBe("UPCOMING");
    expect(deriveDeadlineState("3 days left")).toBe("DUE_SOON");
    expect(deriveDeadlineState("")).toBe("NO_DEADLINE");
    expect(deriveDeadlineState("2020-01-01")).toBe("OVERDUE");
  });
});
