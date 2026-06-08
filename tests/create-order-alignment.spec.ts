import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Create order form", () => {
  test("shows the delivery-note alignment section and the reordered item grid", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/create`);

    await expect(page.getByText("SO Number *", { exact: true })).toBeVisible();
    await expect(page.getByText("PIC Program Name *", { exact: true })).toBeVisible();
    await expect(page.getByText("PIC Program Email *", { exact: true })).toBeVisible();
    await expect(page.getByText("Delivery Note Alignment")).toBeVisible();
    await expect(page.getByText("Delivery Note Snapshot")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Item" })).toBeVisible();
    await expect(page.getByText("Line", { exact: true })).toBeVisible();
    await expect(page.getByText("Product", { exact: true })).toBeVisible();
  });

  test("reorders item rows with the grip handle", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/create`);

    await page.getByRole("button", { name: "Add Item" }).click();

    const rows = page.locator("[data-item-row='true']");
    await expect(rows).toHaveCount(2);

    const rowIdsBefore = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-item-id")));
    const firstHandle = page.getByRole("button", { name: "Reorder line 1" }).first();
    const secondHandle = page.getByRole("button", { name: "Reorder line 2" }).first();

    const firstBox = await firstHandle.boundingBox();
    const secondBox = await secondHandle.boundingBox();

    if (!firstBox || !secondBox) {
      throw new Error("Could not measure drag handles.");
    }

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2 + 90, { steps: 20 });
    await page.mouse.up();

    await expect.poll(async () => rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-item-id")))).toEqual([
      rowIdsBefore[1],
      rowIdsBefore[0],
    ]);
  });
});
