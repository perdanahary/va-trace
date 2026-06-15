import {
  mockProducts,
  mockSalesPoints,
} from "@/lib/mockData";
import type {
  StoredPackagingLabel,
  StoredDeliveryNoteRecord,
  Order,
  LabelStatus,
  SalesPointMapping,
} from "@/lib/types";
import type { ShipmentBatch } from "@/lib/types/logistics";
import { findSupplierByName } from "@/lib/supplierStore";
import { getOrdersSnapshot } from "@/lib/orderStore";

export interface CompanyProfile {
  name: string;
  addressLines: string[];
  phone: string;
}

export interface HHGlobalContact {
  label: string;
  name: string;
  email: string;
  phone: string;
}

export interface SalesPointDeliveryProfile extends SalesPointMapping {
  deliveryCompanyName: string;
  deliveryLocationName: string;
  address: string;
  phone: string;
  picClient: string;
}

export interface DeliveryNoteLine {
  id: string;
  poLineNumber: string;
  materialCode: string;
  description: string;
  orderedQty: number;
  deliveredQty: number;
  outstandingQty: number;
  uom: string;
  orderedAreaText?: string;
  deliveredAreaText?: string;
  outstandingAreaText?: string;
}

export interface DeliveryNote {
  id: string;
  orderId: string;
  shipmentBatchId?: string;
  status?: string;
  doNumber: string;
  barcodeValue: string;
  qrPayload: string;
  poNumber: string;
  soNumber: string;
  projectName: string;
  senderProfile: CompanyProfile;
  hhGlobalContacts: HHGlobalContact[];
  deliverySnapshot: SalesPointDeliveryProfile;
  lines: DeliveryNoteLine[];
  note: string;
  deliveredBy: SignatureBlock;
  receivedBy: SignatureBlock;
  missingRequiredFields: string[];
}

export interface PackagingLabel {
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
}

export interface PackagingLabelsDocument {
  orderId: string;
  doNumber: string;
  senderProfile: CompanyProfile;
  deliverySnapshot: SalesPointDeliveryProfile;
  labels: PackagingLabel[];
  missingRequiredFields: string[];
}

interface SignatureBlock {
  date: string;
  name: string;
}

const fallbackSenderProfile: CompanyProfile = {
  name: "PT. HH Global Services Indonesia",
  addressLines: [
    "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
    "Jl. Jendral Sudirman Kav. 52-53",
    "Daerah Khusus Ibu Kota Jakarta 12830",
  ],
  phone: "+62 21 515 7606",
};

const hhGlobalContacts: HHGlobalContact[] = [
  {
    label: "TRADE",
    name: "Kiky Natalia",
    email: "Kiky.Natalia@hhglobal.com",
    phone: "0878 4009 7700",
  },
  {
    label: "OOH",
    name: "Dias Tranantha",
    email: "Dias.Tranantha@hhglobal.com",
    phone: "0811 1441 516",
  },
];

function getSalesPointFallbackAddress(salesPoint: typeof mockSalesPoints[number]) {
  return `${salesPoint.salesPoint}, ${salesPoint.region}, ${salesPoint.zone}`;
}

export function getSalesPointDeliveryProfile(salesPointId: string): SalesPointDeliveryProfile {
  const salesPoint =
    mockSalesPoints.find((entry) => entry.wcode === salesPointId) ??
    mockSalesPoints[0];

  return {
    ...salesPoint,
    deliveryCompanyName:
      salesPoint.deliveryCompanyName ||
      "PT. HM. Sampoerna Tbk",
    deliveryLocationName:
      salesPoint.deliveryLocationName ||
      `PT HMS ${salesPoint.salesPoint}`,
    address:
      salesPoint.address ||
      (salesPoint.shippingAddress?.alamat || getSalesPointFallbackAddress(salesPoint)),
    phone: salesPoint.phone || salesPoint.pic1?.phone || "",
    picClient: salesPoint.picClient || salesPoint.pic1?.name || "",
  };
}

export function getDeliveryProfileFromOrder(order: Order) {
  return getSalesPointDeliveryProfile(order.salesPointId);
}

/**
 * Build a StoredPackagingLabel record for a single item line.
 * This is the canonical "label" data that gets stored and drives delivery notes.
 */
export function buildLabelRecord(
  order: Order,
  item: Order['items'][number],
  doNumber: string,
  deliverySnapshot: SalesPointDeliveryProfile,
  shipmentBatch?: ShipmentBatch,
): StoredPackagingLabel {
  const deliveredQty = item.deliveredQuantity ?? 0;
  const labelCode = `${doNumber}-${item.poLineNumber.padStart(3, "0")}`;

  return {
    id: labelCode,
    lineId: item.id,
    labelCode,
    qrPayload: `va-trace://packaging-label/${doNumber}/${item.id}`,
    orderId: order.id,
    shipmentBatchId: shipmentBatch?.id,
    doNumber,
    poLineNumber: item.poLineNumber,
    productCode: item.productCode,
    productName: item.name,
    deliveredQty,
    uom: "Pcs",
    destinationCompanyName: deliverySnapshot.deliveryCompanyName,
    destinationLocationName: deliverySnapshot.deliveryLocationName,
    destinationAddress: deliverySnapshot.address,
    salesPointCode: deliverySnapshot.wcode,
    projectName: order.campaign ?? "",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Compute aggregate labelStatus for an order based on item-level labelGenerated marks.
 */
export function computeLabelStatus(items: Order['items']): LabelStatus {
  const total = items.length;
  const labeled = items.filter((i) => i.labelGenerated).length;

  if (labeled === 0) return "none";
  if (labeled >= total) return "all";
  return "partial";
}

/**
 * Build a StoredDeliveryNoteRecord from stored labels + order data.
 * This is always derived from the stored (canonical) labels — binding is enforced.
 */
export function buildDeliveryNoteRecord(
  order: Order,
  scopeLabels: StoredPackagingLabel[],
  doNumber: string,
  deliverySnapshot: SalesPointDeliveryProfile,
  shipmentBatch?: ShipmentBatch,
): StoredDeliveryNoteRecord {
  const senderProfile = getSenderProfile(order.supplier);
  const scopeLabelIds = scopeLabels.map((l) => l.id);
  const lines = order.items.map((item) => {
    const scopeLabel = scopeLabels.find((l) => l.lineId === item.id);
    const deliveredQty = scopeLabel?.deliveredQty ?? item.deliveredQuantity ?? 0;
    return {
      id: item.id,
      poLineNumber: item.poLineNumber,
      materialCode: item.productCode,
      description: item.name,
      orderedQty: item.quantity,
      deliveredQty,
      outstandingQty: Math.max(item.quantity - deliveredQty, 0),
      uom: "Pcs",
    };
  });

  return {
    id: doNumber,
    shipmentBatchId: shipmentBatch?.id,
    status: "GENERATED",
    doNumber,
    barcodeValue: doNumber,
    qrPayload: `va-trace://delivery-note/${doNumber}`,
    poNumber: order.clientPO,
    soNumber: order.soNumber,
    projectName: order.campaign ?? "",
    senderProfile: {
      name: senderProfile.name,
      addressLines: senderProfile.addressLines,
      phone: senderProfile.phone,
    },
    deliverySnapshot: {
      deliveryCompanyName: deliverySnapshot.deliveryCompanyName,
      deliveryLocationName: deliverySnapshot.deliveryLocationName,
      address: deliverySnapshot.address,
      phone: deliverySnapshot.phone,
      picClient: deliverySnapshot.picClient,
      wcode: deliverySnapshot.wcode,
    },
    lines,
    note: "Tim Area WAJIB melakukan GR CPT dan COUPA.",
    createdAt: new Date().toISOString(),
    scopeLabelIds,
  };
}

export function buildDeliveryNoteRecordFromShipmentBatch(
  order: Order,
  shipmentBatch: ShipmentBatch,
  doNumber: string,
  deliverySnapshot: SalesPointDeliveryProfile,
): StoredDeliveryNoteRecord {
  const labels = shipmentBatch.items.map((shipmentItem) => {
    const item = order.items.find((entry) => entry.id === shipmentItem.orderLineId);

    if (!item) {
      return null;
    }

    return buildLabelRecord(
      order,
      { ...item, deliveredQuantity: shipmentItem.quantity },
      doNumber,
      deliverySnapshot,
      shipmentBatch,
    );
  }).filter((label): label is StoredPackagingLabel => Boolean(label));

  return buildDeliveryNoteRecord(order, labels, doNumber, deliverySnapshot, shipmentBatch);
}

function createDoNumber(order: Order) {
  const numericSeed = order.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `DEL${order.createdDate.replace(/\D/g, "")}${numericSeed}`;
}

function getSenderProfile(supplierName: string): CompanyProfile {
  const supplier = findSupplierByName(supplierName);

  if (!supplier) {
    return fallbackSenderProfile;
  }

  return {
    name: supplier.name,
    addressLines: supplier.addressLines?.length ? supplier.addressLines : fallbackSenderProfile.addressLines,
    phone: supplier.phone || fallbackSenderProfile.phone,
  };
}

// ============================================================
// Legacy computed functions (for backward compat / print views)
// These now read from stored labels when available.
// ============================================================

export function generateDeliveryNote(order: Order): DeliveryNote {
  const deliverySnapshot = getSalesPointDeliveryProfile(order.salesPointId);
  const senderProfile = getSenderProfile(order.supplier);
  const doNumber = createDoNumber(order);
  const shipmentBatch = order.shipmentBatches[0];
  const storedBatchNote = shipmentBatch
    ? order.storedDeliveryNotes.find((note) => note.shipmentBatchId === shipmentBatch.id)
    : undefined;
  const generatedBatchNote = shipmentBatch
    ? buildDeliveryNoteRecordFromShipmentBatch(order, shipmentBatch, storedBatchNote?.doNumber ?? doNumber, deliverySnapshot)
    : undefined;

  // Use stored labels as source of truth if available
  const storedLabels = order.storedLabels ?? [];
  const lines = order.items.map((item) => {
    const product = mockProducts.find((entry) => entry.code === item.productCode);
    const storedLabel = storedLabels.find((l) => l.lineId === item.id && (!shipmentBatch || l.shipmentBatchId === shipmentBatch.id));
    const batchItem = shipmentBatch?.items.find((entry) => entry.orderLineId === item.id);
    const batchLine = generatedBatchNote?.lines.find((entry) => entry.id === item.id);
    const deliveredQty = batchLine?.deliveredQty ?? batchItem?.quantity ?? storedLabel?.deliveredQty ?? item.deliveredQuantity ?? 0;
    const areaText = getAreaText(product?.dimensions, deliveredQty);

    return {
      id: item.id,
      poLineNumber: item.poLineNumber,
      materialCode: item.productCode,
      description: product?.name ?? item.name,
      orderedQty: item.quantity,
      deliveredQty,
      outstandingQty: Math.max(item.quantity - deliveredQty, 0),
      uom: "Pcs",
      orderedAreaText: getAreaText(product?.dimensions, item.quantity),
      deliveredAreaText: areaText,
      outstandingAreaText: getAreaText(product?.dimensions, Math.max(item.quantity - deliveredQty, 0)),
    };
  });

  return {
    id: doNumber,
    orderId: order.id,
    shipmentBatchId: shipmentBatch?.id,
    status: generatedBatchNote?.status,
    doNumber,
    barcodeValue: doNumber,
    qrPayload: `va-trace://delivery-note/${doNumber}`,
    poNumber: order.clientPO,
    soNumber: order.soNumber,
    projectName: order.campaign ?? "",
    senderProfile,
    hhGlobalContacts,
    deliverySnapshot,
    lines,
    note: "Tim Area WAJIB melakukan GR CPT dan COUPA.",
    deliveredBy: { date: "", name: "" },
    receivedBy: { date: "", name: "" },
    missingRequiredFields: getMissingRequiredFields(order, deliverySnapshot),
  };
}

export function generatePackagingLabels(order: Order): PackagingLabelsDocument {
  const deliverySnapshot = getSalesPointDeliveryProfile(order.salesPointId);
  const senderProfile = getSenderProfile(order.supplier);
  const doNumber = createDoNumber(order);

  // Use stored labels as source of truth when available
  const storedLabels = order.storedLabels ?? [];
  const labels: PackagingLabel[] = [];

  const processedLineIds = new Set<string>();

  // First: use stored labels
  for (const stored of storedLabels) {
    processedLineIds.add(stored.lineId);
    labels.push({
      id: stored.id,
      lineId: stored.lineId,
      labelCode: stored.labelCode,
      qrPayload: stored.qrPayload,
      orderId: stored.orderId,
      doNumber: stored.doNumber,
      poLineNumber: stored.poLineNumber,
      productCode: stored.productCode,
      productName: stored.productName,
      deliveredQty: stored.deliveredQty,
      uom: stored.uom,
      destinationCompanyName: stored.destinationCompanyName,
      destinationLocationName: stored.destinationLocationName,
      destinationAddress: stored.destinationAddress,
      salesPointCode: stored.salesPointCode,
      projectName: stored.projectName,
    });
  }

  // Fallback: for items with delivered qty > 0 but no stored label yet
  for (const item of order.items) {
    if (processedLineIds.has(item.id)) continue;
  const deliveredQty = item.deliveredQuantity ?? item.quantity;
    if (deliveredQty <= 0) continue;

    const labelCode = `${doNumber}-${item.poLineNumber.padStart(3, "0")}`;
    labels.push({
      id: labelCode,
      lineId: item.id,
      labelCode,
      qrPayload: `va-trace://packaging-label/${doNumber}/${item.id}`,
      orderId: order.id,
      doNumber,
      poLineNumber: item.poLineNumber,
      productCode: item.productCode,
      productName: item.name,
      deliveredQty,
      uom: "Pcs",
      destinationCompanyName: deliverySnapshot.deliveryCompanyName,
      destinationLocationName: deliverySnapshot.deliveryLocationName,
      destinationAddress: deliverySnapshot.address,
      salesPointCode: deliverySnapshot.wcode,
      projectName: order.campaign ?? "",
    });
  }

  return {
    orderId: order.id,
    doNumber,
    senderProfile,
    deliverySnapshot,
    labels,
    missingRequiredFields: getMissingRequiredFields(order, deliverySnapshot),
  };
}

export function getDeliveryNoteByOrderId(orderId: string) {
  const order = getOrdersSnapshot().find((entry) => entry.id === orderId);
  return order ? generateDeliveryNote(order) : null;
}

function getMissingRequiredFields(order: Order, salesPoint: SalesPointDeliveryProfile) {
  const missing: string[] = [];

  if (!order.campaign) missing.push("Campaign Name / Project");
  if (!salesPoint.deliveryCompanyName) missing.push("Deliver-to company");
  if (!salesPoint.deliveryLocationName) missing.push("Deliver-to location");
  if (!salesPoint.address) missing.push("Deliver-to address");
  if (!salesPoint.phone) missing.push("Deliver-to phone");

  return missing;
}

function getAreaText(dimensions: string | undefined, quantity: number) {
  if (!dimensions || quantity <= 0) {
    return undefined;
  }

  const match = dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*(cm|m)/i);

  if (!match) {
    return undefined;
  }

  const left = Number(match[1]);
  const right = Number(match[2]);
  const unit = match[3].toLowerCase();

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return undefined;
  }

  const squareMeters = unit === "cm" ? (left / 100) * (right / 100) : left * right;

  return `${trimArea(squareMeters * quantity)}m2`;
}

function trimArea(value: number) {
  return value.toFixed(3).replace(/\.?0+$/, "");
}
