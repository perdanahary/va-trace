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
    id: "OR-2026-570001",
    campaign: "C1 - 2026 - TPOSM - Sticker - 40x40 cm - Sticker Chromo - DFR20xMCS 25K (Apr)",
    createdDate: "2026-06-08",
    deadline: "14 days left",
    clientPO: "5701713463",
    soNumber: "SO570001",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00195039-0002", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DSE12 25K", quantity: 80, deliveredQuantity: 0, status: "New", labelGenerated: false },
      { id: "item-2", productCode: "2026-00195039-0014", poLineNumber: "2", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DSE12 25K", quantity: 32, deliveredQuantity: 0, status: "New", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570010",
    campaign: "C1 - 2026 - TPOSM - Banner - 1x2 m - Vinyl Banner - DSE12 25K (May)",
    createdDate: "2026-06-05",
    deadline: "20 days left",
    clientPO: "5701713501",
    soNumber: "",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH055",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00195039-0035", poLineNumber: "1", name: "TPOSM - Banner - 1x2 m - Vinyl Banner - DSE12 25K", quantity: 200, deliveredQuantity: 0, status: "Waiting", labelGenerated: false },
      { id: "item-2", productCode: "2026-00195039-0036", poLineNumber: "2", name: "GT SRC - Banner - 0.8x1.5 m - Vinyl Banner - DSE12 25K", quantity: 150, deliveredQuantity: 0, status: "Waiting", labelGenerated: false },
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
      { id: "item-1", productCode: "2026-00194983-0040", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 180, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0041", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 1200, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
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
      { id: "item-1", productCode: "2026-00194988-0020", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM20", quantity: 43, deliveredQuantity: 0, status: "Ready to Ship", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194988-0022", poLineNumber: "3", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM20", quantity: 463, deliveredQuantity: 0, status: "Ready to Ship", labelGenerated: false },
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
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH069",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194984-0003", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 600, deliveredQuantity: 300, status: "On Delivery", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194984-0004", poLineNumber: "4", name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 300, deliveredQuantity: 0, status: "On Delivery", labelGenerated: false },
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
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH179",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00194983-0060", poLineNumber: "1", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DPP12 20K", quantity: 337, deliveredQuantity: 337, status: "Delivered", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0063", poLineNumber: "2", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - DPP12 20K", quantity: 1205, deliveredQuantity: 1205, status: "Delivered", labelGenerated: false },
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
    supplier: "PT. HH Global Services Indonesia",
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
      { id: "item-1", productCode: "2026-00194983-0046", poLineNumber: "8", name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K", quantity: 6900, deliveredQuantity: 0, status: "Overdue", labelGenerated: false },
      { id: "item-2", productCode: "2026-00194983-0049", poLineNumber: "9", name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K", quantity: 72, deliveredQuantity: 0, status: "Overdue", labelGenerated: false },
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
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    items: [
      { id: "item-1", productCode: "2026-00195039-0015", poLineNumber: "13", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DSE12 25K", quantity: 52, deliveredQuantity: 52, status: "Delivered", labelGenerated: false },
      { id: "item-2", productCode: "2026-00195039-0020", poLineNumber: "18", name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DSE12 25K", quantity: 16, deliveredQuantity: 0, status: "On Delivery", labelGenerated: false },
      { id: "item-3", productCode: "2026-00194983-0061", poLineNumber: "21", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DPP12 20K", quantity: 112, deliveredQuantity: 0, status: "In Production", labelGenerated: false },
      { id: "item-4", productCode: "2026-00194983-0062", poLineNumber: "22", name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - DPP12 20K", quantity: 47, deliveredQuantity: 0, status: "New", labelGenerated: false },
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
