import { expect, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";

test.describe("V2 Release Readiness", () => {
  test("wrong-role direct URL access redirects to the active user's home", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("va-trace-current-user", "3");
    });

    await page.goto(`${BASE}/vendor/orders`);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("order detail exposes the V2 command center tabs", async ({ page }) => {
    await page.goto(`${BASE}/admin/orders/OR-2026-816972`);

    await expect(page.getByText("V2 Command Center")).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Overview$/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Allocations/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Production/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Shipment Batches/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Delivery Notes/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /POD/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Audit$/ })).toBeVisible();
  });

  test("production queue links to a production job detail route", async ({ page }) => {
    await page.goto(`${BASE}/admin/production`);

    const firstJob = page.locator("tbody a[href*='/admin/production/']").first();
    await expect(firstJob).toBeVisible();
    await firstJob.click();

    await expect(page).toHaveURL(/\/admin\/production\/.+/);
    await expect(page.getByText("Readiness Pool")).toBeVisible();
  });

  test("admin create form submits into the V2 command center", async ({ page }) => {
    await page.goto(`${BASE}/admin/create`);

    await page.getByLabel("Client PO Ref").fill(`PO-${Date.now()}`);
    await page.getByRole("combobox", { name: "Project" }).click();
    await page.getByPlaceholder("Search or type a new project name...").fill(`Release Project ${Date.now()}`);
    await page.getByRole("button", { name: /Create project/ }).click();
    await page.locator("#custom-deadline").evaluate((input) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "2026-12-31");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.getByLabel("PIC Project Email").fill("release@example.com");
    await page.getByLabel("PIC Project Name").fill("Release Tester");

    await page.getByRole("combobox", { name: "Product" }).click();
    await page.getByPlaceholder("Search product name, code, brand, or material...").fill("2026-00194983-0039");
    await page.getByRole("option").first().click();
    await page.getByPlaceholder("0", { exact: true }).fill("4");

    await page.getByRole("button", { name: "Approve & Send to Vendor" }).click();

    await expect(page).toHaveURL(/\/admin\/orders\/OR-/);
    await expect(page.getByText("V2 Command Center")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Production/ })).toBeVisible();
  });
});
