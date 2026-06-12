import { useEffect, useMemo, useState } from "react";
import { mockSalesPoints } from "@/lib/mockData";
import type { SalesPointMapping } from "@/lib/types";

export type MappingOverride = Partial<Pick<SalesPointMapping, "pic1" | "pic2" | "remarks" | "note" | "shippingAddress">>;

const STORAGE_KEY = "va-trace-mapping-overrides";

function readOverrides(): Record<string, MappingOverride> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function useMappingStore() {
  const [overrides, setOverrides] = useState<Record<string, MappingOverride>>(() => readOverrides());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const mappings = useMemo<SalesPointMapping[]>(
    () =>
      mockSalesPoints.map((sp) => {
        const override = overrides[sp.wcode];
        return override ? { ...sp, ...override } : sp;
      }),
    [overrides],
  );

  const updateMapping = (wcode: string, data: MappingOverride) => {
    setOverrides((prev) => ({
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
    }));
  };

  const resetMapping = (wcode: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[wcode];
      return next;
    });
  };

  return useMemo(() => ({ mappings, updateMapping, resetMapping }), [mappings]);
}
