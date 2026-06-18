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
    expect(legacyStatusLabel("SUBMITTED", "NOT_STARTED")).toBe("New");
    expect(legacyStatusLabel("IN_PROGRESS", "NOT_STARTED")).toBe("In Production");
    expect(legacyStatusLabel("COMPLETED", "NOT_STARTED")).toBe("Ready to Ship");
    expect(legacyStatusLabel("COMPLETED", "PARTIALLY_DISTRIBUTED")).toBe("On Delivery");
    expect(legacyStatusLabel("COMPLETED", "PARTIALLY_RECEIVED")).toBe("Delivered");
    expect(legacyStatusLabel("COMPLETED", "FULLY_RECEIVED")).toBe("Completed");
    expect(legacyStatusLabel("CANCELLED", "NOT_STARTED")).toBe("Overdue");
    expect(legacyStatusLabel("EXCEPTION", "NOT_STARTED")).toBe("Overdue");
  });

  it("maps legacy item statuses to production statuses (migration only)", () => {
    expect(productionStatusFromLegacyItemStatus("New")).toBe("SUBMITTED");
    expect(productionStatusFromLegacyItemStatus("Waiting")).toBe("SUBMITTED");
    expect(productionStatusFromLegacyItemStatus("In Production")).toBe("IN_PROGRESS");
    expect(productionStatusFromLegacyItemStatus("Ready to Ship")).toBe("IN_PROGRESS");
    expect(productionStatusFromLegacyItemStatus("On Delivery")).toBe("COMPLETED");
    expect(productionStatusFromLegacyItemStatus("Delivered")).toBe("COMPLETED");
    expect(productionStatusFromLegacyItemStatus("Completed")).toBe("COMPLETED");
    expect(productionStatusFromLegacyItemStatus("Overdue")).toBe("CANCELLED");
  });
});
