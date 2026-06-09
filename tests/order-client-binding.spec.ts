import { expect, test } from "@playwright/test";

import { createManualOrder } from "@/lib/orderStore";

test.describe("manual order client binding", () => {
  test("derives the Sampoerna client from the selected sales point", () => {
    const order = createManualOrder({
      campaign: "Client Binding Check",
      clientPO: "PO-CLNT-1",
      soNumber: "SO-CLNT-1",
      supplier: "Pending",
      salesPointId: "WH020",
      picProjectName: "Test PIC",
      picProjectEmail: "test@sampoerna.com",
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

    expect(order.clientId).toBe("CUS-SAMPOERNA");
    expect(order.clientName).toBe("Sampoerna");
    expect(order.clientEntityName).toBe("PT HM Sampoerna Tbk");
  });
});
