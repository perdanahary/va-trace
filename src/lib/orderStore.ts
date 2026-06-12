import { useSyncExternalStore } from "react";
import {
  generateSoNumber,
  getSalesPointClientBinding,
  mockOrders,
} from "@/lib/mockData";
import { normalizeOrderReferenceLink, normalizeOrderTags, type OrderReferenceLink } from "@/lib/orderMetadata";
import type {
  ComplaintHistoryEntry,
  ComplaintLineItem,
  ComplaintStatus,
  Order,
  OrderComplaint,
  OrderLine,
  StoredPackagingLabel,
  StoredDeliveryNoteRecord,
  LabelStatus,
} from "@/lib/types";
import { normalizeOrder, normalizeOrders } from "@/lib/orderDomain";
import { getOrderRequestStatus } from "@/lib/orderStatus";
import { buildLabelRecord, buildDeliveryNoteRecord, computeLabelStatus, getSalesPointDeliveryProfile } from "@/lib/deliveryNote";
import type { DeliveryConfirmation, ShipmentBatch } from "@/lib/types/logistics";

export interface ImportedOrderLine extends OrderLine {
  sourceBatchId?: string;
  sourceRowId?: string;
  sourcePoNumber?: string;
  brandNamePo?: string;
}

export interface StoredOrder extends Order {
  sourceType?: "manual" | "bulk_po_import";
  importBatchId?: string;
  importRowIds?: string[];
  importGroupKey?: string;
  assignedVendorId?: string;
  dispatchRunId?: string;
  importPoNumbers?: string[];
  items: ImportedOrderLine[];
}

export interface ManualOrderLineDraft {
  productCode: string;
  name: string;
  quantity: number;
  poLineNumber?: string;
}

export interface ManualOrderDraft {
  campaign: string;
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  clientPO: string;
  soNumber?: string;
  supplier: string;
  salesPointId: string;
  picProjectName?: string;
  picProjectEmail?: string;
  deadline: string;
  createdDate?: string;
  sourceType?: "manual";
  note?: string;
  items: ManualOrderLineDraft[];
}

export interface RaiseComplaintInput {
  remarks: string;
  createdBy: string;
  items: Array<Pick<ComplaintLineItem, "lineId" | "actualReceivedQty">>;
}

export interface ResolveComplaintInput {
  decision: ComplaintStatus;
  reviewedBy: string;
  reviewNote?: string;
}

export interface CreateShipmentBatchInput {
  items?: Array<{
    orderLineId: string;
    quantity: number;
    salesPointId?: string;
  }>;
}

export interface PodUploadInput {
  salesPointId?: string;
  receiverName: string;
  receivedAt?: string;
  scannedDeliveryNoteUrl?: string;
  photoUrls?: string[];
  remarks?: string;
}

const STORAGE_KEY = "va-trace-orders";
const STORE_EVENT = "va-trace-orders:change";
const defaultOrders = normalizeOrders(mockOrders) as StoredOrder[];
let cachedOrders: StoredOrder[] = defaultOrders;
let cachedStorageValue: string | null = null;

function readStoredOrders(): StoredOrder[] {
  if (typeof window === "undefined") {
    return defaultOrders;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      if (cachedStorageValue === null) {
        return cachedOrders;
      }

      cachedOrders = defaultOrders;
      cachedStorageValue = null;
      return cachedOrders;
    }

    if (stored === cachedStorageValue) {
      return cachedOrders;
    }

    const parsed = JSON.parse(stored) as StoredOrder[];
    if (Array.isArray(parsed)) {
      cachedOrders = normalizeOrders(parsed) as StoredOrder[];
      cachedStorageValue = stored;
      return cachedOrders;
    }

    cachedOrders = defaultOrders;
    cachedStorageValue = null;
    return cachedOrders;
  } catch {
    return cachedOrders;
  }
}

function writeStoredOrders(nextOrders: StoredOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedOrders = normalizeOrders(nextOrders) as StoredOrder[];
  const serialized = JSON.stringify(normalizedOrders);
  cachedOrders = normalizedOrders;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORE_EVENT));
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleStoreEvent = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleStoreEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleStoreEvent);
  };
}

export function getOrdersSnapshot() {
  return readStoredOrders();
}

export function useOrders() {
  return useSyncExternalStore(subscribe, readStoredOrders, () => defaultOrders);
}

export function saveOrders(nextOrders: StoredOrder[]) {
  writeStoredOrders(nextOrders);
}

export function appendOrders(newOrders: StoredOrder[]) {
  const existingOrders = readStoredOrders();
  writeStoredOrders([...newOrders, ...existingOrders]);
}

export function upsertOrder(updatedOrder: StoredOrder) {
  const existingOrders = readStoredOrders();
  const normalizedOrder = normalizeOrder(updatedOrder) as StoredOrder;
  const nextOrders = existingOrders.some((order) => order.id === updatedOrder.id)
    ? existingOrders.map((order) => (order.id === updatedOrder.id ? normalizedOrder : order))
    : [normalizedOrder, ...existingOrders];

  writeStoredOrders(nextOrders);
}

function resolveComplaintLineItems(order: StoredOrder, inputItems: RaiseComplaintInput["items"]): ComplaintLineItem[] {
  return order.items.map((item) => {
    const requestedItem = inputItems.find((entry) => entry.lineId === item.id);
    const systemDeliveredQty = item.deliveredQuantity ?? item.quantity;
    const actualReceivedQty = clampQuantity(requestedItem?.actualReceivedQty ?? systemDeliveredQty, item.quantity);

    return {
      lineId: item.id,
      productCode: item.productCode,
      productName: item.name,
      poLineNumber: item.poLineNumber,
      orderedQty: item.quantity,
      systemDeliveredQty,
      actualReceivedQty,
      deltaQty: Math.max(systemDeliveredQty - actualReceivedQty, 0),
    };
  });
}

function createComplaintHistory(action: ComplaintHistoryEntry["action"], actor: string, note?: string) {
  return {
    id: `${action}-${Date.now()}`,
    action,
    actor,
    timestamp: new Date().toISOString(),
    note,
  };
}

function clampQuantity(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(value), max));
}

function makeOrderId() {
  return `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function createDoNumber(order: { id: string; createdDate: string }) {
  const numericSeed = order.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `DEL${order.createdDate.replace(/\D/g, "")}${numericSeed}`;
}

export function generateLabelForItem(orderId: string, lineId: string): StoredPackagingLabel | null {
  const existingOrders = readStoredOrders();
  let generatedLabel: StoredPackagingLabel | null = null;

  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const item = order.items.find((i) => i.id === lineId);
    if (!item) return order;

    const dn = getSalesPointDeliveryProfile(order.salesPointId);
    const doNumber = createDoNumber(order);
    const shipmentBatch = order.shipmentBatches.find((batch) => batch.items.some((batchItem) => batchItem.orderLineId === lineId));
    const label = buildLabelRecord(order, item, doNumber, dn, shipmentBatch);

    const alreadyExists = order.storedLabels.some((l) => l.lineId === lineId);
    const nextLabels = alreadyExists
      ? order.storedLabels.map((l) => (l.lineId === lineId ? label : l))
      : [...order.storedLabels, label];

    const nextItems = order.items.map((i) =>
      i.id === lineId
        ? { ...i, labelGenerated: true, labelGeneratedAt: new Date().toISOString() }
        : i
    );

    generatedLabel = label;

    return {
      ...order,
      items: nextItems,
      storedLabels: nextLabels,
      labelStatus: computeLabelStatus(nextItems) as LabelStatus,
      labelGeneratedAt: new Date().toISOString(),
    };
  });

  writeStoredOrders(nextOrders);
  return generatedLabel;
}

export function generateBulkLabels(orderId: string): StoredPackagingLabel[] {
  const existingOrders = readStoredOrders();
  let generatedLabels: StoredPackagingLabel[] = [];

  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const dn = getSalesPointDeliveryProfile(order.salesPointId);
    const doNumber = createDoNumber(order);

    const nextItems = order.items.map((item) => {
      if ((item.deliveredQuantity ?? 0) <= 0) return item;
      if (item.labelGenerated) return item;
      return { ...item, labelGenerated: true, labelGeneratedAt: new Date().toISOString() };
    });

    const newLabels = order.items
      .filter((item) => (item.deliveredQuantity ?? 0) > 0 && !order.storedLabels.some((l) => l.lineId === item.id))
      .map((item) => {
        const shipmentBatch = order.shipmentBatches.find((batch) => batch.items.some((batchItem) => batchItem.orderLineId === item.id));
        return buildLabelRecord(order, item, doNumber, dn, shipmentBatch);
      });

    const nextLabels = [...order.storedLabels, ...newLabels];
    generatedLabels = nextLabels;

    return {
      ...order,
      items: nextItems,
      storedLabels: nextLabels,
      labelStatus: computeLabelStatus(nextItems) as LabelStatus,
      labelGeneratedAt: new Date().toISOString(),
    };
  });

  writeStoredOrders(nextOrders);
  return generatedLabels;
}

export function regenerateDeliveryNote(orderId: string, scopeLineIds?: string[]): StoredDeliveryNoteRecord | null {
  const existingOrders = readStoredOrders();
  let generatedNote: StoredDeliveryNoteRecord | null = null;

  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const dn = getSalesPointDeliveryProfile(order.salesPointId);
    const doNumber = createDoNumber(order);
    const shipmentBatch = order.shipmentBatches[0];

    const scopeLabels = scopeLineIds
      ? order.storedLabels.filter((l) => scopeLineIds.includes(l.lineId))
      : order.storedLabels.filter((l) => order.items.some((i) => i.id === l.lineId && (i.deliveredQuantity ?? 0) > 0));

    if (scopeLabels.length === 0) return order;

    const note = buildDeliveryNoteRecord(order, scopeLabels, doNumber, dn, shipmentBatch);
    const alreadyExists = order.storedDeliveryNotes.some((n) => n.id === note.id);
    const nextNotes = alreadyExists
      ? order.storedDeliveryNotes.map((n) => (n.id === note.id ? note : n))
      : [...order.storedDeliveryNotes, note];

    generatedNote = note;

    return { ...order, storedDeliveryNotes: nextNotes };
  });

  writeStoredOrders(nextOrders);
  return generatedNote;
}

export function createShipmentBatch(orderId: string, input: CreateShipmentBatchInput = {}): ShipmentBatch | null {
  const existingOrders = readStoredOrders();
  let createdBatch: ShipmentBatch | null = null;

  const nextOrders = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const batchNumber = order.shipmentBatches.length + 1;
    const requestedItems: Array<{ orderLineId: string; quantity: number; salesPointId?: string }> = input.items?.length
      ? input.items
      : order.items
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            orderLineId: item.id,
            quantity: item.deliveredQuantity && item.deliveredQuantity > 0 ? item.deliveredQuantity : item.quantity,
          }));

    const items = requestedItems.map((item) => {
      const line = order.items.find((entry) => entry.id === item.orderLineId);
      return {
        id: `${order.id}-SHP-${batchNumber}-${item.orderLineId}`,
        orderLineId: item.orderLineId,
        productCode: line?.productCode ?? "",
        salesPointId: item.salesPointId ?? order.salesPointId,
        quantity: clampQuantity(item.quantity, line?.quantity ?? item.quantity),
        receivedQuantity: 0,
      };
    });

    createdBatch = {
      id: `${order.id}-SHP-${batchNumber}`,
      orderId: order.id,
      batchNumber,
      status: "READY",
      salesPointIds: [...new Set(items.map((item) => item.salesPointId))],
      items,
      deliveryConfirmations: [],
    };

    return normalizeOrder({
      ...order,
      shipmentBatches: [...order.shipmentBatches, createdBatch],
    }) as StoredOrder;
  });

  writeStoredOrders(nextOrders);
  return createdBatch;
}

export function dispatchShipmentBatch(orderId: string, batchId: string) {
  const existingOrders = readStoredOrders();
  const nextOrders = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const shipmentBatches = order.shipmentBatches.map((batch) =>
      batch.id === batchId
        ? {
            ...batch,
            status: "DISPATCHED" as const,
            dispatchedAt: new Date().toISOString(),
          }
        : batch,
    );

    return normalizeOrder({ ...order, shipmentBatches }) as StoredOrder;
  });

  writeStoredOrders(nextOrders);
}

export function uploadPodForShipmentBatch(orderId: string, batchId: string, input: PodUploadInput): DeliveryConfirmation | null {
  const existingOrders = readStoredOrders();
  let confirmation: DeliveryConfirmation | null = null;

  const nextOrders = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const shipmentBatches = order.shipmentBatches.map((batch) => {
      if (batch.id !== batchId) return batch;

      const receivedAt = input.receivedAt ?? new Date().toISOString();
      confirmation = {
        id: `${batch.id}-POD-${batch.deliveryConfirmations.length + 1}`,
        shipmentBatchId: batch.id,
        salesPointId: input.salesPointId ?? batch.salesPointIds[0] ?? order.salesPointId,
        deliveryNoteId: batch.deliveryNoteId,
        receiverName: input.receiverName,
        receivedAt,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
        scannedDeliveryNoteUrl: input.scannedDeliveryNoteUrl,
        photoUrls: input.photoUrls ?? [],
        itemConfirmations: batch.items.map((item) => ({
          shipmentItemId: item.id,
          claimedReceivedQuantity: item.quantity,
        })),
        remarks: input.remarks,
      };

      return {
        ...batch,
        status: "FULLY_RECEIVED" as const,
        items: batch.items.map((item) => ({ ...item, receivedQuantity: item.quantity })),
        deliveryConfirmations: [...batch.deliveryConfirmations, confirmation as DeliveryConfirmation],
      };
    });

    const updatedItems = order.items.map((item) => {
      const receivedQuantity = shipmentBatches.reduce(
        (total, batch) =>
          total +
          batch.items
            .filter((shipmentItem) => shipmentItem.orderLineId === item.id)
            .reduce((shipmentTotal, shipmentItem) => shipmentTotal + shipmentItem.receivedQuantity, 0),
        0,
      );

      return {
        ...item,
        deliveredQuantity: receivedQuantity,
        status: receivedQuantity >= item.quantity ? "Delivered" as const : item.status,
      };
    });

    return normalizeOrder({ ...order, items: updatedItems, shipmentBatches }) as StoredOrder;
  });

  writeStoredOrders(nextOrders);
  return confirmation;
}

export function createManualOrder(draft: ManualOrderDraft): StoredOrder {
  const items: ImportedOrderLine[] = draft.items.map((item, index) => ({
    id: `ITEM-${index + 1}`,
    productCode: item.productCode,
    poLineNumber: item.poLineNumber?.trim() || String(index + 1),
    name: item.name,
    quantity: item.quantity,
    deliveredQuantity: 0,
    status: "New",
    labelGenerated: false,
  }));
  const salesPointClient = getSalesPointClientBinding(draft.salesPointId);

  return normalizeOrder({
    id: makeOrderId(),
    campaign: draft.campaign.trim(),
    tags: normalizeOrderTags(draft.tags),
    referenceLink: normalizeOrderReferenceLink(draft.referenceLink),
    status: getOrderRequestStatus(items),
    createdDate: draft.createdDate ?? toIsoDate(),
    deadline: draft.deadline.trim(),
    clientPO: draft.clientPO.trim(),
    soNumber: draft.soNumber?.trim() || "",
    supplier: draft.supplier.trim(),
    salesPointId: draft.salesPointId,
    clientId: salesPointClient?.clientId,
    clientName: salesPointClient?.clientName,
    clientEntityName: salesPointClient?.clientEntityName,
    picProject: {
      name: draft.picProjectName?.trim() ?? "",
      email: draft.picProjectEmail?.trim() ?? "",
    },
    sourceType: draft.sourceType ?? "manual",
    note: draft.note?.trim(),
    items,
    labelStatus: "none" as LabelStatus,
    storedLabels: [],
    storedDeliveryNotes: [],
  }) as StoredOrder;
}

export function startProduction(orderId: string) {
  const existingOrders = readStoredOrders();
  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) {
      return order;
    }

    const updatedItems = order.items.map((item) => {
      if (item.status === "New" || item.status === "Waiting") {
        return { ...item, status: "In Production" as const };
      }

      return item;
    });

    return {
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
      soNumber: order.soNumber || generateSoNumber(),
    };
  });

  writeStoredOrders(nextOrders);
}

export function raiseQuantityComplaint(orderId: string, input: RaiseComplaintInput) {
  const existingOrders = readStoredOrders();
  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) {
      return order;
    }

    const complaintItems = resolveComplaintLineItems(order, input.items);
    const complaint: OrderComplaint = {
      id: `CMP-${order.id}-${Date.now().toString().slice(-6)}`,
      status: "pending",
      remarks: input.remarks,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      items: complaintItems,
      history: [createComplaintHistory("created", input.createdBy, input.remarks)],
    };

    return {
      ...order,
      complaint,
      complaintStatus: "pending" as ComplaintStatus,
      revisionStatus: "pending" as ComplaintStatus,
    };
  });

  writeStoredOrders(nextOrders);
}

export function resolveQuantityComplaint(orderId: string, input: ResolveComplaintInput) {
  const existingOrders = readStoredOrders();
  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId || !order.complaint) {
      return order;
    }

    const nextComplaint: OrderComplaint = {
      ...order.complaint,
      status: input.decision,
      reviewedAt: new Date().toISOString(),
      reviewedBy: input.reviewedBy,
      reviewNote: input.reviewNote,
      history: [
        ...order.complaint.history,
        createComplaintHistory(input.decision === "approved" ? "approved" : "rejected", input.reviewedBy, input.reviewNote),
      ],
    };

    const updatedItems =
      input.decision === "approved"
        ? order.items.map((item) => {
            const complaintLine = nextComplaint.items.find((entry) => entry.lineId === item.id);

            if (!complaintLine) {
              return item;
            }

            return {
              ...item,
              deliveredQuantity: complaintLine.actualReceivedQty,
            };
          })
        : order.items;

    return {
      ...order,
      items: updatedItems,
      complaint: nextComplaint,
      complaintStatus: input.decision as ComplaintStatus,
      revisionStatus: input.decision as ComplaintStatus,
    };
  });

  writeStoredOrders(nextOrders);
}
