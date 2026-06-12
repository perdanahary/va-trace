import { describe, expect, it } from "vitest";

import {
  legacyStatusLabel,
  mapLegacyConfirmationStatus,
  mapLegacyPodStatus,
  productionStatusFromLegacyItemStatus,
} from "@/lib/v2/compat/legacyLabels";

describe("legacy compatibility adapters (P1-19 / P4-24)", () => {
  it("maps legacy POD values to canonical projection values", () => {
    expect(mapLegacyPodStatus("PENDING")).toBe("PENDING_UPLOAD");
    expect(mapLegacyPodStatus("UPLOADED")).toBe("SUBMITTED");
    expect(mapLegacyPodStatus("VERIFIED")).toBe("VERIFIED");
    expect(mapLegacyPodStatus("REJECTED")).toBe("REJECTED");
  });

  it("maps legacy confirmation statuses to the V2 lifecycle", () => {
    expect(mapLegacyConfirmationStatus("PENDING")).toBe("DRAFT");
    expect(mapLegacyConfirmationStatus("UPLOADED")).toBe("SUBMITTED");
    expect(mapLegacyConfirmationStatus("CANCELLED")).toBe("WITHDRAWN");
  });

  it("derives the legacy display label from both V2 models", () => {
    expect(legacyStatusLabel("NEW", "NOT_STARTED")).toBe("New");
    expect(legacyStatusLabel("PRINTING", "NOT_STARTED")).toBe("In Production");
    expect(legacyStatusLabel("READY_FOR_DISTRIBUTION", "NOT_STARTED")).toBe("Ready to Ship");
    expect(legacyStatusLabel("COMPLETED", "PARTIALLY_DISTRIBUTED")).toBe("On Delivery");
    expect(legacyStatusLabel("COMPLETED", "PARTIALLY_RECEIVED")).toBe("Delivered");
    expect(legacyStatusLabel("COMPLETED", "FULLY_RECEIVED")).toBe("Completed");
    expect(legacyStatusLabel("CANCELLED", "NOT_STARTED")).toBe("Overdue");
  });

  it("maps legacy item statuses to production statuses (migration only)", () => {
    expect(productionStatusFromLegacyItemStatus("New")).toBe("NEW");
    expect(productionStatusFromLegacyItemStatus("In Production")).toBe("PRINTING");
    expect(productionStatusFromLegacyItemStatus("Ready to Ship")).toBe("READY_FOR_DISTRIBUTION");
    expect(productionStatusFromLegacyItemStatus("Delivered")).toBe("COMPLETED");
  });
});
