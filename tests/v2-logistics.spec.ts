import { test, expect } from "@playwright/test";

/**
 * P4-17/P4-22 — V2 routing, redirects, and logistics surfaces.
 * Run against a local dev server: `npm run dev` then
 * `E2E_BASE_URL=http://localhost:5173 npx playwright test tests/v2-logistics.spec.ts --project=chromium`
 */
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";

test.describe("V2 Logistics - Routing & Redirects", () => {
  test("legacy /admin/logistics redirects to /admin/shipments", async ({ page }) => {
    await page.goto(`${BASE}/admin/logistics`);
    await expect(page).toHaveURL(/\/admin\/shipments$/);
    await expect(page.getByText("Shipment Batches", { exact: false }).first()).toBeVisible();
  });

  test("legacy /vendor/update/:id redirects to /vendor/orders/:id", async ({ page }) => {
    await page.goto(`${BASE}/vendor/update/OR-2026-816972`);
    await expect(page).toHaveURL(/\/vendor\/orders\/OR-2026-816972$/);
  });

  test("admin sidebar exposes the Logistics group", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page.getByRole("link", { name: "Shipment Batches" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Delivery Notes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shipping Labels" })).toBeVisible();
    await expect(page.getByRole("link", { name: "POD Verification" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Exceptions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Production" })).toBeVisible();
  });
});

test.describe("V2 Logistics - Surfaces render from migrated seeds", () => {
  test("shipment batch list shows compatibility batches with status badges", async ({ page }) => {
    await page.goto(`${BASE}/admin/shipments`);
    await expect(page.getByText("Physical shipment events", { exact: false })).toBeVisible();
    // Seeded legacy orders with delivered quantities produce compatibility batches.
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("delivery notes register lists batch-scoped DNs", async ({ page }) => {
    await page.goto(`${BASE}/admin/delivery-notes`);
    await expect(page.getByText("Delivery Notes Register")).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("shipping label register route renders", async ({ page }) => {
    await page.goto(`${BASE}/admin/labels`);
    await expect(page.getByText("Label Register")).toBeVisible();
  });

  test("exceptions register route renders", async ({ page }) => {
    await page.goto(`${BASE}/admin/exceptions`);
    await expect(page.getByText("Operational Exceptions Register")).toBeVisible();
  });

  test("client order list route renders instead of redirecting", async ({ page }) => {
    await page.goto(`${BASE}/client/orders`);
    await expect(page).toHaveURL(/\/client\/orders$/);
    await expect(page.getByText("Order Requests", { exact: true })).toBeVisible();
  });

  test("POD verification queue renders", async ({ page }) => {
    await page.goto(`${BASE}/admin/pod`);
    await expect(page.getByText("Pending Verification", { exact: false })).toBeVisible();
  });

  test("production queue lists jobs with ready quantities", async ({ page }) => {
    await page.goto(`${BASE}/admin/production`);
    await expect(page.getByText("Production Jobs")).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("order detail shows the V2 fulfillment status card", async ({ page }) => {
    await page.goto(`${BASE}/admin/orders/OR-2026-816972`);
    await expect(page.getByText("Fulfillment Status")).toBeVisible();
    await expect(page.getByText("Sales Point Allocations", { exact: false })).toBeVisible();
  });

  test("vendor POD upload queue renders", async ({ page }) => {
    await page.goto(`${BASE}/vendor/pod`);
    await expect(page.getByText("Awaiting POD", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Correction Queue", { exact: false })).toBeVisible();
  });

  test("sales point detail shows profile and history tabs", async ({ page }) => {
    await page.goto(`${BASE}/admin/sales-points/WH055`);
    await expect(page.getByRole("tab", { name: /Contacts/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Allocations/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Shipment History/ })).toBeVisible();
  });
});
