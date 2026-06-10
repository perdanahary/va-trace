import { getOrderRequestStatus, type OrderItemProgress, type OrderRequestStatus } from "@/lib/orderStatus";
import { salesPointSeeds } from "@/lib/salesPointSeed";
import type { SalesPointPic, ShippingAddress } from "@/lib/salesPointSeed";

export interface StoredPackagingLabel {
  id: string;
  lineId: string;
  labelCode: string;
  qrPayload: string;
  orderId: string;
  doNumber: string;
  poLineNumber: string;
  productCode: string;
  productName: string;
  deliveredQty: number;
  uom: string;
  destinationCompanyName: string;
  destinationLocationName: string;
  destinationAddress: string;
  salesPointCode: string;
  projectName: string;
  createdAt: string;
}

export interface StoredDeliveryNoteRecord {
  id: string;
  doNumber: string;
  barcodeValue: string;
  qrPayload: string;
  poNumber: string;
  soNumber: string;
  projectName: string;
  picProject: string;
  senderProfile: {
    name: string;
    addressLines: string[];
    phone: string;
  };
  deliverySnapshot: {
    deliveryCompanyName: string;
    deliveryLocationName: string;
    address: string;
    phone: string;
    picClient: string;
    wcode: string;
  };
  lines: Array<{
    id: string;
    poLineNumber: string;
    materialCode: string;
    description: string;
    orderedQty: number;
    deliveredQty: number;
    outstandingQty: number;
    uom: string;
  }>;
  note: string;
  createdAt: string;
  scopeLabelIds: string[];
}

export interface OrderLine extends OrderItemProgress {
  productCode: string;
  poLineNumber: string;
  deliveredQuantity?: number;
  labelGenerated: boolean;
  labelGeneratedAt?: string;
}

export type LabelStatus = "none" | "partial" | "all";

export type ComplaintStatus = "pending" | "approved" | "rejected";

export interface ComplaintLineItem {
  lineId: string;
  productCode: string;
  productName: string;
  poLineNumber: string;
  orderedQty: number;
  systemDeliveredQty: number;
  actualReceivedQty: number;
  deltaQty: number;
}

export interface ComplaintHistoryEntry {
  id: string;
  action: "created" | "approved" | "rejected" | "quantity-adjusted";
  actor: string;
  timestamp: string;
  note?: string;
}

export interface OrderComplaint {
  id: string;
  status: ComplaintStatus;
  remarks: string;
  createdAt: string;
  createdBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  items: ComplaintLineItem[];
  history: ComplaintHistoryEntry[];
}

export interface Order {
  id: string;
  campaign: string;
  status: OrderRequestStatus;
  createdDate: string;
  deadline: string;
  clientPO: string;
  soNumber: string;
  supplier: string;
  salesPointId: string;
  clientId?: string;
  clientName?: string;
  clientEntityName?: string;
  picProject: {
    name: string;
    email: string;
  };
  items: OrderLine[];
  complaint?: OrderComplaint;
  complaintStatus?: ComplaintStatus;
  revisionStatus?: ComplaintStatus;
  note?: string;
  labelStatus: LabelStatus;
  labelGeneratedAt?: string;
  storedLabels: StoredPackagingLabel[];
  storedDeliveryNotes: StoredDeliveryNoteRecord[];
}

function makeEmptyStoredLabels() {
  return [] as StoredPackagingLabel[];
}

function makeEmptyDeliveryNotes() {
  return [] as StoredDeliveryNoteRecord[];
}

const mockOrderSeeds: Omit<Order, "status">[] = [
  {
    id: "OR-2026-816972",
    campaign: "Sunscreen Campaign Q2",
    createdDate: "2026-06-01",
    deadline: "21 days left",
    clientPO: "123928098",
    soNumber: "SO123928",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH055",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    soNumber: "SO178056",
    supplier: "PT Print Solusi",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "A Mild Variant Promo",
    createdDate: "2026-06-03",
    deadline: "28 days left",
    clientPO: "9982711",
    soNumber: "SO998271",
    supplier: "CV Cetakan Terbaik Sejagat",
    salesPointId: "WH071",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Reno Saputra",
      email: "Reno.Saputra@panamas.com",
    },
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
    campaign: "Dji Sam Soe Magnum",
    createdDate: "2026-06-05",
    deadline: "45 days left",
    clientPO: "7726152",
    soNumber: "SO772615",
    supplier: "Pending",
    salesPointId: "WH069",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Joko Santoso",
      email: "Joko.Santoso@sampoerna.com",
    },
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
    campaign: "SPS12 Launch",
    createdDate: "2026-05-15",
    deadline: "Finished",
    clientPO: "4451627",
    soNumber: "SO445162",
    supplier: "PT Multi Print",
    salesPointId: "WH179",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Dji Sam Soe Magnum Launch Q2",
    createdDate: "2026-06-08",
    deadline: "14 days left",
    clientPO: "5701713463",
    soNumber: "SO570001",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Haris Afzal",
      email: "haris.afzal@panamas.com",
    },
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
    campaign: "DSSK Stock Replenishment C1",
    createdDate: "2026-05-28",
    deadline: "10 days left",
    clientPO: "5701713439",
    soNumber: "SO570002",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH055",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Marlboro Filter Black POSM",
    createdDate: "2026-05-20",
    deadline: "5 days left",
    clientPO: "5701713028",
    soNumber: "SO570003",
    supplier: "CV Cetakan Terbaik Sejagat",
    salesPointId: "WH071",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Sampoerna Prima Distribution",
    createdDate: "2026-05-15",
    deadline: "3 days left",
    clientPO: "5701713462",
    soNumber: "SO570004",
    supplier: "PT Multi Print",
    salesPointId: "WH069",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Joko Santoso",
      email: "Joko.Santoso@sampoerna.com",
    },
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
    campaign: "Palembang Q2 Fulfillment",
    createdDate: "2026-04-10",
    deadline: "Finished",
    clientPO: "7799123",
    soNumber: "SO570005",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH179",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Sukabumi Expansion Pending",
    createdDate: "2026-06-07",
    deadline: "30 days left",
    clientPO: "6644189",
    soNumber: "SO570006",
    supplier: "Pending",
    salesPointId: "WH079",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Bandung Q1 Remaining",
    createdDate: "2026-04-01",
    deadline: "Overdue",
    clientPO: "5512345",
    soNumber: "SO570007",
    supplier: "CV Cetakan Terbaik Sejagat",
    salesPointId: "WH089",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
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
    campaign: "Surabaya Urgent Deployment",
    createdDate: "2026-06-02",
    deadline: "1 day left",
    clientPO: "4421098",
    soNumber: "SO570008",
    supplier: "PT. HH Global Services Indonesia",
    salesPointId: "WH131",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Chandra Sadikin",
      email: "Chandra.Sadikin@sampoerna.com",
    },
    items: [
      { id: "item-fs-15", productCode: "2026-00194984-0023", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - SPS12 15K", quantity: 51, deliveredQuantity: 0, status: "Urgent", labelGenerated: false },
      { id: "item-fs-16", productCode: "2026-00194984-0005", poLineNumber: "5", name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 40, deliveredQuantity: 0, status: "Urgent", labelGenerated: false },
    ],
    labelStatus: "none",
    storedLabels: makeEmptyStoredLabels(),
    storedDeliveryNotes: makeEmptyDeliveryNotes(),
  },
  {
    id: "OR-2026-570009",
    campaign: "Mixed Fulfillment Batch - Medan",
    createdDate: "2026-05-10",
    deadline: "7 days left",
    clientPO: "9901234",
    soNumber: "SO570009",
    supplier: "PT Print Solusi Indonesia",
    salesPointId: "WH020",
    clientId: "CUS-SAMPOERNA",
    clientName: "Sampoerna",
    clientEntityName: "PT HM Sampoerna Tbk",
    picProject: {
      name: "Haris Afzal",
      email: "haris.afzal@panamas.com",
    },
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



export interface Supplier {
  id: string;
  name: string;
  type: "PT" | "CV" | "Personal";
  phone: string;
  picName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  addressLines?: string[];
}

export const mockSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "CV Cetakan Terbaik Sejagat",
    type: "CV",
    phone: "02179697969",
    picName: "Marco Polo",
    email: "marco@officebee.co",
    status: "ACTIVE"
  },
  {
    id: "SUP-004",
    name: "PT. HH Global Services Indonesia",
    type: "PT",
    phone: "+62 21 515 7606",
    picName: "Kiky Natalia",
    email: "Kiky.Natalia@hhglobal.com",
    status: "ACTIVE",
    addressLines: [
      "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
      "Jl. Jendral Sudirman Kav. 52-53",
      "Daerah Khusus Ibu Kota Jakarta 12830",
    ],
  },
  {
    id: "SUP-002",
    name: "PT Print Solusi Indonesia",
    type: "PT",
    phone: "02188997766",
    picName: "Lidya Smith",
    email: "lidya@printsolusi.id",
    status: "ACTIVE"
  },
  {
    id: "SUP-003",
    name: "PT Multi Print Abadi",
    type: "PT",
    phone: "02144553322",
    picName: "Budi Santoso",
    email: "budi@multiprint.co.id",
    status: "INACTIVE"
  }
];

export interface Product {
  code: string;
  name: string;
  brand: string;
  weight: string;
  status: "Active" | "Inactive";
  material?: string;
  dimensions?: string;
}

export const mockProducts: Product[] = [
  {
    code: "2026-00194983-0039",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194983-0040",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194983-0041",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194983-0042",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x4 m"
  },
  {
    code: "2026-00194983-0043",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194983-0044",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194983-0045",
    name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x4 m"
  },
  {
    code: "2026-00194983-0046",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194983-0047",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x164 cm"
  },
  {
    code: "2026-00194983-0048",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x518 cm"
  },
  {
    code: "2026-00194983-0049",
    name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194983-0050",
    name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x97.7 cm"
  },
  {
    code: "2026-00194983-0051",
    name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x47.6 cm"
  },
  {
    code: "2026-00194983-0052",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194983-0053",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194983-0054",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194983-0055",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194983-0056",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194983-0057",
    name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "45x100 cm"
  },
  {
    code: "2026-00194983-0058",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194983-0059",
    name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194983-0060",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00194983-0061",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194983-0062",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194983-0063",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194983-0064",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - DPP12 20K",
    brand: "DSSK all",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00194983-0065",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194983-0066",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194983-0067",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194983-0068",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x96.5 cm"
  },
  {
    code: "2026-00194983-0069",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x320 cm"
  },
  {
    code: "2026-00194983-0070",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x290 cm"
  },
  {
    code: "2026-00194983-0071",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194983-0072",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x71.5 cm"
  },
  {
    code: "2026-00194983-0073",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194983-0074",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
  {
    code: "2026-00194983-0075",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x400 cm"
  },
  {
    code: "2026-00194983-0076",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - DPP12 20K",
    brand: "DSSK all",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x600 cm"
  },
  {
    code: "2026-00194984-0001",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194984-0002",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194984-0003",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194984-0004",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x4 m"
  },
  {
    code: "2026-00194984-0005",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194984-0006",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194984-0007",
    name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x4 m"
  },
  {
    code: "2026-00194984-0008",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194984-0009",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x164 cm"
  },
  {
    code: "2026-00194984-0010",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x518 cm"
  },
  {
    code: "2026-00194984-0011",
    name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194984-0012",
    name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x97.7 cm"
  },
  {
    code: "2026-00194984-0013",
    name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x47.6 cm"
  },
  {
    code: "2026-00194984-0014",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194984-0015",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194984-0016",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194984-0017",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194984-0018",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194984-0019",
    name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "45x100 cm"
  },
  {
    code: "2026-00194984-0020",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194984-0021",
    name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194984-0022",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00194984-0023",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194984-0024",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194984-0025",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194984-0026",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00194984-0027",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194984-0028",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194984-0029",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194984-0030",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x96.5 cm"
  },
  {
    code: "2026-00194984-0031",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x320 cm"
  },
  {
    code: "2026-00194984-0032",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x290 cm"
  },
  {
    code: "2026-00194984-0033",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194984-0034",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x71.5 cm"
  },
  {
    code: "2026-00194984-0035",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194984-0036",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
  {
    code: "2026-00194984-0037",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x400 cm"
  },
  {
    code: "2026-00194984-0038",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - SPS12 15K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x600 cm"
  },
  {
    code: "2026-00194985-0001",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - SAI12 16K",
    brand: "Sampoerna Prima",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194987-0001",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194987-0002",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194987-0003",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194987-0004",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194987-0005",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194987-0006",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194987-0007",
    name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x97.7 cm"
  },
  {
    code: "2026-00194987-0008",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194987-0009",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194987-0010",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194987-0011",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194987-0012",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194987-0013",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194987-0014",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194987-0015",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194987-0016",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194987-0017",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194987-0018",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194987-0019",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194987-0020",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x96.5 cm"
  },
  {
    code: "2026-00194987-0021",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x320 cm"
  },
  {
    code: "2026-00194987-0022",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x290 cm"
  },
  {
    code: "2026-00194987-0023",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x71.5 cm"
  },
  {
    code: "2026-00194987-0024",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194987-0025",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFM12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
  {
    code: "2026-00194988-0001",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194988-0002",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194988-0003",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194988-0004",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x4 m"
  },
  {
    code: "2026-00194988-0005",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194988-0006",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194988-0007",
    name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x4 m"
  },
  {
    code: "2026-00194988-0008",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194988-0009",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x164 cm"
  },
  {
    code: "2026-00194988-0010",
    name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194988-0011",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194988-0012",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194988-0013",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194988-0014",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194988-0015",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194988-0016",
    name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "45x100 cm"
  },
  {
    code: "2026-00194988-0017",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194988-0018",
    name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194988-0019",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00194988-0020",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194988-0021",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194988-0022",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194988-0023",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00194988-0024",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194988-0025",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194988-0026",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194988-0027",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x96.5 cm"
  },
  {
    code: "2026-00194988-0028",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x290 cm"
  },
  {
    code: "2026-00194988-0029",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194988-0030",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x71.5 cm"
  },
  {
    code: "2026-00194988-0031",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194988-0032",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
  {
    code: "2026-00194988-0033",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - MFM20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x400 cm"
  },
  {
    code: "2026-00194992-0001",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194992-0002",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194992-0003",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194992-0004",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x4 m"
  },
  {
    code: "2026-00194992-0005",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194992-0006",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194992-0007",
    name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x4 m"
  },
  {
    code: "2026-00194992-0008",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194992-0009",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x164 cm"
  },
  {
    code: "2026-00194992-0010",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x518 cm"
  },
  {
    code: "2026-00194992-0011",
    name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194992-0012",
    name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x97.7 cm"
  },
  {
    code: "2026-00194992-0013",
    name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x47.6 cm"
  },
  {
    code: "2026-00194992-0014",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194992-0015",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194992-0016",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194992-0017",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194992-0018",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194992-0019",
    name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "45x100 cm"
  },
  {
    code: "2026-00194992-0020",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194992-0021",
    name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194992-0022",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00194992-0023",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194992-0024",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194992-0025",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194992-0026",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00194992-0027",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194992-0028",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194992-0029",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194992-0030",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194992-0031",
    name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x71.5 cm"
  },
  {
    code: "2026-00194992-0032",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
  {
    code: "2026-00194992-0033",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x400 cm"
  },
  {
    code: "2026-00194992-0034",
    name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - MFB12",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x600 cm"
  },
  {
    code: "2026-00194995-0075",
    name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.5x1 m"
  },
  {
    code: "2026-00194995-0076",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00194995-0077",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x3 m"
  },
  {
    code: "2026-00194995-0078",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x4 m"
  },
  {
    code: "2026-00194995-0079",
    name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x2 m"
  },
  {
    code: "2026-00194995-0080",
    name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x3 m"
  },
  {
    code: "2026-00194995-0081",
    name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "1x4 m"
  },
  {
    code: "2026-00194995-0082",
    name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Chromo",
    dimensions: "40x40 cm"
  },
  {
    code: "2026-00194995-0083",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x164 cm"
  },
  {
    code: "2026-00194995-0084",
    name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Backlite",
    dimensions: "94x518 cm"
  },
  {
    code: "2026-00194995-0085",
    name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194995-0086",
    name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x97.7 cm"
  },
  {
    code: "2026-00194995-0087",
    name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "27.7x47.6 cm"
  },
  {
    code: "2026-00194995-0088",
    name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "80x40 cm"
  },
  {
    code: "2026-00194995-0089",
    name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "40x80 cm"
  },
  {
    code: "2026-00194995-0090",
    name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "40x120 cm"
  },
  {
    code: "2026-00194995-0091",
    name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194995-0092",
    name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "99.5x56.5 cm"
  },
  {
    code: "2026-00194995-0093",
    name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Duratrans",
    dimensions: "45x100 cm"
  },
  {
    code: "2026-00194995-0094",
    name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194995-0095",
    name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "200x100 cm"
  },
  {
    code: "2026-00194995-0096",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00194995-0097",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00194995-0098",
    name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "20x58 cm"
  },
  {
    code: "2026-00194995-0099",
    name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "15x40 cm"
  },
  {
    code: "2026-00194995-0100",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00194995-0101",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x47.5 cm"
  },
  {
    code: "2026-00194995-0102",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00194995-0103",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x46.5 cm"
  },
  {
    code: "2026-00194995-0104",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x96.5 cm"
  },
  {
    code: "2026-00194995-0105",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - MFB20",
    brand: "Magnum Filter Black",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "44.5x320 cm"
  },
  // DSE12 25K products (Dji Sam Soe Magnum Filter)
  {
    code: "2026-00195039-0002",
    name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight 10 Oz",
    dimensions: "0.7x2 m"
  },
  {
    code: "2026-00195039-0014",
    name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.01 kg",
    status: "Active",
    material: "Sticker Blockout",
    dimensions: "100x200 cm"
  },
  {
    code: "2026-00195039-0015",
    name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.5 kg",
    status: "Active",
    material: "Art Carton",
    dimensions: "25.5x72.5 cm"
  },
  {
    code: "2026-00195039-0018",
    name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.5 kg",
    status: "Active",
    material: "Vinyl FF Frontlight",
    dimensions: "90x140 cm"
  },
  {
    code: "2026-00195039-0020",
    name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x97.5 cm"
  },
  {
    code: "2026-00195039-0025",
    name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - DSE12 25K",
    brand: "Dji Sam Soe",
    weight: "0.01 kg",
    status: "Active",
    material: "Photopaper",
    dimensions: "48x72.5 cm"
  },
];

export interface BrandSeed {
  alias: string;
  name: string;
  sysname: string;
}

export const mockBrands: BrandSeed[] = [
  { alias: "A-Mild 16", name: "MLA16 35", sysname: "mla16-35" },
  { alias: "Avolution 20", name: "AVO20", sysname: "avo20" },
  { alias: "Dji Sam Soe", name: "DPP12 20", sysname: "dpp12-20" },
  { alias: "DSS Magnum Filter 12 Edisi Bintang", name: "DSE12 25", sysname: "dse12-25" },
  { alias: "Dji Sam Soe Snap Box 12", name: "DSB12", sysname: "dsb12" },
  { alias: "Sampoerna Prima", name: "SPS12 15", sysname: "sps12-15" },
  { alias: "Sampoerna Prima", name: "SAI12 16", sysname: "sai12-16" },
];

export const getBrandSeedByAlias = (alias: string) =>
  mockBrands.find((brand) => brand.alias.toLowerCase() === alias.toLowerCase());

export const getBrandSeedByName = (brandName: string) =>
  mockBrands.find((brand) => brand.name.toLowerCase() === brandName.toLowerCase());

export const adminMetrics = [
  { label: "Active Orders", value: "24", change: "+4 this week", color: "text-primary" },
  { label: "Urgent Orders", value: "3", change: "Deadline ≤ 3 days", color: "text-destructive" },
  { label: "Completed", value: "156", change: "Last 30 days", color: "text-success" },
  { label: "Work Volume This Month", value: "245", change: "+12% vs last month", color: "text-primary" },
];

export interface SalesPointMapping {
  clientId: string;
  clientName: string;
  clientEntityName: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  wcode: string;
  salesPoint: string;
  pic1: SalesPointPic;
  pic2: SalesPointPic;
  remarks: string;
  note: string;
  shippingAddress: ShippingAddress;
  deliveryCompanyName?: string;
  deliveryLocationName?: string;
  address?: string;
  phone?: string;
  picClient?: string;
}

const boundClient = {
  clientId: "CUS-SAMPOERNA",
  clientName: "Sampoerna",
  clientEntityName: "PT HM Sampoerna Tbk",
} as const;

const baseSalesPoints: Omit<SalesPointMapping, "clientId" | "clientName" | "clientEntityName" | "pic1" | "pic2" | "remarks" | "note" | "shippingAddress" | "subArea">[] = [
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Barat",
    "wcode": "WH055",
    "salesPoint": "Jakarta Barat"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Selatan",
    "wcode": "WH071",
    "salesPoint": "Jakarta Selatan"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Timur",
    "wcode": "WH064",
    "salesPoint": "Jakarta Timur"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Selatan",
    "wcode": "WH299",
    "salesPoint": "Pondok Pinang Jaksel"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Depok",
    "wcode": "WH059",
    "salesPoint": "Depok"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Pusat",
    "wcode": "WH069",
    "salesPoint": "Jakarta Pusat"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Utara",
    "wcode": "WH052",
    "salesPoint": "Jakarta Utara"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Bogor",
    "wcode": "WH060",
    "salesPoint": "Bogor"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Serang",
    "wcode": "WH068",
    "salesPoint": "Serang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Bekasi",
    "wcode": "WH075",
    "salesPoint": "Bekasi"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Karawang",
    "wcode": "WH066",
    "salesPoint": "Karawang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Tangerang",
    "wcode": "WH057",
    "salesPoint": "Tangerang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Rangkasbitung",
    "wcode": "WH077",
    "salesPoint": "Rangkasbitung"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 2",
    "wcode": "WH090",
    "salesPoint": "Bandung 2"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 2",
    "wcode": "WH169",
    "salesPoint": "DPC Sumedang"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Garut",
    "wcode": "WH083",
    "salesPoint": "Garut"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 1",
    "wcode": "WH089",
    "salesPoint": "Bandung 1"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 3",
    "wcode": "WH078",
    "salesPoint": "Bandung 3"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Cirebon",
    "wcode": "WH084",
    "salesPoint": "Cirebon"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Sukabumi",
    "wcode": "WH079",
    "salesPoint": "Sukabumi"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Tasikmalaya",
    "wcode": "WH082",
    "salesPoint": "Tasikmalaya"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Madiun",
    "wcode": "WH111",
    "salesPoint": "Madiun"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Magelang",
    "wcode": "WH108",
    "salesPoint": "Magelang"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Purwokerto",
    "wcode": "WH087",
    "salesPoint": "Purwokerto"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Salatiga",
    "wcode": "WH112",
    "salesPoint": "Salatiga"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Surakarta",
    "wcode": "WH109",
    "salesPoint": "Surakarta"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Yogyakarta",
    "wcode": "WH106",
    "salesPoint": "Yogyakarta"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Kediri",
    "wcode": "WH117",
    "salesPoint": "Kediri"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Pati",
    "wcode": "WH104",
    "salesPoint": "Pati"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Semarang",
    "wcode": "WH099",
    "salesPoint": "Semarang"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Tegal",
    "wcode": "WH101",
    "salesPoint": "Tegal"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Tuban",
    "wcode": "WH115",
    "salesPoint": "Tuban"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Surabaya",
    "wcode": "WH131",
    "salesPoint": "Surabaya"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Jember",
    "wcode": "WH122",
    "salesPoint": "DPC Banyuwangi"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Jember",
    "wcode": "WH120",
    "salesPoint": "Jember"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Pamekasan",
    "wcode": "WH119",
    "salesPoint": "Pamekasan"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Gresik",
    "wcode": "WH124",
    "salesPoint": "Gresik"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Mojokerto",
    "wcode": "WH126",
    "salesPoint": "Mojokerto"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Probolinggo",
    "wcode": "WH123",
    "salesPoint": "Probolinggo"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Malang",
    "wcode": "WH116",
    "salesPoint": "Malang"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Sidoarjo",
    "wcode": "WH129",
    "salesPoint": "Sidoarjo"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Denpasar",
    "wcode": "WH133",
    "salesPoint": "Denpasar"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "EZD Alor"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "EZD Atambua"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "Kupang"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH273",
    "salesPoint": "EZD Sumbawa - Bima"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH273",
    "salesPoint": "EZD Sumbawa - Sumbawa"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH136",
    "salesPoint": "Mataram"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH244",
    "salesPoint": "DPC Ende"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH271",
    "salesPoint": "DPC Ruteng"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH270",
    "salesPoint": "EZD Maumere"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH266",
    "salesPoint": "EZD Sumba"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Denpasar",
    "wcode": "WH135",
    "salesPoint": "DPC Singaraja"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Balikpapan",
    "wcode": "WH145",
    "salesPoint": "Balikpapan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH140",
    "salesPoint": "Banjarmasin"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH141",
    "salesPoint": "DPC Barabai"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH141",
    "salesPoint": "EZD Kotabaru"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH231",
    "salesPoint": "Sales Point Nunukan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH274",
    "salesPoint": "Sales Point Tanjung Redeb"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH275",
    "salesPoint": "Sales Point Tarakan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Samarinda",
    "wcode": "WH143",
    "salesPoint": "Samarinda"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH241",
    "salesPoint": "EZD Pangkalan Bun"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH277",
    "salesPoint": "EZD Sampit"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH142",
    "salesPoint": "Palangkaraya"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Pontianak",
    "wcode": "WH245",
    "salesPoint": "EZD Ketapang"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Pontianak",
    "wcode": "WH138",
    "salesPoint": "Pontianak"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Sintang",
    "wcode": "WH139",
    "salesPoint": "Sintang"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Manado",
    "wcode": "WH007",
    "salesPoint": "Manado"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Pare-Pare",
    "wcode": "WH006",
    "salesPoint": "DPC Palopo"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Kendari",
    "wcode": "WH278",
    "salesPoint": "EZD Bau-Bau"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Palu",
    "wcode": "WH280",
    "salesPoint": "EZD Luwuk"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Gorontalo",
    "wcode": "WH010",
    "salesPoint": "Gorontalo"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Palu",
    "wcode": "WH009",
    "salesPoint": "Palu"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Pare-Pare",
    "wcode": "WH005",
    "salesPoint": "Pare-Pare"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Kendari",
    "wcode": "WH016",
    "salesPoint": "Kendari"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Makassar 1",
    "wcode": "WH004",
    "salesPoint": "Makassar 1"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Makassar 2",
    "wcode": "WH014",
    "salesPoint": "Makassar 2"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ambon",
    "wcode": "WH008",
    "salesPoint": "Ambon"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ambon",
    "wcode": "WH282",
    "salesPoint": "EZD Tual"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH285",
    "salesPoint": "EZD Merauke"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH286",
    "salesPoint": "EZD Nabire"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH289",
    "salesPoint": "Sales Point Fak-Fak"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH012",
    "salesPoint": "Sales Point Kaimana"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH290",
    "salesPoint": "Sales Point Manokwari"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH288",
    "salesPoint": "Sales Point Timika"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH012",
    "salesPoint": "Sorong"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ternate",
    "wcode": "WH011",
    "salesPoint": "Ternate"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH283",
    "salesPoint": "EZD Biak"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH287",
    "salesPoint": "EZD Serui"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH013",
    "salesPoint": "Jayapura"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Padang",
    "wcode": "WH032",
    "salesPoint": "DPC Solok"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Padang",
    "wcode": "WH031",
    "salesPoint": "Padang"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Bukittinggi",
    "wcode": "WH033",
    "salesPoint": "Bukittinggi"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Timur",
    "wcode": "WH295",
    "salesPoint": "Pasar Minggu"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 3",
    "wcode": "WH096",
    "salesPoint": "DPC Padalarang"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Lhokseumawe",
    "wcode": "WH026",
    "salesPoint": "Lhokseumawe"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Medan 1",
    "wcode": "WH020",
    "salesPoint": "Medan 1"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Medan 2",
    "wcode": "WH021",
    "salesPoint": "Medan 2"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Tanah Karo",
    "wcode": "WH017",
    "salesPoint": "Tanah Karo"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Banda Aceh",
    "wcode": "WH024",
    "salesPoint": "Banda Aceh"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Pematang Siantar",
    "wcode": "WH022",
    "salesPoint": "Pematang Siantar"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Kisaran",
    "wcode": "WH030",
    "salesPoint": "Kisaran"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Padang Sidempuan",
    "wcode": "WH028",
    "salesPoint": "Padang Sidempuan"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Batam",
    "wcode": "WH038",
    "salesPoint": "Batam"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Air Molek",
    "wcode": "WH037",
    "salesPoint": "Air Molek"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Duri",
    "wcode": "WH036",
    "salesPoint": "Duri"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Tanjung Pinang",
    "wcode": "WH256",
    "salesPoint": "EZD Tanjung Balai Karimun"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Pekanbaru",
    "wcode": "WH034",
    "salesPoint": "Pekanbaru"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Tanjung Pinang",
    "wcode": "WH039",
    "salesPoint": "Tanjung Pinang"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Lahat",
    "wcode": "WH045",
    "salesPoint": "Lahat"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Jambi",
    "wcode": "WH047",
    "salesPoint": "Jambi"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Palembang 1",
    "wcode": "WH044",
    "salesPoint": "Palembang 1"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Muara Bungo",
    "wcode": "WH048",
    "salesPoint": "Muara Bungo"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Palembang 2",
    "wcode": "WH179",
    "salesPoint": "Palembang 2"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Lahat",
    "wcode": "WH046",
    "salesPoint": "DPC Baturaja"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Pangkal Pinang",
    "wcode": "WH258",
    "salesPoint": "EZD Bangka"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Pangkal Pinang",
    "wcode": "WH259",
    "salesPoint": "EZD Belitung"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH041",
    "salesPoint": "Bandar Lampung"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bengkulu",
    "wcode": "WH049",
    "salesPoint": "Bengkulu"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Kotabumi",
    "wcode": "WH042",
    "salesPoint": "Kotabumi"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Metro",
    "wcode": "WH156",
    "salesPoint": "Metro"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH166",
    "salesPoint": "DPC Pringsewu"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bengkulu",
    "wcode": "WH051",
    "salesPoint": "DPC Lubuk Linggau"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH167",
    "salesPoint": "DPC Kalianda"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Kotabumi",
    "wcode": "WH212",
    "salesPoint": "DPC Tulang Bawang"
  }
];

const emptyPic = { name: "", email: "", phone: "" };
const emptyAddress = { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };

function findSeed(zone: string, region: string, area: string, salesPointName: string) {
  const areaSeeds = salesPointSeeds.filter(
    (s) => s.zone === zone && s.region === region && s.area === area,
  );

  let best = areaSeeds.find((s) => s.subArea === salesPointName);
  if (best) return best;

  best = areaSeeds.find((s) => s.subArea.toLowerCase() === salesPointName.toLowerCase());
  if (best) return best;

  best = areaSeeds.find(
    (s) =>
      s.subArea.toLowerCase().includes(salesPointName.toLowerCase()) ||
      salesPointName.toLowerCase().includes(s.subArea.toLowerCase()),
  );
  if (best) return best;

  return areaSeeds[0] ?? null;
}

export const mockSalesPoints: SalesPointMapping[] = baseSalesPoints.map((salesPoint) => {
  const seed = findSeed(salesPoint.zone, salesPoint.region, salesPoint.area, salesPoint.salesPoint);

  return {
    ...salesPoint,
    subArea: seed?.subArea ?? salesPoint.salesPoint,
    pic1: seed?.pic1 ?? emptyPic,
    pic2: seed?.pic2 ?? emptyPic,
    remarks: seed?.remarks ?? "",
    note: seed?.note ?? "",
    shippingAddress: seed?.shippingAddress ?? emptyAddress,
    ...boundClient,
  };
});

export function getSalesPointPicByWcode(wcode: string): { name: string; email: string } {
  const salesPoint = mockSalesPoints.find((sp) => sp.wcode === wcode);
  return {
    name: salesPoint?.pic1?.name || "",
    email: salesPoint?.pic1?.email || "",
  };
}

export const mockOrders: Order[] = mockOrderSeeds.map((order) => {
  const pic = getSalesPointPicByWcode(order.salesPointId);
  return {
    ...order,
    picProject: {
      name: pic.name || order.picProject.name,
      email: pic.email || order.picProject.email,
    },
    status: getOrderRequestStatus(order.items),
  };
});

export function generateSoNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `SO${y}${mm}${dd}${random}`;
}

export function getSalesPointClientBinding(salesPointId: string) {
  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === salesPointId);

  if (!salesPoint) {
    return null;
  }

  return {
    clientId: salesPoint.clientId,
    clientName: salesPoint.clientName,
    clientEntityName: salesPoint.clientEntityName,
  };
}
