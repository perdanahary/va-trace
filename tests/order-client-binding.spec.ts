import { expect, test } from "@playwright/test";

import { createManualOrder } from "@/lib/orderStore";

test.describe("manual order customer binding", () => {
  test("derives the Sampoerna customer from the selected sales point", () => {
    const order = createManualOrder({
      campaign: "Customer Binding Check",
      clientPO: "PO-CUST-1",
      soNumber: "SO-CUST-1",
      supplier: "Pending",
      salesPointId: "WH020",
      picProgramName: "Test PIC",
      picProgramEmail: "test@sampoerna.com",
      deadline: "7 days left",
      items: [
        {
          productCode: "2026-00194983-0046",
          name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K",
          quantity: 10,
          poLineNumber: "1",
        },
      ],
    });

    expect(order.customerId).toBe("CUS-SAMPOERNA");
    expect(order.customerName).toBe("Sampoerna");
    expect(order.customerEntityName).toBe("PT HM Sampoerna Tbk");
  });
});
