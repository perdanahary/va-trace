import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Packaging labels print flow", () => {
  test("shows the packaging label action on order detail", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972`);

    await expect(page.getByRole("banner").getByRole("link", { name: "Packaging Labels" })).toBeVisible();
  });

  test("renders one label per delivered line item only", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972/packaging-labels`);

    await expect(page.getByRole("banner").getByRole("link", { name: "All Orders" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "OR-2026-816972" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Packaging Labels: DEL20260601816972")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print Packaging Labels" })).toBeVisible();
    await expect(page.getByText("Back to Order")).toHaveCount(0);

    const cards = page.locator(".packaging-label-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("OR-2026-816972");
    await expect(cards.first()).toContainText("DEL20260601816972");
    await expect(cards.first()).toContainText("2026-00194983-0039");
    await expect(cards.first()).toContainText("PO Line");
    await expect(cards.first()).toContainText("1");
    await expect(cards.first()).toContainText("50 Pcs");
    await expect(cards.first()).toContainText("PT Hanjaya Mandala Sampoerna Tbk / PT HMS Jakarta Barat");

    await expect(page.getByText("2026-00194983-0040")).toHaveCount(0);
    await expect(page.getByText("2026-00194983-0041")).toHaveCount(0);
  });

  test("shows warning banner and empty state when no delivered lines exist", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-445566/packaging-labels`);

    await expect(page.getByText("Missing data before print")).toBeVisible();
    await expect(page.getByText("Deliver-to phone")).toBeVisible();
    await expect(page.getByText("PIC Program")).toHaveCount(0);
    await expect(page.getByText("No delivered items available for labeling")).toBeVisible();
    await expect(page.locator(".packaging-label-card")).toHaveCount(0);
  });
});
