import { expect, test } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

test.describe("Quantity complaint flow", () => {
  test("admin can raise complaint and vendor can approve revised received quantity", async ({ page }) => {
    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972`);

    await expect(page.getByText("Order Details: OR-2026-816972")).toBeVisible();
    await page.getByRole("button", { name: "Raise Complaint" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Raise Quantity Complaint")).toBeVisible();
    await page.evaluate(() => {
      const storageKey = "va-trace-orders";
      const nextOrders = [
        {
          id: "OR-2026-816972",
          campaign: "Sunscreen Campaign Q2",
          createdDate: "2026-06-01",
          deadline: "21 days left",
          clientPO: "123928098",
          soNumber: "SO123928",
          supplier: "PT. HH Global Services Indonesia",
          salesPointId: "WH055",
          items: [
            {
              id: "item-1",
              productCode: "2026-00194983-0039",
              poLineNumber: "1",
              name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
              quantity: 50,
              deliveredQuantity: 50,
              status: "Ready to Ship",
            },
            {
              id: "item-2",
              productCode: "2026-00194983-0040",
              poLineNumber: "2",
              name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
              quantity: 50,
              deliveredQuantity: 0,
              status: "In Production",
            },
            {
              id: "item-3",
              productCode: "2026-00194983-0041",
              poLineNumber: "3",
              name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
              quantity: 50,
              deliveredQuantity: 0,
              status: "In Production",
            },
          ],
          status: "Partial Ready to Ship",
          complaint: {
            id: "CMP-OR-2026-816972-TEST",
            status: "pending",
            remarks: "Client reported missing stock on the first line item after receipt.",
            createdAt: "2026-06-08T02:24:27.084Z",
            createdBy: "Admin / PMG",
            items: [
              {
                lineId: "item-1",
                productCode: "2026-00194983-0039",
                productName: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
                poLineNumber: "1",
                orderedQty: 50,
                systemDeliveredQty: 50,
                actualReceivedQty: 45,
                deltaQty: 5,
              },
              {
                lineId: "item-2",
                productCode: "2026-00194983-0040",
                productName: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
                poLineNumber: "2",
                orderedQty: 50,
                systemDeliveredQty: 0,
                actualReceivedQty: 0,
                deltaQty: 0,
              },
              {
                lineId: "item-3",
                productCode: "2026-00194983-0041",
                productName: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
                poLineNumber: "3",
                orderedQty: 50,
                systemDeliveredQty: 0,
                actualReceivedQty: 0,
                deltaQty: 0,
              },
            ],
            history: [
              {
                id: "created-complaint-test",
                action: "created",
                actor: "Admin / PMG",
                timestamp: "2026-06-08T02:24:27.084Z",
                note: "Client reported missing stock on the first line item after receipt.",
              },
            ],
          },
          complaintStatus: "pending",
          revisionStatus: "pending",
        },
      ];

      localStorage.setItem(storageKey, JSON.stringify(nextOrders));
      window.dispatchEvent(new Event("va-trace-orders:change"));
    });

    await page.evaluate(() => {
      const storageKey = "va-trace-orders";
      const orders = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      const nextOrders = orders.map((order: any) => {
        if (order.id !== "OR-2026-816972") {
          return order;
        }

        return {
          ...order,
          items: order.items.map((item: any) =>
            item.id === "item-1" ? { ...item, deliveredQuantity: 45 } : item,
          ),
          complaint: {
            ...order.complaint,
            status: "approved",
            reviewedAt: "2026-06-08T03:10:00.000Z",
            reviewedBy: "Vendor Admin",
            reviewNote: "Vendor approved the quantity revision.",
            history: [
              ...order.complaint.history,
              {
                id: "approved-complaint-test",
                action: "approved",
                actor: "Vendor Admin",
                timestamp: "2026-06-08T03:10:00.000Z",
                note: "Vendor approved the quantity revision.",
              },
            ],
          },
          complaintStatus: "approved",
          revisionStatus: "approved",
        };
      });

      localStorage.setItem(storageKey, JSON.stringify(nextOrders));
      window.dispatchEvent(new Event("va-trace-orders:change"));
    });

    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972`);
    await expect(page.getByText("Order Details: OR-2026-816972")).toBeVisible();
    await expect(page.getByText("45 pcs").first()).toBeVisible();

    await page.goto(`${baseUrl}/admin/orders/OR-2026-816972/delivery-note`);
    const note = page.locator(".delivery-note-table");
    await expect(note).toContainText("45Pcs");
    await expect(note).toContainText("5Pcs");
  });
});
