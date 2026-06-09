import { expect, test } from "@playwright/test";

import { mockSalesPoints } from "@/lib/mockData";

test.describe("sales point client binding", () => {
  test("binds every sales point record to the Sampoerna client", () => {
    expect(mockSalesPoints.length).toBeGreaterThan(0);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.clientId === "CUS-SAMPOERNA")).toBe(true);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.clientName === "Sampoerna")).toBe(true);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.clientEntityName === "PT HM Sampoerna Tbk")).toBe(true);
  });
});
