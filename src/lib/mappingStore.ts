import { useMemo, useSyncExternalStore } from "react";
import { mockSalesPoints } from "@/lib/mockData";
import type { SalesPointMapping } from "@/lib/types";

export type MappingOverride = Partial<Pick<SalesPointMapping, "pic1" | "pic2" | "remarks" | "note" | "shippingAddress">>;

const STORAGE_KEY = "va-trace-mapping-overrides";
const SCHEMA_VERSION = 1;
const MAPPING_CHANGE_EVENT = "va-trace-mapping-overrides:change";

let overrides: Record<string, MappingOverride> = initOverrides();

function initOverrides(): Record<string, MappingOverride> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && parsed.data) {
      return parsed.data as Record<string, MappingOverride>;
    }
    return {};
  } catch {
    return {};
  }
}

function getOverrides(): Record<string, MappingOverride> {
  return overrides;
}

function setOverridesAndPersist(nextOverrides: Record<string, MappingOverride>) {
  overrides = nextOverrides;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: SCHEMA_VERSION,
          data: overrides,
        })
      );
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
    window.dispatchEvent(new Event(MAPPING_CHANGE_EVENT));
  }
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStoreEvent = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      try {
        const stored = event.newValue;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && parsed.data) {
            overrides = parsed.data as Record<string, MappingOverride>;
          }
        } else {
          overrides = {};
        }
        listener();
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener(MAPPING_CHANGE_EVENT, handleStoreEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(MAPPING_CHANGE_EVENT, handleStoreEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useMappingStore() {
  const currentOverrides = useSyncExternalStore(subscribe, getOverrides, () => ({}) as Record<string, MappingOverride>);

  const mappings = useMemo<SalesPointMapping[]>(
    () =>
      mockSalesPoints.map((sp) => {
        const override = currentOverrides[sp.wcode];
        return override ? { ...sp, ...override } : sp;
      }),
    [currentOverrides],
  );

  const updateMapping = (wcode: string, data: MappingOverride) => {
    const prev = getOverrides();
    const nextOverrides = {
      ...prev,
      [wcode]: {
        ...prev[wcode],
        ...data,
        pic1: data.pic1 ? { ...(prev[wcode]?.pic1 ?? {}), ...data.pic1 } : undefined,
        pic2: data.pic2 ? { ...(prev[wcode]?.pic2 ?? {}), ...data.pic2 } : undefined,
        shippingAddress: data.shippingAddress
          ? { ...((prev[wcode]?.shippingAddress as object) ?? {}), ...data.shippingAddress }
          : undefined,
      },
    };
    setOverridesAndPersist(nextOverrides);
  };

  const resetMapping = (wcode: string) => {
    const prev = getOverrides();
    const next = { ...prev };
    delete next[wcode];
    setOverridesAndPersist(next);
  };

  return useMemo(() => ({ mappings, updateMapping, resetMapping }), [mappings]);
}
