import { expect, test } from "@playwright/test";

import { mockSalesPoints } from "@/lib/mockData";

test.describe("sales point customer binding", () => {
  test("binds every sales point record to the Sampoerna customer", () => {
    expect(mockSalesPoints.length).toBeGreaterThan(0);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.customerId === "CUS-SAMPOERNA")).toBe(true);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.customerName === "Sampoerna")).toBe(true);
    expect(mockSalesPoints.every((salesPoint) => salesPoint.customerEntityName === "PT HM Sampoerna Tbk")).toBe(true);
  });
});
