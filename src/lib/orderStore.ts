import { useSyncExternalStore } from "react";
import { mockOrders, type Order, type OrderLine } from "@/lib/mockData";

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
  assignedVendorId?: string;
  dispatchRunId?: string;
  importPoNumbers?: string[];
  items: ImportedOrderLine[];
}

const STORAGE_KEY = "va-trace-orders";
const STORE_EVENT = "va-trace-orders:change";

function readStoredOrders(): StoredOrder[] {
  if (typeof window === "undefined") {
    return mockOrders;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return mockOrders;
    }

    const parsed = JSON.parse(stored) as StoredOrder[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockOrders;
  } catch {
    return mockOrders;
  }
}

function writeStoredOrders(nextOrders: StoredOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOrders));
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
