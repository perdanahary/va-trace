import { useSyncExternalStore } from "react";
import {
  generateSoNumber,
  getSalesPointClientBinding,
  mockOrders,
  type ComplaintHistoryEntry,
  type ComplaintLineItem,
  type ComplaintStatus,
  type Order,
  type OrderComplaint,
  type OrderLine,
  type StoredPackagingLabel,
  type StoredDeliveryNoteRecord,
  type LabelStatus,
} from "@/lib/mockData";
import { getOrderRequestStatus } from "@/lib/orderStatus";
import { buildLabelRecord, buildDeliveryNoteRecord, computeLabelStatus, getSalesPointDeliveryProfile } from "@/lib/deliveryNote";

export interface ImportedOrderLine extends OrderLine {
  sourceBatchId?: string;
  sourceRowId?: string;
  sourcePoNumber?: string;
  brandNamePo?: string;
}

export interface StoredOrder extends Omit<Order, "items"> {
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
  clientPO: string;
  soNumber?: string;
  supplier: string;
  salesPointId: string;
  picProjectName: string;
  picProjectEmail: string;
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

const STORAGE_KEY = "va-trace-orders";
const STORE_EVENT = "va-trace-orders:change";
let cachedOrders: StoredOrder[] = mockOrders;
let cachedStorageValue: string | null = null;

function readStoredOrders(): StoredOrder[] {
  if (typeof window === "undefined") {
    return mockOrders;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      cachedOrders = mockOrders;
      cachedStorageValue = null;
      return mockOrders;
    }

    if (stored === cachedStorageValue) {
      return cachedOrders;
    }

    const parsed = JSON.parse(stored) as StoredOrder[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedOrders = parsed;
      cachedStorageValue = stored;
      return parsed;
    }

    cachedOrders = mockOrders;
    cachedStorageValue = null;
    return mockOrders;
  } catch {
    return mockOrders;
  }
}

function writeStoredOrders(nextOrders: StoredOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(nextOrders);
  cachedOrders = nextOrders;
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
  return useSyncExternalStore(subscribe, readStoredOrders, () => mockOrders);
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
  const nextOrders = existingOrders.some((order) => order.id === updatedOrder.id)
    ? existingOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    : [updatedOrder, ...existingOrders];

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
    if (!item || (item.deliveredQuantity ?? 0) <= 0) return order;

    const dn = getSalesPointDeliveryProfile(order.salesPointId);
    const doNumber = createDoNumber(order);
    const label = buildLabelRecord(order, item, doNumber, dn);

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
      .map((item) => buildLabelRecord(order, item, doNumber, dn));

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

    const scopeLabels = scopeLineIds
      ? order.storedLabels.filter((l) => scopeLineIds.includes(l.lineId))
      : order.storedLabels.filter((l) => order.items.some((i) => i.id === l.lineId && (i.deliveredQuantity ?? 0) > 0));

    if (scopeLabels.length === 0) return order;

    const note = buildDeliveryNoteRecord(order, scopeLabels, doNumber, dn);
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

  return {
    id: makeOrderId(),
    campaign: draft.campaign.trim(),
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
      name: draft.picProjectName.trim(),
      email: draft.picProjectEmail.trim(),
    },
    sourceType: draft.sourceType ?? "manual",
    note: draft.note?.trim(),
    items,
    labelStatus: "none" as LabelStatus,
    storedLabels: [],
    storedDeliveryNotes: [],
  };
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
