import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

import {
  buildImportBatch,
  createOrdersFromDispatchableRows,
  extractImportRecordsFromWorksheet,
  getDispatchReadiness,
  type ImportBatchRow,
  type ParsedImportSheetRow,
} from "@/lib/importStore";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

const importHeaders = [
  "PO Number",
  "PO Line",
  "Cycle",
  "Year",
  "Zone",
  "Region",
  "Area",
  "Wcode",
  "Sales Point",
  "Item Name",
  "Catergory",
  "Item Code",
  "Brand",
  "Brand SKU",
  "Brand Name PO",
  "Length",
  "Width",
  "Quantity",
  "Order Date",
  "Production Start Date",
  "Production Finish Date",
  "Shipment Date",
  "Est. Received Date",
  "Received Date Based on CPT",
  "DN Number",
  "Entity",
];

const productSticker = {
  code: "2026-00194983-0046",
  name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K",
};

const productBackwall = {
  code: "2026-00194983-0050",
  name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - DPP12 20K",
};

function makeRecord(overrides: Partial<Record<(typeof importHeaders)[number], string>> = {}): Record<string, string> {
  return {
    "PO Number": "PO-TEST-A",
    "PO Line": "1",
    Cycle: "C1",
    Year: "2026",
    Zone: "Jakarta",
    Region: "Jakarta Inner",
    Area: "Jakarta Barat",
    Wcode: "WH055",
    "Sales Point": "Jakarta Barat",
    "Item Name": productSticker.name,
    Catergory: "Sticker",
    "Item Code": productSticker.code,
    Brand: "Dji Sam Soe Magnum Filter",
    "Brand SKU": "",
    "Brand Name PO": "DSE12 25K",
    Length: "",
    Width: "",
    Quantity: "10",
    "Order Date": "",
    "Production Start Date": "",
    "Production Finish Date": "",
    "Shipment Date": "",
    "Est. Received Date": "",
    "Received Date Based on CPT": "",
    "DN Number": "",
    Entity: "PT HM Sampoerna Tbk",
    ...overrides,
  };
}

function parsedRows(records: Array<Record<string, string>>): ParsedImportSheetRow[] {
  return records.map((values, index) => ({
    values,
    sheetRowNumber: index + 2,
  }));
}

function assign(row: ImportBatchRow, vendorId: string, vendorName: string): ImportBatchRow {
  return {
    ...row,
    status: row.match.issues.length > 0 ? "unresolved" : "assigned",
    assignment: {
      vendorId,
      vendorName,
      assignedAt: "2026-06-08T00:00:00.000Z",
      assignedBy: "Test",
    },
  };
}

function writeOriginalStyleWorkbook(filePath: string, records: Array<Record<string, string>>) {
  const sheetRows = [
    ["metadata", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "1442341", "", "", "", "", "", "", "", "", "", "CPT"],
    ["", ...importHeaders, "", "Track", "QTY Received ", "QTY Received  Final", "Received Date"],
    ...records.map((record) => ["metadata-key", ...importHeaders.map((header) => record[header] ?? ""), "", "", "", ""]),
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheetRows), "Sheet1");
  const workbookBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  fs.writeFileSync(filePath, workbookBuffer);
}

test.describe("bulk order request import", () => {
  test.describe.configure({ timeout: 60_000 });

  test("parses the original item vendor tracking workbook shape", () => {
    const workbookPath = path.resolve(process.cwd(), "documents/sample item vendor tracking original.xlsx");
    const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const parsed = extractImportRecordsFromWorksheet(worksheet);
    const batch = buildImportBatch("sample item vendor tracking original.xlsx", "Sheet1", "Test", parsed.records, parsed.headerRowNumber);

    expect(parsed.headerRowNumber).toBe(2);
    expect(batch.rows).toHaveLength(93);
    expect(batch.rows[0].sheetRowNumber).toBe(3);
    expect(batch.rows[0].raw.poNumber).toBe("5701711304");
    expect(batch.rows[0].raw.wcode).toBe("WH055");
    expect(Object.keys(parsed.records[0].values)).not.toContain("Track");
    expect(Object.keys(parsed.records[0].values)).not.toContain("QTY Received ");
  });

  test("holds exact duplicate import rows for manual review", () => {
    const duplicate = makeRecord({ "PO Number": "PO-DUP-A", Quantity: "7" });
    const batch = buildImportBatch("duplicates.xlsx", "Sheet1", "Test", parsedRows([duplicate, duplicate]));

    expect(batch.rows).toHaveLength(2);
    expect(batch.rows.every((row) => row.possibleDuplicate)).toBe(true);
    expect(batch.rows.every((row) => row.duplicateDecision === "pending")).toBe(true);
    expect(batch.validationStatus).toBe("blocked");
    expect(batch.rows.every((row) => row.idempotencyKey.includes(batch.id.toLowerCase()))).toBe(true);
  });

  test("uses all mandatory fields for duplicate detection", () => {
    const first = makeRecord({ "PO Number": "PO-DUP-FIELDS", Quantity: "7" });
    const changedItemName = makeRecord({
      "PO Number": "PO-DUP-FIELDS",
      Quantity: "7",
      "Item Name": `${productSticker.name} variant`,
    });
    const batch = buildImportBatch("mandatory-fields.xlsx", "Sheet1", "Test", parsedRows([first, changedItemName]));

    expect(batch.rows).toHaveLength(2);
    expect(batch.rows.every((row) => row.possibleDuplicate)).toBe(false);
    expect(batch.rows[0].duplicateKey).not.toBe(batch.rows[1].duplicateKey);
  });

  test("splits dispatch output by PO, sales point, and vendor", () => {
    const batch = buildImportBatch(
      "dispatch-groups.xlsx",
      "Sheet1",
      "Test",
      parsedRows([
        makeRecord({ "PO Number": "PO-GRP-A", "PO Line": "1", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "10" }),
        makeRecord({ "PO Number": "PO-GRP-A", "PO Line": "2", Wcode: "WH055", "Sales Point": "Jakarta Barat", "Item Code": productBackwall.code, "Item Name": productBackwall.name, Quantity: "5" }),
        makeRecord({ "PO Number": "PO-GRP-A", "PO Line": "3", Wcode: "WH071", "Sales Point": "Jakarta Selatan", Quantity: "20" }),
        makeRecord({ "PO Number": "PO-GRP-A", "PO Line": "4", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "15" }),
        makeRecord({ "PO Number": "PO-GRP-B", "PO Line": "1", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "12" }),
      ]),
    );
    const assignedRows = batch.rows.map((row, index) =>
      index === 3 ? assign(row, "SUP-002", "PT Print Solusi Indonesia") : assign(row, "SUP-001", "CV Cetakan Terbaik Sejagat"),
    );

    const orders = createOrdersFromDispatchableRows({ ...batch, rows: assignedRows }, assignedRows, "DSP-TEST");
    const poSalesPointVendorKeys = orders.map((order) => `${order.clientPO}|${order.salesPointId}|${order.assignedVendorId}`).sort();

    expect(orders).toHaveLength(4);
    expect(orders.every((order) => Boolean(order.importGroupKey))).toBe(true);
    expect(poSalesPointVendorKeys).toEqual([
      "PO-GRP-A|WH055|SUP-001",
      "PO-GRP-A|WH055|SUP-002",
      "PO-GRP-A|WH071|SUP-001",
      "PO-GRP-B|WH055|SUP-001",
    ]);
    expect(orders.find((order) => order.clientPO === "PO-GRP-A" && order.salesPointId === "WH055" && order.assignedVendorId === "SUP-001")?.items).toHaveLength(2);
    expect(orders.every((order) => order.clientPO !== "MULTI-PO")).toBe(true);
    expect(orders.every((order) => order.importPoNumbers?.length === 1 && order.importPoNumbers[0] === order.clientPO)).toBe(true);
  });

  test("binds imported sales points to the Sampoerna customer on the row match and generated order", () => {
    const batch = buildImportBatch(
      "customer-binding.xlsx",
      "Sheet1",
      "Test",
      parsedRows([makeRecord({ "PO Number": "PO-CUS-A", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "9" })]),
    );
    const assignedRows = batch.rows.map((row) => assign(row, "SUP-001", "CV Cetakan Terbaik Sejagat"));

    expect(assignedRows[0].match.customerId).toBe("CUS-SAMPOERNA");
    expect(assignedRows[0].match.customerName).toBe("Sampoerna");
    expect(assignedRows[0].match.customerEntityName).toBe("PT HM Sampoerna Tbk");

    const orders = createOrdersFromDispatchableRows({ ...batch, rows: assignedRows }, assignedRows, "DSP-CUSTOMER");
    expect(orders[0].customerId).toBe("CUS-SAMPOERNA");
    expect(orders[0].customerName).toBe("Sampoerna");
    expect(orders[0].customerEntityName).toBe("PT HM Sampoerna Tbk");
  });

  test("dispatch readiness only allows assigned, resolved, reviewed rows", () => {
    const duplicate = makeRecord({ "PO Number": "PO-READY-DUP", Quantity: "8" });
    const batch = buildImportBatch(
      "dispatch-readiness.xlsx",
      "Sheet1",
      "Test",
      parsedRows([
        makeRecord({ "PO Number": "PO-READY-OK", Quantity: "4" }),
        duplicate,
        duplicate,
        makeRecord({ "PO Number": "PO-READY-BAD", "Item Code": "ITEM-NOT-IN-MASTER", "Item Name": "Unknown Sticker Format" }),
      ]),
    );
    const assignedBatch = {
      ...batch,
      rows: batch.rows.map((row) => assign(row, "SUP-001", "CV Cetakan Terbaik Sejagat")),
    };

    const readiness = getDispatchReadiness(assignedBatch);

    expect(readiness.dispatchableRows).toHaveLength(1);
    expect(readiness.dispatchableRows[0].raw.poNumber).toBe("PO-READY-OK");
    expect(readiness.pendingDuplicateRows).toHaveLength(2);
    expect(readiness.unresolvedAssignedRows).toHaveLength(1);
    expect(readiness.remainingUnassignedCount).toBe(0);
  });

  test("uploads, assigns, dispatches, and shows created ORs in admin and vendor flows", async ({ page }, testInfo) => {
    const workbookPath = testInfo.outputPath("bulk-ui-upload.xlsx");
    fs.mkdirSync(path.dirname(workbookPath), { recursive: true });
    writeOriginalStyleWorkbook(workbookPath, [
      makeRecord({ "PO Number": "PO-UI-A", "PO Line": "1", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "10" }),
      makeRecord({ "PO Number": "PO-UI-A", "PO Line": "2", Wcode: "WH055", "Sales Point": "Jakarta Barat", "Item Code": productBackwall.code, "Item Name": productBackwall.name, Quantity: "5" }),
      makeRecord({ "PO Number": "PO-UI-A", "PO Line": "3", Wcode: "WH071", "Sales Point": "Jakarta Selatan", Quantity: "20" }),
      makeRecord({ "PO Number": "PO-UI-A", "PO Line": "4", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "15" }),
      makeRecord({ "PO Number": "PO-UI-B", "PO Line": "1", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "12" }),
    ]);

    await page.goto(`${baseUrl}/customer/imports`);
    await page.locator('input[type="file"]').setInputFiles(workbookPath);

    await expect(page.getByText("Batch staged successfully")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("bulk-ui-upload.xlsx is now staged with 5 rows")).toBeVisible({ timeout: 15_000 });
    await page.goto(`${baseUrl}/admin/imports`);

    await expect(page.getByText("5 visible rows")).toBeVisible();
    await page.getByRole("button", { name: "Select all visible" }).click();
    await page.getByText("Select vendor...").click({ force: true });
    await page.getByRole("option", { name: "CV Cetakan Terbaik Sejagat" }).click();
    await page.getByRole("button", { name: /Assign selected rows/i }).click();
    await expect(page.getByText("0 visible rows · 0 assignable")).toBeVisible();
    const importAssignedButton = page.getByRole("button", { name: /Import assigned ORs/i });
    await importAssignedButton.scrollIntoViewIfNeeded();
    await importAssignedButton.click({ force: true });

    await expect(page.getByText("3 OR created")).toBeVisible();
    await page.goto(`${baseUrl}/admin/orders`);
    await expect(page.getByText("PO-UI-A").first()).toBeVisible();
    await expect(page.getByText("PO-UI-B").first()).toBeVisible();

    await page.goto(`${baseUrl}/vendor`);
    await page.getByRole("tab", { name: "Pending" }).click();
    await expect(page.getByText("PO-UI-A").first()).toBeVisible();
  });

  test("rehydrates a staged import batch after page refresh", async ({ page }, testInfo) => {
    const workbookPath = testInfo.outputPath("bulk-ui-refresh.xlsx");
    fs.mkdirSync(path.dirname(workbookPath), { recursive: true });
    writeOriginalStyleWorkbook(workbookPath, [
      makeRecord({ "PO Number": "PO-REFRESH-A", "PO Line": "1", Wcode: "WH055", "Sales Point": "Jakarta Barat", Quantity: "10" }),
      makeRecord({ "PO Number": "PO-REFRESH-A", "PO Line": "2", Wcode: "WH071", "Sales Point": "Jakarta Selatan", Quantity: "6" }),
    ]);

    await page.goto(`${baseUrl}/customer/imports`);
    await page.locator('input[type="file"]').setInputFiles(workbookPath);
    await expect(page.getByText("Batch staged successfully")).toBeVisible({ timeout: 15_000 });

    await page.goto(`${baseUrl}/admin/imports`);
    await expect(page.getByText("2 visible rows")).toBeVisible();

    await page.reload();
    await expect(page.getByText("2 visible rows")).toBeVisible();
    await expect(page.getByText("bulk-ui-refresh.xlsx").first()).toBeVisible();
  });

  test("requires duplicate review before assigning visible rows", async ({ page }, testInfo) => {
    const workbookPath = testInfo.outputPath("bulk-ui-duplicates.xlsx");
    fs.mkdirSync(path.dirname(workbookPath), { recursive: true });
    const duplicate = makeRecord({ "PO Number": "PO-UI-DUP", "PO Line": "1", Quantity: "10" });
    writeOriginalStyleWorkbook(workbookPath, [duplicate, duplicate]);

    await page.goto(`${baseUrl}/customer/imports`);
    await page.locator('input[type="file"]').setInputFiles(workbookPath);
    await expect(page.getByText("Batch staged successfully")).toBeVisible({ timeout: 15_000 });
    await page.goto(`${baseUrl}/admin/imports`);

    await expect(page.getByRole("tab", { name: /Possible duplicate/i })).toHaveAttribute("data-state", "active");
    await expect(page.getByRole("button", { name: "Select all visible" })).toBeDisabled();

    const importAnywayButtons = page.getByRole("button", { name: "Import anyway" });
    await importAnywayButtons.nth(1).click({ force: true });
    await importAnywayButtons.nth(0).click({ force: true });
    await page.getByRole("button", { name: "Select all visible" }).click();
    await page.getByText("Select vendor...").click({ force: true });
    await page.getByRole("option", { name: "CV Cetakan Terbaik Sejagat" }).click();
    await page.getByRole("button", { name: /Assign selected rows/i }).click();

    await expect(page.getByText("0 visible rows · 0 assignable")).toBeVisible();
  });
});
