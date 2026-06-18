import { describe, expect, it } from "vitest";

import { buildOrderListRowsFromStoredOrders } from "@/lib/v2/compat/orderListRows";
import type { StoredOrder } from "@/lib/orderStore";

describe("buildOrderListRowsFromStoredOrders", () => {
  it("maps normalized legacy orders into the V2 order list row contract", () => {
    const rows = buildOrderListRowsFromStoredOrders([makeOrder()], "/admin");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "OR-2026-000001",
      clientPoNumber: "PO-001",
      orderRequestNumber: "OR-2026-000001",
      clientName: "PT HM Sampoerna Tbk",
      projectName: "Retail Visibility",
      vendorName: "CV Cetakan Terbaik",
      productionStatus: "COMPLETED",
      distributionStatus: "PARTIALLY_DISTRIBUTED",
      deliveryProgressLabel: "25/100",
      deliveryProgressPercent: 25,
      orderedQuantity: 100,
      allocatedQuantity: 100,
      productionReadyQuantity: 60,
      shippedQuantity: 50,
      receivedQuantity: 25,
      salesPointCount: 2,
      legacyStatusLabel: "Ready to Ship",
      actionTargets: {
        detailPath: "/admin/orders/OR-2026-000001",
        deliveryNotesPath: "/admin/orders/OR-2026-000001/delivery-note",
      },
    });
  });
});

function makeOrder(): StoredOrder {
  return {
    id: "OR-2026-000001",
    campaign: "Retail Visibility",
    status: "Ready to Ship",
    productionStatus: "COMPLETED",
    distributionStatus: "PARTIALLY_DISTRIBUTED",
    deliveryProgress: {
      allocatedQuantity: 100,
      shippedQuantity: 50,
      receivedQuantity: 25,
      salesPointCount: 2,
      deliveredSalesPointCount: 0,
      podCount: 0,
      percentage: 25,
    },
    createdDate: "2026-06-01",
    deadline: "2026-06-20",
    clientPO: "PO-001",
    soNumber: "SO-001",
    supplier: "CV Cetakan Terbaik",
    salesPointId: "WH001",
    clientName: "PT HM Sampoerna Tbk",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      {
        id: "line-1",
        name: "Poster",
        quantity: 60,
        status: "Ready to Ship",
        productCode: "MAT-001",
        poLineNumber: "1",
        labelGenerated: false,
      },
      {
        id: "line-2",
        name: "Wobbler",
        quantity: 40,
        status: "In Production",
        productCode: "MAT-002",
        poLineNumber: "2",
        labelGenerated: false,
      },
    ],
    productionJobs: [],
    allocations: [
      {
        id: "allocation-1",
        orderId: "OR-2026-000001",
        salesPointId: "WH001",
        orderLineId: "line-1",
        productCode: "MAT-001",
        allocatedQuantity: 60,
        shippedQuantity: 50,
        receivedQuantity: 25,
      },
      {
        id: "allocation-2",
        orderId: "OR-2026-000001",
        salesPointId: "WH002",
        orderLineId: "line-2",
        productCode: "MAT-002",
        allocatedQuantity: 40,
        shippedQuantity: 0,
        receivedQuantity: 0,
      },
    ],
    shipmentBatches: [],
    labelStatus: "none",
    storedLabels: [],
    storedDeliveryNotes: [],
  };
}
