import { useSyncExternalStore } from "react";

import { resetImportBatchStorageForDemo } from "@/lib/importStore";

export type DemoSessionMode = "snapshot" | "fresh";

const DEMO_SESSION_KEY = "va-trace-demo-session-mode";
const DEMO_SESSION_EVENT = "va-trace-demo-session:change";

const LEGACY_MASTER_KEYS = [
  "va-trace-users",
  "va-trace-clients",
  "va-trace-suppliers",
] as const;

const LEGACY_TRANSACTION_KEYS = [
  "va-trace-orders",
  "va-trace-projects",
] as const;

const V2_MASTER_KEYS = [
  "va-trace-v2-salespoints",
  "va-trace-v2-policies",
] as const;

const V2_COLLECTION_TRANSACTION_KEYS = [
  "va-trace-v2-orders",
  "va-trace-v2-allocations",
  "va-trace-v2-production",
  "va-trace-v2-shipments",
  "va-trace-v2-shipment-reservations",
  "va-trace-v2-dns",
  "va-trace-v2-pod",
  "va-trace-v2-pod-verification-events",
  "va-trace-v2-exceptions",
  "va-trace-v2-files",
  "va-trace-v2-idempotency",
] as const;

const PROVISIONAL_PRODUCT_KEY = "va-trace-provisional-products";
const V2_EVENT_KEY = "va-trace-v2-events";
const V2_LABEL_KEY = "va-trace-v2-labels";
const CURRENT_USER_KEY = "va-trace-current-user";
const SEEDED_ADMIN_USER_ID = "3";

function readDemoSessionMode(): DemoSessionMode {
  if (typeof window === "undefined") {
    return "snapshot";
  }

  return window.localStorage.getItem(DEMO_SESSION_KEY) === "fresh" ? "fresh" : "snapshot";
}

function emitDemoSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}

function writeMode(mode: DemoSessionMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEMO_SESSION_KEY, mode);
  emitDemoSessionChange();
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === DEMO_SESSION_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(DEMO_SESSION_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DEMO_SESSION_EVENT, listener);
  };
}

export function useDemoSessionMode() {
  return useSyncExternalStore(subscribe, readDemoSessionMode, () => "snapshot" as DemoSessionMode);
}

function removeKeys(keys: readonly string[]) {
  keys.forEach((key) => window.localStorage.removeItem(key));
}

function writeEmptyCollectionKeys(keys: readonly string[]) {
  keys.forEach((key) => window.localStorage.setItem(key, "[]"));
}

function resetCommonLocalState() {
  window.localStorage.setItem("va-trace-v2-enabled", "true");
  window.localStorage.setItem(PROVISIONAL_PRODUCT_KEY, "[]");
  window.localStorage.setItem(V2_EVENT_KEY, JSON.stringify({ auditEvents: [], domainEvents: [] }));
  window.localStorage.setItem(V2_LABEL_KEY, JSON.stringify({ id: "label-state", packages: [], labels: [], printEvents: [] }));
}

export async function applyDemoSessionMode(mode: DemoSessionMode) {
  if (typeof window === "undefined") {
    return;
  }

  writeMode(mode);
  window.localStorage.setItem(CURRENT_USER_KEY, SEEDED_ADMIN_USER_ID);

  if (mode === "snapshot") {
    removeKeys([
      ...LEGACY_MASTER_KEYS,
      ...LEGACY_TRANSACTION_KEYS,
      ...V2_MASTER_KEYS,
      ...V2_COLLECTION_TRANSACTION_KEYS,
      PROVISIONAL_PRODUCT_KEY,
      V2_EVENT_KEY,
      V2_LABEL_KEY,
    ]);
    await resetImportBatchStorageForDemo({ seedInitialOnNextLoad: true });
    return;
  }

  removeKeys([...LEGACY_MASTER_KEYS, ...V2_MASTER_KEYS]);
  writeEmptyCollectionKeys([...LEGACY_TRANSACTION_KEYS, ...V2_COLLECTION_TRANSACTION_KEYS]);
  resetCommonLocalState();
  await resetImportBatchStorageForDemo({ seedInitialOnNextLoad: false });
}
