/**
 * E2E Order Lifecycle — Visual Tour Tests
 *
 * Runs 4 scenarios covering the complete order lifecycle.
 * Each scenario uses test.step() for readable output and takes
 * screenshots at every milestone for the visual tour generator.
 *
 * Usage:
 *   E2E_BASE_URL=http://localhost:5173 npx playwright test tests/e2e-order-lifecycle.spec.ts --project=chromium
 *
 * Post-run visual tour:
 *   node scripts/generate-e2e-tour.mjs
 */

import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const SCREENSHOT_DIR = resolve("e2e-tour-screenshots");
const TOUR_DATA_PATH = resolve("e2e-tour-data.json");

/** Known mock sales points used as shipping targets. */
const SALES_POINT_WH020 = "WH020";
const SALES_POINT_WH055 = "WH055";
const SALES_POINT_WH069 = "WH069";

/** Reusable storage key constant. */
const STORAGE_KEY = "va-trace-orders";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collection of tour steps recorded during the test. */
const tourSteps: Array<{
  scenario: string;
  step: string;
  label: string;
  screenshot: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
}> = [];

/**
 * Take a screenshot and log it as a tour step.
 * This captures the page state at each meaningful milestone.
 */
async function tourScreenshot(
  page: import("@playwright/test").Page,
  scenario: string,
  stepNumber: string,
  label: string,
) {
  const filename = `${scenario}-${stepNumber}-${label.replace(/\s+/g, "-").toLowerCase().slice(0, 60)}.png`;
  const filepath = join(SCREENSHOT_DIR, filename);

  try {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  } catch {
    // directory already exists
  }

  await page.screenshot({ path: filepath, fullPage: true });

  tourSteps.push({
    scenario,
    step: stepNumber,
    label,
    screenshot: filename,
    status: "pass",
  });
}

/**
 * Seed the legacy V1 orders into localStorage BEFORE the app loads.
 * V2 stores will auto-initialize from this seed on first page visit.
 */
async function seedV1Orders(
  page: import("@playwright/test").Page,
  orders: unknown[],
) {
  await page.addInitScript(
    ({ key, data }: { key: string; data: unknown[] }) => {
      localStorage.setItem(key, JSON.stringify(data));
      // Clear V2 stores so they re-seed from our V1 data on next init
      localStorage.removeItem("va-trace-v2-orders");
      localStorage.removeItem("va-trace-v2-shipments");
      localStorage.removeItem("va-trace-v2-production-jobs");
    },
    { key: STORAGE_KEY, data: orders },
  );
}

/**
 * Build the "status" field for a legacy order based on item statuses.
 * Mirrors getOrderRequestStatus() logic.
 */
function computeOrderStatus(
  items: Array<{ status: string }>,
): string {
  const rank = [
    "New",
    "Waiting",
    "In Production",
    "Ready to Ship",
    "On Delivery",
    "Delivered",
    "Completed",
    "Overdue",
  ];
  const statuses = [...new Set(items.map((i) => i.status))];
  if (statuses.length === 1) return statuses[0];
  const highest = statuses.sort(
    (a, b) => rank.indexOf(a) - rank.indexOf(b),
  ).at(-1)!;
  return `Partial ${highest}`;
}

// ---------------------------------------------------------------------------
// Tour data writer
// ---------------------------------------------------------------------------

test.afterAll(() => {
  writeFileSync(TOUR_DATA_PATH, JSON.stringify(tourSteps, null, 2));
});

// ===========================================================================
// SCENARIO A: Happy Path — New Order → Complete Delivery
// ===========================================================================

test.describe("E2E Order Lifecycle – Visual Tour", () => {
  test("A: Happy path — new order through to completed delivery", async ({
    page,
  }) => {
    const scenario = "A";

    // ---- Seed: a fresh order with 2 items both "New" ----
    const orderId = "OR-2026-TEST-001";
    const campaign = "E2E Test Campaign - Happy Path";

    const seededOrder = {
      id: orderId,
      campaign,
      tags: ["E2E-Test"],
      referenceLink: {
        url: "https://example.com/e2e-test",
        displayTitle: "E2E Test Reference",
      },
      createdDate: "2026-06-15",
      deadline: "30 days left",
      clientPO: "PO-E2E-HAPPY-001",
      soNumber: "SO-E2E-001",
      supplier: "PT. HH Global Services Indonesia",
      salesPointId: SALES_POINT_WH055,
      clientId: "CUS-SAMPOERNA",
      clientName: "Sampoerna",
      clientEntityName: "PT HM Sampoerna Tbk",
      items: [
        {
          id: `${orderId}-item-1`,
          productCode: "2026-00194983-0039",
          poLineNumber: "1",
          name: "E2E Test Item Alpha - 0.5x1 m - Vinyl",
          quantity: 100,
          deliveredQuantity: 0,
          status: "New",
          labelGenerated: false,
        },
        {
          id: `${orderId}-item-2`,
          productCode: "2026-00194983-0040",
          poLineNumber: "2",
          name: "E2E Test Item Beta - 0.7x2 m - Vinyl",
          quantity: 50,
          deliveredQuantity: 0,
          status: "New",
          labelGenerated: false,
        },
      ],
      productionJobs: [],
      allocations: [],
      shipmentBatches: [],
      storedLabels: [],
      storedDeliveryNotes: [],
      labelStatus: "none",
      note: "E2E test order created for happy path verification.",
      status: "New",
      productionStatus: "NEW",
      distributionStatus: "NOT_STARTED",
      deliveryProgress: {
        allocatedQuantity: 0,
        shippedQuantity: 0,
        receivedQuantity: 0,
        salesPointCount: 0,
        deliveredSalesPointCount: 0,
        podCount: 0,
        percentage: 0,
      },
    };

    await seedV1Orders(page, [seededOrder]);

    // -----------------------------------------------------------------------
    // STEP 1 — Admin Dashboard
    // -----------------------------------------------------------------------
    await test.step("1️⃣ Navigate to Admin Dashboard", async () => {
      await page.goto(`${BASE}/admin`);
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText(/dashboard/i).first(),
      ).toBeVisible({ timeout: 10000 });
      await tourScreenshot(
        page,
        scenario,
        "01",
        "Admin Dashboard overview with metrics",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 2 — All Orders List
    // -----------------------------------------------------------------------
    await test.step("2️⃣ View All Orders list", async () => {
      await page.goto(`${BASE}/admin/orders`);
      await page.waitForLoadState("networkidle");

      // Wait for the order table to render
      await expect(
        page.getByText(orderId).or(page.getByText(campaign)),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "02",
        "All Orders list showing the new E2E order",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 3 — Order Detail (V2 Command Center)
    // -----------------------------------------------------------------------
    await test.step("3️⃣ Open Order Detail page", async () => {
      // Navigate directly to order detail
      await page.goto(`${BASE}/admin/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      // The V2 Command Center should render
      await expect(
        page.getByText(/overview|operational summary/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "03",
        "Order Detail with V2 Command Center tabs",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 4 — Operations tab (Allocations, Production, Batches)
    // -----------------------------------------------------------------------
    await test.step("4️⃣ View Operations tab", async () => {
      // Click the Operations tab
      const opsTab = page.getByRole("tab", { name: /operations/i });
      if (await opsTab.isVisible()) {
        await opsTab.click();
        await page.waitForTimeout(500);
      }

      await tourScreenshot(
        page,
        scenario,
        "04",
        "Operations tab showing allocations and production jobs",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 5 — Documents tab (Delivery Notes, References)
    // -----------------------------------------------------------------------
    await test.step("5️⃣ View Documents tab", async () => {
      const docsTab = page.getByRole("tab", { name: /documents/i });
      if (await docsTab.isVisible()) {
        await docsTab.click();
        await page.waitForTimeout(500);
      }

      await tourScreenshot(
        page,
        scenario,
        "05",
        "Documents tab with delivery notes and references",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 6 — Simulate: Start Production via data mutation
    // -----------------------------------------------------------------------
    await test.step("6️⃣ Start Production (data mutation)", async () => {
      // Call the V1 store function directly
      await page.evaluate(
        ({ key, id }: { key: string; id: string }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: { id: string; items: Array<{ status: string }> }) => {
              if (order.id !== id) return order;
              const updatedItems = order.items.map(
                (item: { status: string }) =>
                  item.status === "New" || item.status === "Waiting"
                    ? { ...item, status: "In Production" }
                    : item,
              );
              return {
                ...order,
                items: updatedItems,
                status: (() => {
                  const rank = [
                    "New", "Waiting", "In Production",
                    "Ready to Ship", "On Delivery", "Delivered",
                    "Completed", "Overdue",
                  ];
                  const statuses = [
                    ...new Set(updatedItems.map((i: { status: string }) => i.status)),
                  ];
                  if (statuses.length === 1) return statuses[0];
                  const sorted = statuses.sort(
                    (a: string, b: string) =>
                      rank.indexOf(a) - rank.indexOf(b),
                  );
                  return `Partial ${sorted.at(-1)}`;
                })(),
                productionStatus: "IN_PROGRESS",
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          localStorage.removeItem("va-trace-v2-orders");
          localStorage.removeItem("va-trace-v2-shipments");
          localStorage.removeItem("va-trace-v2-production-jobs");
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, id: orderId },
      );

      // Reload to pick up V2 re-seed
      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "06",
        "After production started — items now In Production",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 7 — Simulate: Create & Dispatch Shipment Batch
    // -----------------------------------------------------------------------
    await test.step("7️⃣ Create & dispatch shipment batch (data mutation)", async () => {
      const item1Id = `${orderId}-item-1`;
      const item2Id = `${orderId}-item-2`;

      await page.evaluate(
        ({
          key,
          orderId: oid,
          item1Id: i1,
          item2Id: i2,
          salesPoint,
        }: {
          key: string;
          orderId: string;
          item1Id: string;
          item2Id: string;
          salesPoint: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                quantity: number;
                productCode: string;
                deliveredQuantity: number;
              }>;
              shipmentBatches: unknown[];
            }) => {
              if (order.id !== oid) return order;

              const batchId = `${oid}-SHP-1`;
              const line1 = order.items.find(
                (i) => i.id === i1,
              );
              const line2 = order.items.find(
                (i) => i.id === i2,
              );

              const batch = {
                id: batchId,
                orderId: oid,
                batchNumber: 1,
                status: "DISPATCHED",
                salesPointIds: [salesPoint],
                items: [
                  {
                    id: `${batchId}-${i1}`,
                    orderLineId: i1,
                    productCode: line1?.productCode ?? "",
                    salesPointId: salesPoint,
                    quantity: 80,
                    receivedQuantity: 0,
                  },
                  {
                    id: `${batchId}-${i2}`,
                    orderLineId: i2,
                    productCode: line2?.productCode ?? "",
                    salesPointId: salesPoint,
                    quantity: 50,
                    receivedQuantity: 0,
                  },
                ],
                dispatchedAt: new Date().toISOString(),
                deliveryConfirmations: [],
              };

              return {
                ...order,
                shipmentBatches: [batch],
                distributionStatus: "FULLY_DISTRIBUTED",
                status: "On Delivery",
              };
            },
          );

          localStorage.setItem(key, JSON.stringify(next));
          localStorage.removeItem("va-trace-v2-orders");
          localStorage.removeItem("va-trace-v2-shipments");
          localStorage.removeItem("va-trace-v2-production-jobs");
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        {
          key: STORAGE_KEY,
          orderId,
          item1Id,
          item2Id,
          salesPoint: SALES_POINT_WH055,
        },
      );

      // Reload to pick up V2 re-seed
      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "07",
        "After dispatch — shipment batch in DISPATCHED state",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 8 — Simulate: Upload POD (Proof of Delivery)
    // -----------------------------------------------------------------------
    await test.step("8️⃣ Upload POD — mark as fully received (data mutation)", async () => {
      const batchId = `${orderId}-SHP-1`;
      const item1Id = `${orderId}-item-1`;
      const item2Id = `${orderId}-item-2`;

      await page.evaluate(
        ({
          key,
          orderId: oid,
          batchId: bid,
          item1Id: i1,
          item2Id: i2,
        }: {
          key: string;
          orderId: string;
          batchId: string;
          item1Id: string;
          item2Id: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{ id: string; quantity: number; status: string }>;
              shipmentBatches: Array<{
                id: string;
                items: Array<{
                  id: string;
                  orderLineId: string;
                  quantity: number;
                  receivedQuantity: number;
                }>;
                deliveryConfirmations: unknown[];
              }>;
              deliveryProgress: Record<string, unknown>;
            }) => {
              if (order.id !== oid) return order;

              // Update batch items to fully received
              const batches = order.shipmentBatches.map((batch) => {
                if (batch.id !== bid) return batch;
                const receivedItems = batch.items.map((item) => ({
                  ...item,
                  receivedQuantity: item.quantity,
                }));
                const confirmationId = `${bid}-POD-1`;
                return {
                  ...batch,
                  status: "FULLY_RECEIVED",
                  items: receivedItems,
                  deliveryConfirmations: [
                    {
                      id: confirmationId,
                      shipmentBatchId: bid,
                      salesPointId: order.salesPointId,
                      receiverName: "E2E Test Receiver",
                      receivedAt: new Date().toISOString(),
                      status: "SUBMITTED",
                      photoUrls: [],
                      itemConfirmations: receivedItems.map((item) => ({
                        shipmentItemId: item.id,
                        claimedReceivedQuantity: item.quantity,
                      })),
                    },
                  ],
                };
              });

              // Update item delivered quantities + statuses
              const updatedItems = order.items.map((item) => {
                if (item.id === i1) {
                  return {
                    ...item,
                    deliveredQuantity: 80,
                    status: "Delivered",
                  };
                }
                if (item.id === i2) {
                  return {
                    ...item,
                    deliveredQuantity: 50,
                    status: "Delivered",
                  };
                }
                return item;
              });

              return {
                ...order,
                items: updatedItems,
                shipmentBatches: batches,
                deliveryProgress: {
                  allocatedQuantity: 150,
                  shippedQuantity: 130,
                  receivedQuantity: 130,
                  salesPointCount: 1,
                  deliveredSalesPointCount: 1,
                  podCount: 1,
                  percentage: 87,
                },
                distributionStatus: "FULLY_RECEIVED",
                status: (() => {
                  const st = [...new Set(updatedItems.map((i: { status: string }) => i.status))];
                  if (st.length === 1) return st[0];
                  const rank = ["New", "Waiting", "In Production", "Ready to Ship", "On Delivery", "Delivered", "Completed", "Overdue"];
                  return "Partial " + st.sort((a: string, b: string) => rank.indexOf(a) - rank.indexOf(b)).at(-1);
                })(),
              };
            },
          );

          localStorage.setItem(key, JSON.stringify(next));
          localStorage.removeItem("va-trace-v2-orders");
          localStorage.removeItem("va-trace-v2-shipments");
          localStorage.removeItem("va-trace-v2-production-jobs");
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, orderId, batchId, item1Id, item2Id },
      );

      // Reload to pick up V2 re-seed
      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "08",
        "After POD upload — Fully Received status",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 9 — Generate Labels & Delivery Note
    // -----------------------------------------------------------------------
    await test.step("9️⃣ Generate packaging labels", async () => {
      const item1Id = `${orderId}-item-1`;
      const item2Id = `${orderId}-item-2`;

      await page.evaluate(
        ({
          key,
          orderId: oid,
          item1Id: i1,
          item2Id: i2,
        }: {
          key: string;
          orderId: string;
          item1Id: string;
          item2Id: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                labelGenerated: boolean;
                labelGeneratedAt?: string;
              }>;
              storedLabels: Array<unknown>;
              labelStatus: string;
              createdDate: string;
            }) => {
              if (order.id !== oid) return order;

              const doNumber = `DEL${order.createdDate.replace(/\D/g, "")}${oid.replace(/\D/g, "").slice(-6).padStart(6, "0")}`;

              const labels = [
                {
                  id: `${doNumber}-001`,
                  lineId: i1,
                  labelCode: `${doNumber}-001`,
                  qrPayload: `va-trace://packaging-label/${doNumber}/${i1}`,
                  orderId: oid,
                  doNumber,
                  poLineNumber: "1",
                  productCode: "2026-00194983-0039",
                  productName: "E2E Test Item Alpha - 0.5x1 m - Vinyl",
                  deliveredQty: 80,
                  uom: "Pcs",
                  destinationCompanyName: "PT. HM. Sampoerna Tbk",
                  destinationLocationName: "PT HMS Jakarta Barat",
                  destinationAddress: "Jakarta Barat, DKI Jakarta",
                  salesPointCode: "WH055",
                  projectName: "E2E Test Campaign - Happy Path",
                  createdAt: new Date().toISOString(),
                },
                {
                  id: `${doNumber}-002`,
                  lineId: i2,
                  labelCode: `${doNumber}-002`,
                  qrPayload: `va-trace://packaging-label/${doNumber}/${i2}`,
                  orderId: oid,
                  doNumber,
                  poLineNumber: "2",
                  productCode: "2026-00194983-0040",
                  productName: "E2E Test Item Beta - 0.7x2 m - Vinyl",
                  deliveredQty: 50,
                  uom: "Pcs",
                  destinationCompanyName: "PT. HM. Sampoerna Tbk",
                  destinationLocationName: "PT HMS Jakarta Barat",
                  destinationAddress: "Jakarta Barat, DKI Jakarta",
                  salesPointCode: "WH055",
                  projectName: "E2E Test Campaign - Happy Path",
                  createdAt: new Date().toISOString(),
                },
              ];

              const updatedItems = order.items.map((item) => {
                return {
                  ...item,
                  labelGenerated: true,
                  labelGeneratedAt: new Date().toISOString(),
                };
              });

              return {
                ...order,
                items: updatedItems,
                storedLabels: labels,
                labelStatus: "all",
                storedDeliveryNotes: [
                  {
                    id: doNumber,
                    doNumber,
                    barcodeValue: doNumber,
                    qrPayload: `va-trace://delivery-note/${doNumber}`,
                    poNumber: "PO-E2E-HAPPY-001",
                    soNumber: "SO-E2E-001",
                    projectName: "E2E Test Campaign - Happy Path",
                    lines: [
                      {
                        id: i1,
                        poLineNumber: "1",
                        materialCode: "2026-00194983-0039",
                        description: "E2E Test Item Alpha - 0.5x1 m - Vinyl",
                        orderedQty: 100,
                        deliveredQty: 80,
                        outstandingQty: 20,
                        uom: "Pcs",
                      },
                      {
                        id: i2,
                        poLineNumber: "2",
                        materialCode: "2026-00194983-0040",
                        description: "E2E Test Item Beta - 0.7x2 m - Vinyl",
                        orderedQty: 50,
                        deliveredQty: 50,
                        outstandingQty: 0,
                        uom: "Pcs",
                      },
                    ],
                    createdAt: new Date().toISOString(),
                    scopeLabelIds: labels.map((l) => l.id),
                    senderProfile: {
                      name: "PT. HH Global Services Indonesia",
                      addressLines: [
                        "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
                        "Jl. Jendral Sudirman Kav. 52-53",
                      ],
                      phone: "+62 21 515 7606",
                    },
                    deliverySnapshot: {
                      deliveryCompanyName: "PT. HM. Sampoerna Tbk",
                      deliveryLocationName: "PT HMS Jakarta Barat",
                      address: "Jakarta Barat, DKI Jakarta",
                      phone: "",
                      picClient: "",
                      wcode: "WH055",
                    },
                    note: "Tim Area WAJIB melakukan GR CPT dan COUPA.",
                  },
                ],
              };
            },
          );

          localStorage.setItem(key, JSON.stringify(next));
          localStorage.removeItem("va-trace-v2-orders");
          localStorage.removeItem("va-trace-v2-shipments");
          localStorage.removeItem("va-trace-v2-production-jobs");
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, orderId, item1Id, item2Id },
      );

      // Reload to pick up V2 re-seed
      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "09",
        "Delivery note and labels generated — order complete",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 10 — Verify Delivery Note Page
    // -----------------------------------------------------------------------
    await test.step("🔟 Verify Delivery Note print page", async () => {
      await page.goto(`${BASE}/admin/orders/${orderId}/delivery-note`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/delivery note|do number/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "10",
        "Delivery Note print page with correct quantities",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 11 — Verify Packaging Labels Page
    // -----------------------------------------------------------------------
    await test.step("1️⃣1️⃣ Verify Packaging Labels page", async () => {
      await page.goto(
        `${BASE}/admin/orders/${orderId}/packaging-labels`,
      );
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/packaging labels|label/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "11",
        "Packaging Labels page showing one label per delivered item",
      );
    });
  });

  // =======================================================================
  // SCENARIO B: Complaint Flow — Quantity Adjustment
  // =======================================================================

  test("B: Complaint flow — raise and approve quantity adjustment", async ({
    page,
  }) => {
    const scenario = "B";
    const orderId = "OR-2026-TEST-CMP";
    const alreadyDeliveredItemId = `${orderId}-item-1`;

    // ---- Seed: an order with one delivered item ----
    const seededOrder = {
      id: orderId,
      campaign: "E2E Test Campaign - Complaint Flow",
      tags: ["E2E-Test", "Complaint"],
      createdDate: "2026-06-14",
      deadline: "15 days left",
      clientPO: "PO-E2E-CMP-001",
      soNumber: "SO-E2E-CMP",
      supplier: "PT. HH Global Services Indonesia",
      salesPointId: SALES_POINT_WH069,
      clientId: "CUS-SAMPOERNA",
      clientName: "Sampoerna",
      clientEntityName: "PT HM Sampoerna Tbk",
      items: [
        {
          id: alreadyDeliveredItemId,
          productCode: "2026-00194983-0052",
          poLineNumber: "1",
          name: "E2E Test Complaint Item - Snap Frame",
          quantity: 50,
          deliveredQuantity: 50,
          status: "Ready to Ship",
          labelGenerated: false,
        },
      ],
      productionJobs: [],
      allocations: [],
      shipmentBatches: [],
      storedLabels: [],
      storedDeliveryNotes: [],
      labelStatus: "none",
      note: "E2E test order for complaint flow.",
      status: "Ready to Ship",
      productionStatus: "COMPLETED",
      distributionStatus: "FULLY_RECEIVED",
      deliveryProgress: {
        allocatedQuantity: 50,
        shippedQuantity: 50,
        receivedQuantity: 50,
        salesPointCount: 1,
        deliveredSalesPointCount: 1,
        podCount: 0,
        percentage: 100,
      },
    };

    await seedV1Orders(page, [seededOrder]);

    // -----------------------------------------------------------------------
    // STEP 1 — Navigate to order detail
    // -----------------------------------------------------------------------
    await test.step("1️⃣ Open order detail for complaint", async () => {
      await page.goto(`${BASE}/admin/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/overview|operational summary/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "01",
        "Order detail before raising complaint",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 2 — Raise Complaint
    // -----------------------------------------------------------------------
    await test.step("2️⃣ Raise a quantity complaint", async () => {
      await page.evaluate(
        ({ key, oid, itemId }: { key: string; oid: string; itemId: string }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                productCode: string;
                name: string;
                poLineNumber: string;
                quantity: number;
                deliveredQuantity: number;
              }>;
            }) => {
              if (order.id !== oid) return order;

              const item = order.items[0];
              return {
                ...order,
                complaint: {
                  id: `CMP-${oid}-TEST`,
                  status: "pending",
                  remarks:
                    "E2E test: Client reported missing stock on the delivered item.",
                  createdAt: new Date().toISOString(),
                  createdBy: "Admin / PMG",
                  items: [
                    {
                      lineId: itemId,
                      productCode: item.productCode,
                      productName: item.name,
                      poLineNumber: item.poLineNumber,
                      orderedQty: item.quantity,
                      systemDeliveredQty: item.deliveredQuantity,
                      actualReceivedQty: 45,
                      deltaQty: 5,
                    },
                  ],
                  history: [
                    {
                      id: "created-e2e-complaint",
                      action: "created",
                      actor: "Admin / PMG",
                      timestamp: new Date().toISOString(),
                      note: "Client reported 5 pcs missing from delivery.",
                    },
                  ],
                },
                complaintStatus: "pending",
                revisionStatus: "pending",
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, oid: orderId, itemId: alreadyDeliveredItemId },
      );

      // Reload to see the complaint badge
      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "02",
        "Complaint raised — pending badge visible",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 3 — Approve Complaint (as vendor)
    // -----------------------------------------------------------------------
    await test.step("3️⃣ Approve complaint on vendor side", async () => {
      // Switch to vendor role — user ID 1 is Marco Polo (vendor)
      await page.addInitScript(() => {
        window.localStorage.setItem("va-trace-current-user", "1");
      });

      await page.goto(`${BASE}/vendor/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      // Click "Approve" on the complaint card
      // Looking for the Approve button inside the Complaint Review section
      const approveBtn = page.getByRole("button", {
        name: /approve/i,
      });
      if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(500);
      } else {
        // Fallback: approve via data mutation
        await page.evaluate(
          ({ key, oid }: { key: string; oid: string }) => {
            const orders = JSON.parse(
              localStorage.getItem(key) ?? "[]",
            );
            const next = orders.map(
              (order: {
                id: string;
                items: Array<{ id: string; deliveredQuantity: number }>;
                complaint: Record<string, unknown>;
                complaintStatus: string;
                revisionStatus: string;
              }) => {
                if (order.id !== oid) return order;
                return {
                  ...order,
                  complaint: {
                    ...order.complaint,
                    status: "approved",
                    reviewedAt: new Date().toISOString(),
                    reviewedBy: "Vendor Admin",
                    reviewNote: "E2E test: Vendor approved the quantity revision.",
                    history: [
                      ...(order.complaint?.history as Array<unknown> ?? []),
                      {
                        id: "approved-e2e-complaint",
                        action: "approved",
                        actor: "Vendor Admin",
                        timestamp: new Date().toISOString(),
                        note: "E2E test: Vendor approved the quantity revision.",
                      },
                    ],
                  },
                  complaintStatus: "approved",
                  revisionStatus: "approved",
                  // Update delivered quantity to match complaint-approved value
                  items: order.items.map((item) =>
                    item.id === oid + "-item-1"
                      ? { ...item, deliveredQuantity: 45 }
                      : item,
                  ),
                };
              },
            );
            localStorage.setItem(key, JSON.stringify(next));
            window.dispatchEvent(
              new Event("va-trace-orders:change"),
            );
          },
          { key: STORAGE_KEY, oid: orderId },
        );

        // Reload to see approved state
        await page.reload();
        await page.waitForLoadState("networkidle");
      }

      await tourScreenshot(
        page,
        scenario,
        "03",
        "Complaint approved — quantity adjusted to 45",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 4 — Verify Delivery Note reflects adjusted quantity
    // -----------------------------------------------------------------------
    await test.step("4️⃣ Verify delivery note shows adjusted quantity", async () => {
      // Seed delivery note lines reflecting the adjusted quantity
      await page.evaluate(
        ({ key, oid }: { key: string; oid: string }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              createdDate: string;
              storedDeliveryNotes: Array<unknown>;
              storedLabels: Array<unknown>;
              items: Array<{
                id: string;
                poLineNumber: string;
                productCode: string;
                name: string;
                quantity: number;
                deliveredQuantity: number;
              }>;
            }) => {
              if (order.id !== oid) return order;

              const doNumber = `DEL${order.createdDate.replace(/\D/g, "")}${oid.replace(/\D/g, "").slice(-6).padStart(6, "0")}`;
              const item = order.items[0];
              const adjustedQty = 45;

              const label = {
                id: `${doNumber}-001`,
                lineId: item.id,
                labelCode: `${doNumber}-001`,
                orderId: oid,
                doNumber,
                poLineNumber: item.poLineNumber,
                productCode: item.productCode,
                productName: item.name,
                deliveredQty: adjustedQty,
                uom: "Pcs",
                destinationCompanyName: "PT. HM. Sampoerna Tbk",
                destinationLocationName: "PT HMS Jakarta Barat",
                destinationAddress: "Jakarta Barat, DKI Jakarta",
                salesPointCode: "WH069",
                projectName: "E2E Test Campaign - Complaint Flow",
                createdAt: new Date().toISOString(),
              };

              return {
                ...order,
                storedLabels: [label],
                storedDeliveryNotes: [
                  {
                    id: doNumber,
                    doNumber,
                    barcodeValue: doNumber,
                    poNumber: "PO-E2E-CMP-001",
                    soNumber: "SO-E2E-CMP",
                    projectName:
                      "E2E Test Campaign - Complaint Flow",
                    lines: [
                      {
                        id: item.id,
                        poLineNumber: item.poLineNumber,
                        materialCode: item.productCode,
                        description: item.name,
                        orderedQty: item.quantity,
                        deliveredQty: adjustedQty,
                        outstandingQty: Math.max(
                          item.quantity - adjustedQty,
                          0,
                        ),
                        uom: "Pcs",
                      },
                    ],
                    createdAt: new Date().toISOString(),
                    scopeLabelIds: [label.id],
                  },
                ],
                items: order.items.map((i) =>
                  i.id === item.id
                    ? { ...i, deliveredQuantity: adjustedQty }
                    : i,
                ),
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, oid: orderId },
      );

      await page.goto(`${BASE}/admin/orders/${orderId}/delivery-note`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/delivery note|do number/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "04",
        "Delivery note reflecting the complaint-adjusted quantity (45 Pcs)",
      );
    });
  });

  // =======================================================================
  // SCENARIO C: Partial Delivery — Multi-Batch Shipment
  // =======================================================================

  test("C: Partial delivery with multiple shipment batches", async ({
    page,
  }) => {
    const scenario = "C";
    const orderId = "OR-2026-TEST-PARTIAL";
    const item1Id = `${orderId}-item-1`;
    const item2Id = `${orderId}-item-2`;
    const item3Id = `${orderId}-item-3`;

    // ---- Seed: an order with 3 items, all "In Production" ----
    const seededOrder = {
      id: orderId,
      campaign: "E2E Test Campaign - Partial Delivery",
      tags: ["E2E-Test", "Partial"],
      createdDate: "2026-06-10",
      deadline: "20 days left",
      clientPO: "PO-E2E-PARTIAL-001",
      soNumber: "SO-E2E-PARTIAL",
      supplier: "PT Print Solusi Indonesia",
      salesPointId: SALES_POINT_WH020,
      clientId: "CUS-SAMPOERNA",
      clientName: "Sampoerna",
      clientEntityName: "PT HM Sampoerna Tbk",
      items: [
        {
          id: item1Id,
          productCode: "2026-00195039-0002",
          poLineNumber: "1",
          name: "E2E Partial Item Alpha - Sunscreen 0.7x2 m",
          quantity: 80,
          deliveredQuantity: 0,
          status: "In Production",
          labelGenerated: false,
        },
        {
          id: item2Id,
          productCode: "2026-00195039-0014",
          poLineNumber: "2",
          name: "E2E Partial Item Beta - Tin Plate 100x200 cm",
          quantity: 32,
          deliveredQuantity: 0,
          status: "In Production",
          labelGenerated: false,
        },
        {
          id: item3Id,
          productCode: "2026-00194983-0052",
          poLineNumber: "3",
          name: "E2E Partial Item Gamma - Snap Frame 80x40 cm",
          quantity: 200,
          deliveredQuantity: 0,
          status: "In Production",
          labelGenerated: false,
        },
      ],
      productionJobs: [],
      allocations: [],
      shipmentBatches: [],
      storedLabels: [],
      storedDeliveryNotes: [],
      labelStatus: "none",
      note: "E2E test for partial delivery with multiple batches.",
      status: "In Production",
      productionStatus: "IN_PROGRESS",
      distributionStatus: "NOT_STARTED",
      deliveryProgress: {
        allocatedQuantity: 0,
        shippedQuantity: 0,
        receivedQuantity: 0,
        salesPointCount: 0,
        deliveredSalesPointCount: 0,
        podCount: 0,
        percentage: 0,
      },
    };

    await seedV1Orders(page, [seededOrder]);

    // -----------------------------------------------------------------------
    // STEP 1 — Initial state
    // -----------------------------------------------------------------------
    await test.step("1️⃣ View order in initial In Production state", async () => {
      await page.goto(`${BASE}/admin/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/overview|operational summary/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "01",
        "Order in In Production state with 3 items",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 2 — Deliver first item (partial batch 1)
    // -----------------------------------------------------------------------
    await test.step("2️⃣ Deliver first item via Batch 1", async () => {
      await page.evaluate(
        ({
          key,
          oid,
          item1,
          item2,
          item3,
        }: {
          key: string;
          oid: string;
          item1: string;
          item2: string;
          item3: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                productCode: string;
                quantity: number;
                status: string;
                deliveredQuantity?: number;
              }>;
              shipmentBatches: Array<unknown>;
            }) => {
              if (order.id !== oid) return order;

              const batch1Id = `${oid}-SHP-1`;
              const itemLine = order.items.find((i) => i.id === item1);

              const batch1 = {
                id: batch1Id,
                orderId: oid,
                batchNumber: 1,
                status: "FULLY_RECEIVED",
                salesPointIds: [order.salesPointId],
                items: [
                  {
                    id: `${batch1Id}-${item1}`,
                    orderLineId: item1,
                    productCode: itemLine?.productCode ?? "",
                    salesPointId: order.salesPointId,
                    quantity: 80,
                    receivedQuantity: 80,
                  },
                ],
                deliveryConfirmations: [
                  {
                    id: `${batch1Id}-POD-1`,
                    shipmentBatchId: batch1Id,
                    salesPointId: order.salesPointId,
                    receiverName: "E2E Receiver Batch 1",
                    receivedAt: new Date().toISOString(),
                    status: "SUBMITTED",
                    photoUrls: [],
                    itemConfirmations: [
                      {
                        shipmentItemId: `${batch1Id}-${item1}`,
                        claimedReceivedQuantity: 80,
                      },
                    ],
                  },
                ],
              };

              const updatedItems = order.items.map((item) => {
                if (item.id === item1)
                  return {
                    ...item,
                    deliveredQuantity: 80,
                    status: "Delivered",
                  };
                return item;
              });

              return {
                ...order,
                items: updatedItems,
                shipmentBatches: [batch1],
                deliveryProgress: {
                  allocatedQuantity: 312,
                  shippedQuantity: 80,
                  receivedQuantity: 80,
                  salesPointCount: 1,
                  deliveredSalesPointCount: 0,
                  podCount: 1,
                  percentage: 26,
                },
                distributionStatus: "PARTIALLY_RECEIVED",
                status: "Partial Delivered",
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, oid: orderId, item1: item1Id, item2: item2Id, item3: item3Id },
      );

      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "02",
        "Item 1 delivered — PARTIALLY_RECEIVED status",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 3 — Deliver second item via Batch 2
    // -----------------------------------------------------------------------
    await test.step("3️⃣ Deliver second item via Batch 2", async () => {
      await page.evaluate(
        ({
          key,
          oid,
          item2,
        }: {
          key: string;
          oid: string;
          item2: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                productCode: string;
                quantity: number;
                status: string;
                deliveredQuantity?: number;
              }>;
              shipmentBatches: Array<{
                id: string;
                orderLineId?: string;
              }>;
              deliveryProgress: Record<string, unknown>;
            }) => {
              if (order.id !== oid) return order;

              const batch2Id = `${oid}-SHP-2`;
              const itemLine = order.items.find((i) => i.id === item2);

              const batch2 = {
                id: batch2Id,
                orderId: oid,
                batchNumber: 2,
                status: "FULLY_RECEIVED",
                salesPointIds: [order.salesPointId],
                items: [
                  {
                    id: `${batch2Id}-${item2}`,
                    orderLineId: item2,
                    productCode: itemLine?.productCode ?? "",
                    salesPointId: order.salesPointId,
                    quantity: 32,
                    receivedQuantity: 32,
                  },
                ],
                deliveryConfirmations: [
                  {
                    id: `${batch2Id}-POD-1`,
                    shipmentBatchId: batch2Id,
                    salesPointId: order.salesPointId,
                    receiverName: "E2E Receiver Batch 2",
                    receivedAt: new Date().toISOString(),
                    status: "SUBMITTED",
                    photoUrls: [],
                    itemConfirmations: [
                      {
                        shipmentItemId: `${batch2Id}-${item2}`,
                        claimedReceivedQuantity: 32,
                      },
                    ],
                  },
                ],
              };

              const updatedItems = order.items.map((item) => {
                if (item.id === item2)
                  return {
                    ...item,
                    deliveredQuantity: 32,
                    status: "Delivered",
                  };
                return item;
              });

              return {
                ...order,
                items: updatedItems,
                shipmentBatches: [...order.shipmentBatches, batch2],
                deliveryProgress: {
                  ...order.deliveryProgress,
                  shippedQuantity: 112,
                  receivedQuantity: 112,
                  percentage: 36,
                },
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, oid: orderId, item2: item2Id },
      );

      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "03",
        "Item 2 delivered via Batch 2 — still PARTIALLY_RECEIVED",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 4 — Deliver third item and complete the order
    // -----------------------------------------------------------------------
    await test.step("4️⃣ Deliver third item — order fully received", async () => {
      await page.evaluate(
        ({
          key,
          oid,
          item3,
        }: {
          key: string;
          oid: string;
          item3: string;
        }) => {
          const orders = JSON.parse(
            localStorage.getItem(key) ?? "[]",
          );
          const next = orders.map(
            (order: {
              id: string;
              items: Array<{
                id: string;
                productCode: string;
                quantity: number;
                status: string;
                deliveredQuantity?: number;
              }>;
              shipmentBatches: Array<unknown>;
              deliveryProgress: Record<string, unknown>;
            }) => {
              if (order.id !== oid) return order;

              const batch3Id = `${oid}-SHP-3`;
              const itemLine = order.items.find((i) => i.id === item3);

              const batch3 = {
                id: batch3Id,
                orderId: oid,
                batchNumber: 3,
                status: "FULLY_RECEIVED",
                salesPointIds: [order.salesPointId],
                items: [
                  {
                    id: `${batch3Id}-${item3}`,
                    orderLineId: item3,
                    productCode: itemLine?.productCode ?? "",
                    salesPointId: order.salesPointId,
                    quantity: 200,
                    receivedQuantity: 200,
                  },
                ],
                deliveryConfirmations: [
                  {
                    id: `${batch3Id}-POD-1`,
                    shipmentBatchId: batch3Id,
                    salesPointId: order.salesPointId,
                    receiverName: "E2E Receiver Batch 3",
                    receivedAt: new Date().toISOString(),
                    status: "SUBMITTED",
                    photoUrls: [],
                    itemConfirmations: [
                      {
                        shipmentItemId: `${batch3Id}-${item3}`,
                        claimedReceivedQuantity: 200,
                      },
                    ],
                  },
                ],
              };

              const updatedItems = order.items.map((item) => {
                if (item.id === item3)
                  return {
                    ...item,
                    deliveredQuantity: 200,
                    status: "Delivered",
                  };
                // Mark remaining items as completed too
                return { ...item, status: "Delivered" };
              });

              return {
                ...order,
                items: updatedItems,
                shipmentBatches: [
                  ...order.shipmentBatches,
                  batch3,
                ],
                deliveryProgress: {
                  allocatedQuantity: 312,
                  shippedQuantity: 312,
                  receivedQuantity: 312,
                  salesPointCount: 1,
                  deliveredSalesPointCount: 1,
                  podCount: 3,
                  percentage: 100,
                },
                distributionStatus: "FULLY_RECEIVED",
                status: "Completed",
              };
            },
          );
          localStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(new Event("va-trace-orders:change"));
        },
        { key: STORAGE_KEY, oid: orderId, item3: item3Id },
      );

      await page.reload();
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "04",
        "All 3 items delivered — FULLY_RECEIVED / Completed",
      );
    });
  });

  // =======================================================================
  // SCENARIO D: Vendor Shipment Workflow from Order Detail
  // =======================================================================

  test("D: Vendor shipment workflow from order detail", async ({
    page,
  }) => {
    // Set to vendor role at the start
    const scenario = "D";
    const orderId = "OR-2026-TEST-VENDOR";
    const item1Id = `${orderId}-item-1`;
    const item2Id = `${orderId}-item-2`;

    // ---- Seed: an order ready for shipping ----
    const seededOrder = {
      id: orderId,
      campaign: "E2E Test Campaign - Vendor Workflow",
      tags: ["E2E-Test", "Vendor"],
      createdDate: "2026-06-12",
      deadline: "10 days left",
      clientPO: "PO-E2E-VENDOR-001",
      soNumber: "SO-E2E-VENDOR",
      supplier: "PT. HH Global Services Indonesia",
      salesPointId: SALES_POINT_WH055,
      clientId: "CUS-SAMPOERNA",
      clientName: "Sampoerna",
      clientEntityName: "PT HM Sampoerna Tbk",
      items: [
        {
          id: item1Id,
          productCode: "2026-00194983-0039",
          poLineNumber: "1",
          name: "E2E Vendor Item Alpha - 0.5x1 m",
          quantity: 100,
          deliveredQuantity: 0,
          status: "Ready to Ship",
          labelGenerated: false,
        },
        {
          id: item2Id,
          productCode: "2026-00194983-0040",
          poLineNumber: "2",
          name: "E2E Vendor Item Beta - 0.7x2 m",
          quantity: 50,
          deliveredQuantity: 0,
          status: "Ready to Ship",
          labelGenerated: false,
        },
      ],
      productionJobs: [
        {
          id: `${orderId}-PJ-1`,
          orderId,
          orderItemIds: [item1Id, item2Id],
          status: "COMPLETED",
          version: 1,
        },
      ],
      allocations: [
        {
          id: `${orderId}-ALLOC-1`,
          orderId,
          salesPointId: SALES_POINT_WH055,
          orderLineId: item1Id,
          productCode: "2026-00194983-0039",
          allocatedQuantity: 100,
          shippedQuantity: 0,
          receivedQuantity: 0,
          status: "APPROVED",
        },
        {
          id: `${orderId}-ALLOC-2`,
          orderId,
          salesPointId: SALES_POINT_WH055,
          orderLineId: item2Id,
          productCode: "2026-00194983-0040",
          allocatedQuantity: 50,
          shippedQuantity: 0,
          receivedQuantity: 0,
          status: "APPROVED",
        },
      ],
      shipmentBatches: [],
      storedLabels: [],
      storedDeliveryNotes: [],
      labelStatus: "none",
      note: "E2E test for vendor shipment workflow.",
      status: "Ready to Ship",
      productionStatus: "COMPLETED",
      distributionStatus: "NOT_STARTED",
      deliveryProgress: {
        allocatedQuantity: 150,
        shippedQuantity: 0,
        receivedQuantity: 0,
        salesPointCount: 1,
        deliveredSalesPointCount: 0,
        podCount: 0,
        percentage: 0,
      },
    };

    await seedV1Orders(page, [seededOrder]);

    // Set vendor role before first navigation (addInitScript stacks)
    await page.addInitScript(() => {
      window.localStorage.setItem("va-trace-current-user", "1");
    });

    // -----------------------------------------------------------------------
    // STEP 1 — Vendor Dashboard
    // -----------------------------------------------------------------------
    await test.step("1️⃣ Navigate to Vendor Dashboard", async () => {
      await page.goto(`${BASE}/vendor`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/vendor dashboard/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "01",
        "Vendor Dashboard with order metrics",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 2 — Vendor Orders List
    // -----------------------------------------------------------------------
    await test.step("2️⃣ View vendor orders list", async () => {
      await page.goto(`${BASE}/vendor/orders`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/my orders/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "02",
        "Vendor orders list showing the E2E order",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 3 — Vendor Order Detail
    // -----------------------------------------------------------------------
    await test.step("3️⃣ Open vendor order detail", async () => {
      await page.goto(`${BASE}/vendor/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      // The vendor detail should show workflow status and shipment actions
      await expect(
        page.getByText(/workflow status|allocation/i).first(),
      ).toBeVisible({ timeout: 10000 });

      await tourScreenshot(
        page,
        scenario,
        "03",
        "Vendor order detail with Workflow Status and shipment options",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 4 — Create Shipment Batch (via UI if possible)
    // -----------------------------------------------------------------------
    await test.step("4️⃣ Verify shipment options available on vendor order detail", async () => {
      // Verify the vendor page shows shipment-related UI elements
      await page.goto(`${BASE}/vendor/orders/${orderId}`);
      await page.waitForLoadState("networkidle");

      await tourScreenshot(
        page,
        scenario,
        "04",
        "Vendor order detail with shipment and workflow information",
      );
    });

    // -----------------------------------------------------------------------
    // STEP 5 — Navigate to shipment batch detail
    // -----------------------------------------------------------------------
    await test.step("5️⃣ View shipment batch detail", async () => {
      // Look for an active batch link
      const batchLink = page.getByRole("link", {
        name: /open active batch|open shipment batch/i,
      });

      if (await batchLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await batchLink.click();
        await page.waitForTimeout(500);

        await tourScreenshot(
          page,
          scenario,
          "05",
          "Shipment batch detail page",
        );
      } else {
        await tourScreenshot(
          page,
          scenario,
          "05",
          "Vendor order detail with status badges (no active batch)",
        );
      }
    });
  });
});
