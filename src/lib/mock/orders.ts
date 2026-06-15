import { normalizeOrder } from "@/lib/orderDomain";
import type { StoredDeliveryNoteRecord, StoredPackagingLabel } from "@/lib/types/logistics";
import type { Order } from "@/lib/types/order";

type MockOrderSeed = Omit<
  Order,
  | "status"
  | "productionStatus"
  | "distributionStatus"
  | "deliveryProgress"
  | "productionJobs"
  | "allocations"
  | "shipmentBatches"
>;

function makeEmptyStoredLabels() {
  return [] as StoredPackagingLabel[];
}

function makeEmptyDeliveryNotes() {
  return [] as StoredDeliveryNoteRecord[];
}

const mockOrderSeeds: MockOrderSeed[] = [
  {
    id: "OR-2026-816972",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-01",
    deadline: "21 days left",
    clientPO: "123928098",
    tags: ["Seasonal", "Sticker"],
    referenceLink: {
      url: "https://example.com/orders/OR-2026-816972",
      displayTitle: "Campaign brief",
    },
    soNumber: "SO123928",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH055",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194983-0039", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 50, status: "Ready to Ship", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0040", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-3", productCode: "2026-00194983-0041", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
    ],
    labelStatus: "none",
    note: "Tim Area WAJIB melakukan GR CPT dan COUPA.",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-715187",
    campaign: "WOC12026 - POSM Networking - Production - PPOSM PPOSM VEEV",
    createdDate: "2026-05-20",
    deadline: "Overdue",
    clientPO: "5701749081",
    tags: ["Networking", "Priority"],
    referenceLink: {
      url: "https://example.com/orders/OR-2026-715187",
      displayTitle: "Reference deck",
    },
    soNumber: "SO178056",
    supplier: "PT Print Solusi",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194876-0033", poLineNumber: "2", name: "Photopaper_GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - PPOSM VEEV 0.4 x 0.8 m V", quantity: 29, deliveredQuantity: 29, status: "Ready to Ship", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194876-0034", poLineNumber: "3", name: "Photopaper_GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - PPOSM VEEV 0.8 x 0.4 m H", quantity: 29, deliveredQuantity: 29, status: "Ready to Ship", labelGenerated: false },
      { id: "item-3", productCode: "2026-00194876-0039", poLineNumber: "7", name: "Photopaper_GT SRC - Cigarette Cabinet 1 (H) - 25.5x72.5 cm - Photopaper - PPOSM VEEV 0.725 x 0.255 m H", quantity: 11, deliveredQuantity: 11, status: "Ready to Ship", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-901234",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-03",
    deadline: "28 days left",
    clientPO: "9982711",
    soNumber: "SO998271",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH071",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194983-0046", poLineNumber: "1", name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0050", poLineNumber: "2", name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship", labelGenerated: false },
      { id: "item-3", productCode: "2026-00194983-0051", poLineNumber: "3", name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-445566",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-05",
    deadline: "45 days left",
    clientPO: "7726152",
    soNumber: "SO772615",
    supplier: "Pending",
    salesPointId: "WH069",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194983-0052", poLineNumber: "1", name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K", quantity: 200, deliveredQuantity: 0, status: "New", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0053", poLineNumber: "2", name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K", quantity: 200, deliveredQuantity: 0, status: "New", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-112233",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-05-15",
    deadline: "Finished",
    clientPO: "4451627",
    soNumber: "SO445162",
    supplier: "PT Multi Print",
    salesPointId: "WH179",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194983-0043", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 120, deliveredQuantity: 120, status: "Completed", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0044", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 120, deliveredQuantity: 120, status: "Completed", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  // === Fulfillment Progress Seed Orders covering all OrderItemProgress states ===
  {
    id: "OR-2026-570001",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-08",
    deadline: "14 days left",
    clientPO: "5701713463",
    soNumber: "SO570001",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-01", productCode: "2026-00195039-0002", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DSE12 25K", quantity: 80, deliveredQuantity: 0, status: "New", labelGenerated: false },
      { id: "item-fs-02", productCode: "2026-00195039-0014", poLineNumber: "2", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DSE12 25K", quantity: 32, deliveredQuantity: 0, status: "New", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570002",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-05-28",
    deadline: "10 days left",
    clientPO: "5701713439",
    soNumber: "SO570002",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH055",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-03", productCode: "2026-00194983-0040", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 180, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-fs-04", productCode: "2026-00194983-0041", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 1200, deliveredQuantity: 200, status: "In Production", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570003",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-05-20",
    deadline: "5 days left",
    clientPO: "5701713028",
    soNumber: "SO570003",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH071",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-05", productCode: "2026-00194988-0020", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM20", quantity: 43, deliveredQuantity: 43, status: "Ready to Ship", labelGenerated: false },
      { id: "item-fs-06", productCode: "2026-00194988-0022", poLineNumber: "3", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM20", quantity: 463, deliveredQuantity: 0, status: "Ready to Ship", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570004",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-05-15",
    deadline: "3 days left",
    clientPO: "5701713462",
    soNumber: "SO570004",
    supplier: "PT Multi Print",
    salesPointId: "WH069",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-07", productCode: "2026-00194984-0003", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 600, deliveredQuantity: 300, status: "On Delivery", labelGenerated: false },
      { id: "item-fs-08", productCode: "2026-00194984-0004", poLineNumber: "4", name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 300, deliveredQuantity: 0, status: "On Delivery", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570005",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-04-10",
    deadline: "Finished",
    clientPO: "7799123",
    soNumber: "SO570005",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH179",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-09", productCode: "2026-00194983-0060", poLineNumber: "1", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DPP12 20K", quantity: 337, deliveredQuantity: 337, status: "Delivered", labelGenerated: false },
      { id: "item-fs-10", productCode: "2026-00194983-0063", poLineNumber: "2", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - DPP12 20K", quantity: 1205, deliveredQuantity: 1205, status: "Delivered", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570006",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-07",
    deadline: "30 days left",
    clientPO: "6644189",
    soNumber: "SO570006",
    supplier: "Pending",
    salesPointId: "WH079",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-11", productCode: "2026-00194983-0052", poLineNumber: "1", name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K", quantity: 150, deliveredQuantity: 0, status: "New", labelGenerated: false },
      { id: "item-fs-12", productCode: "2026-00194983-0053", poLineNumber: "2", name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K", quantity: 150, deliveredQuantity: 0, status: "New", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570007",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-04-01",
    deadline: "Overdue",
    clientPO: "5512345",
    soNumber: "SO570007",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH089",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-13", productCode: "2026-00194983-0046", poLineNumber: "8", name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K", quantity: 6900, deliveredQuantity: 6900, status: "Overdue", labelGenerated: false },
      { id: "item-fs-14", productCode: "2026-00194983-0049", poLineNumber: "9", name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K", quantity: 72, deliveredQuantity: 0, status: "Overdue", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570008",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-02",
    deadline: "1 day left",
    clientPO: "4421098",
    soNumber: "SO570008",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH131",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-15", productCode: "2026-00194984-0023", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - SPS12 15K", quantity: 51, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-fs-16", productCode: "2026-00194984-0005", poLineNumber: "5", name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 40, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570009",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-05-10",
    deadline: "7 days left",
    clientPO: "9901234",
    soNumber: "SO570009",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-fs-17", productCode: "2026-00195039-0015", poLineNumber: "13", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DSE12 25K", quantity: 52, deliveredQuantity: 52, status: "Delivered", labelGenerated: false },
      { id: "item-fs-18", productCode: "2026-00195039-0020", poLineNumber: "18", name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DSE12 25K", quantity: 16, deliveredQuantity: 0, status: "On Delivery", labelGenerated: false },
      { id: "item-fs-19", productCode: "2026-00194983-0061", poLineNumber: "21", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DPP12 20K", quantity: 112, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-fs-20", productCode: "2026-00194983-0062", poLineNumber: "22", name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - DPP12 20K", quantity: 47, deliveredQuantity: 0, status: "New", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
];




export const mockOrders: Order[] = mockOrderSeeds.map((order) => normalizeOrder(order));

export function generateSoNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `SO${y}${mm}${dd}${random}`;
}
