import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Delivery note print mapping", () => {
  test("keeps internal notes in sync with the delivery note for OR-2026-816972", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972`);

    await expect(page.getByText("Internal Notes")).toBeVisible();
    await expect(page.getByText("Tim Area WAJIB melakukan GR CPT dan COUPA.")).toBeVisible();
    await expect(page.getByText("Order to Delivery Alignment")).toBeVisible();
    await expect(page.getByText("Sunscreen Campaign Q2")).toBeVisible();
    await expect(page.getByText("SO123928")).toBeVisible();
    await expect(page.getByText("Chandra Sadikin(Chandra.Sadikin@sampoerna.com)")).toBeVisible();
    await expect(page.getByText("PT Hanjaya Mandala Sampoerna Tbk")).toBeVisible();
    await expect(page.getByText("PT HMS Jakarta Barat", { exact: true })).toBeVisible();
  });

  test("maps campaign to Program and WH020 to PT HMS Medan 1", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-715187/delivery-note`);

    const note = page.locator(".delivery-note-page");
    await expect(note).toContainText("DO Number : DEL20260520715187");
    await expect(note).toContainText("PO No");
    await expect(note).toContainText("5701749081");
    await expect(note).toContainText("Program");
    await expect(note).toContainText("WOC12026 - POSM Networking - Production - PPOSM PPOSM VEEV");
    await expect(note).toContainText("PT HMS Medan 1");
    await expect(note).toContainText("SO178056");
    await expect(note).toContainText("Chandra Sadikin(Chandra.Sadikin@sampoerna.com)");

    const table = page.locator(".delivery-note-table");
    await expect(table).toContainText("Photopaper_GT SRC - Snap Frame (V)");
    await expect(table).toContainText("Photopaper_GT SRC - Snap Frame (H)");
    await expect(table).toContainText("Photopaper_GT SRC - Cigarette Cabinet 1 (H)");
    await expect(table).toContainText("29Pcs");
    await expect(table).toContainText("0Pcs");
  });

  test("uses the HH Global supplier seed for OR-2026-816972", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972/delivery-note`);

    const note = page.locator(".delivery-note-page");
    await expect(note).toContainText("DO Number : DEL20260601816972");
    await expect(note).toContainText("PT. HH Global Services Indonesia");
    await expect(note).toContainText("Gedung Indonesia Stock Exchange Tower 2 Lt.17");
    await expect(note).toContainText("Jl. Jendral Sudirman Kav. 52-53");
    await expect(note).toContainText("Daerah Khusus Ibu Kota Jakarta 12830");
    await expect(note).toContainText("+62 21 515 7606");

    const qr = page.locator(".delivery-note-qr");
    await expect(qr).toHaveAttribute("data-qr-target", `${baseUrl}/admin/orders/OR-2026-816972/delivery-note`);
  });
});
