import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Create order delivery-note alignment", () => {
  test("shows the delivery-note fields on the admin create form", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/create`);

    await expect(page.getByText("SO Number *", { exact: true })).toBeVisible();
    await expect(page.getByText("PIC Program Name *", { exact: true })).toBeVisible();
    await expect(page.getByText("PIC Program Email *", { exact: true })).toBeVisible();
    await expect(page.getByText("Delivery Note Alignment")).toBeVisible();
    await expect(page.getByText("PT. HM. Sampoerna Tbk").first()).toBeVisible();
    await expect(page.getByText("PT HMS Medan 1", { exact: true }).first()).toBeVisible();
  });
});
