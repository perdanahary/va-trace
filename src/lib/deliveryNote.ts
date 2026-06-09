import {
  mockProducts,
  mockSalesPoints,
  type Order,
  type SalesPointMapping,
} from "@/lib/mockData";
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
  doNumber: string;
  barcodeValue: string;
  qrPayload: string;
  poNumber: string;
  soNumber: string;
  projectName: string;
  picProject: string;
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

export function getSalesPointDeliveryProfile(salesPointId: string): SalesPointDeliveryProfile {
  const salesPoint =
    mockSalesPoints.find((entry) => entry.wcode === salesPointId) ??
    mockSalesPoints[0];

  return {
    ...salesPoint,
    deliveryCompanyName:
      salesPoint.deliveryCompanyName ??
      "PT. HM. Sampoerna Tbk",
    deliveryLocationName:
      salesPoint.deliveryLocationName ??
      `PT HMS ${salesPoint.salesPoint}`,
    address:
      salesPoint.address ??
      salesPoint.shippingAddress.alamat ??
      `${salesPoint.salesPoint}, ${salesPoint.region}, ${salesPoint.zone}`,
    phone: salesPoint.phone ?? salesPoint.pic1.phone ?? "",
    picClient: salesPoint.picClient ?? salesPoint.pic1.name ?? "",
  };
}

export function generateDeliveryNote(order: Order): DeliveryNote {
  const deliverySnapshot = getSalesPointDeliveryProfile(order.salesPointId);
  const senderProfile = getSenderProfile(order.supplier);
  const doNumber = createDoNumber(order);
  const lines = order.items.map((item) => {
    const product = mockProducts.find((entry) => entry.code === item.productCode);
    const deliveredQty = item.deliveredQuantity ?? inferDeliveredQuantity(item.status, item.quantity);
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
    doNumber,
    barcodeValue: doNumber,
    qrPayload: `va-trace://delivery-note/${doNumber}`,
    poNumber: order.clientPO,
    soNumber: order.soNumber,
    projectName: order.campaign,
    picProject: `${order.picProject.name}(${order.picProject.email})`,
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

  const labels = order.items
    .map((item) => {
      const deliveredQty = item.deliveredQuantity ?? inferDeliveredQuantity(item.status, item.quantity);

      if (deliveredQty <= 0) {
        return null;
      }

      const labelCode = `${doNumber}-${item.poLineNumber.padStart(3, "0")}`;

      return {
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
        projectName: order.campaign,
      };
    })
    .filter((label): label is PackagingLabel => label !== null);

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

function createDoNumber(order: Order) {
  const numericSeed = order.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `DEL${order.createdDate.replace(/\D/g, "")}${numericSeed}`;
}

function inferDeliveredQuantity(status: string, quantity: number) {
  return ["Ready to Ship", "On Delivery", "Delivered", "Completed"].includes(status)
    ? quantity
    : 0;
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

function getMissingRequiredFields(order: Order, salesPoint: SalesPointDeliveryProfile) {
  const missing: string[] = [];

  if (!order.soNumber) missing.push("SO Number");
  if (!order.campaign) missing.push("Campaign Name / Project");
  if (!order.picProject.name || !order.picProject.email) missing.push("PIC Project");
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
