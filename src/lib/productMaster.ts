import {
  getBrandSeedByName,
  mockProducts as legacyProducts,
} from "@/lib/mockData";
import type { Product as LegacyProduct } from "@/lib/types";
import { useSyncExternalStore } from "react";

export interface ProductRecord {
  code: string;
  name: string;
  sourceName: string;
  clientGroup: string;
  productType: string;
  orientation: "" | "H" | "V";
  dimensions: string;
  material: string;
  brand: string;
  brandCode: string;
  weight: string;
  uom: string;
  status: "Active" | "Inactive";
  formatType: string;
  inkTechnology: string;
  lengthCm: string;
  widthCm: string;
  referenceUrl: string;
}

export const mockProducts: ProductRecord[] = legacyProducts.map((product: LegacyProduct) => {
  const parsed = parseRawProductName(product.name);

  const brandSeed = getBrandSeedByName(parsed.brandCode);

  return {
    code: product.code,
    name: parsed.displayName,
    sourceName: product.name,
    clientGroup: parsed.clientGroup,
    productType: parsed.productType,
    orientation: parsed.orientation,
    dimensions: product.dimensions || parsed.dimensions,
    material: product.material || parsed.material,
    brand: brandSeed?.name || product.brand || "-",
    brandCode: brandSeed?.alias || parsed.brandCode,
    weight: product.weight,
    uom: "qty",
    status: product.status,
    formatType: "-",
    inkTechnology: "-",
    lengthCm: deriveLength(parsed.dimensions),
    widthCm: deriveWidth(parsed.dimensions),
    referenceUrl: "",
  };
});

export interface ProvisionalProductInput {
  code: string;
  itemName: string;
  category?: string;
  brand?: string;
  brandSku?: string;
  brandNamePo?: string;
  length?: string;
  width?: string;
}

const PROVISIONAL_PRODUCTS_STORAGE_KEY = "va-trace-provisional-products";
const PROVISIONAL_PRODUCTS_EVENT = "va-trace-provisional-products:change";

let cachedProvisionalProducts: ProductRecord[] | null = null;
let cachedProvisionalSerialized: string | null = null;
let cachedProductCatalog: ProductRecord[] = mockProducts;
let cachedProductCatalogSerialized: string | null = null;

function normalizeKey(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function readProvisionalProducts(): ProductRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(PROVISIONAL_PRODUCTS_STORAGE_KEY);

    if (!stored) {
      cachedProvisionalProducts = [];
      cachedProvisionalSerialized = null;
      return cachedProvisionalProducts;
    }

    if (stored === cachedProvisionalSerialized && cachedProvisionalProducts) {
      return cachedProvisionalProducts;
    }

    const parsed = JSON.parse(stored) as ProductRecord[];
    cachedProvisionalProducts = Array.isArray(parsed) ? parsed : [];
    cachedProvisionalSerialized = stored;
    return cachedProvisionalProducts;
  } catch {
    return cachedProvisionalProducts ?? [];
  }
}

function writeProvisionalProducts(products: ProductRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(products);
  cachedProvisionalProducts = products;
  cachedProvisionalSerialized = serialized;
  window.localStorage.setItem(PROVISIONAL_PRODUCTS_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(PROVISIONAL_PRODUCTS_EVENT));
}

function subscribeToProvisionalProducts(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROVISIONAL_PRODUCTS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(PROVISIONAL_PRODUCTS_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PROVISIONAL_PRODUCTS_EVENT, listener);
  };
}

function buildDimensions(input: ProvisionalProductInput) {
  const length = input.length?.trim();
  const width = input.width?.trim();

  if (length && width) {
    return `${length} x ${width} m`;
  }

  return "-";
}

function buildProvisionalProduct(input: ProvisionalProductInput): ProductRecord {
  const brand = input.brandNamePo?.trim() || input.brand?.trim() || "-";
  const brandSeed = getBrandSeedByName(brand);
  const dimensions = buildDimensions(input);

  return {
    code: input.code.trim(),
    name: input.itemName.trim() || input.code.trim(),
    sourceName: input.itemName.trim() || input.code.trim(),
    clientGroup: "Imported",
    productType: input.category?.trim() || "Imported POSM",
    orientation: "",
    dimensions,
    material: "-",
    brand: brandSeed?.name || brand,
    brandCode: input.brandSku?.trim() || brandSeed?.alias || brand,
    weight: "-",
    uom: "qty",
    status: "Active",
    formatType: "Imported from PO",
    inkTechnology: "-",
    lengthCm: input.length?.trim() || "-",
    widthCm: input.width?.trim() || "-",
    referenceUrl: "",
  };
}

export function getProvisionalProducts() {
  return readProvisionalProducts();
}

export function getProductCatalog() {
  const provisionalProducts = readProvisionalProducts();
  const provisionalCodes = new Set(provisionalProducts.map((product) => normalizeKey(product.code)));
  const catalog = [
    ...provisionalProducts,
    ...mockProducts.filter((product) => !provisionalCodes.has(normalizeKey(product.code))),
  ];
  const serialized = JSON.stringify(catalog);

  if (serialized === cachedProductCatalogSerialized && cachedProductCatalog) {
    return cachedProductCatalog;
  }

  cachedProductCatalog = catalog;
  cachedProductCatalogSerialized = serialized;
  return cachedProductCatalog;
}

export function useProductCatalog() {
  return useSyncExternalStore(subscribeToProvisionalProducts, getProductCatalog, () => mockProducts);
}

export function findProductForImport(itemCode: string, itemName: string) {
  const normalizedCode = normalizeKey(itemCode);
  const normalizedName = normalizeKey(itemName);
  const products = getProductCatalog();

  return (
    products.find((entry) => normalizeKey(entry.code) === normalizedCode) ??
    products.find((entry) => normalizeKey(entry.sourceName) === normalizedName || normalizeKey(entry.name) === normalizedName)
  );
}

export function upsertProvisionalProductsFromImportRows(inputs: ProvisionalProductInput[]) {
  const existingCatalogCodes = new Set(mockProducts.map((product) => normalizeKey(product.code)));
  const currentProvisionalProducts = readProvisionalProducts();
  const currentProvisionalByCode = new Map(currentProvisionalProducts.map((product) => [normalizeKey(product.code), product]));

  for (const input of inputs) {
    const code = input.code.trim();
    const itemName = input.itemName.trim();
    const normalizedCode = normalizeKey(code);

    if (!code || !itemName || existingCatalogCodes.has(normalizedCode)) {
      continue;
    }

    currentProvisionalByCode.set(normalizedCode, {
      ...currentProvisionalByCode.get(normalizedCode),
      ...buildProvisionalProduct(input),
    });
  }

  const nextProducts = Array.from(currentProvisionalByCode.values()).sort((left, right) => left.code.localeCompare(right.code));
  writeProvisionalProducts(nextProducts);
  return nextProducts;
}

export function clearProvisionalProducts() {
  writeProvisionalProducts([]);
}

function parseRawProductName(rawName: string) {
  const parts = rawName.split(" - ").map((part) => part.trim());
  const [clientGroup = "", productTypeRaw = "", dimensions = "", material = "", brandPart = ""] = parts;
  const productTypeMatch = productTypeRaw.match(/^(.*)\s+\(([HV])\)$/i);
  const productType = productTypeMatch ? productTypeMatch[1].trim() : productTypeRaw;
  const orientation = productTypeMatch ? (productTypeMatch[2].toUpperCase() as "" | "H" | "V") : "";
  const brandCode = brandPart.replace(/K$/i, "").trim();

  return {
    clientGroup,
    productType,
    orientation,
    dimensions,
    material,
    brandCode,
    displayName: [clientGroup, productTypeRaw, dimensions, material, brandCode].filter(Boolean).join(" - "),
  };
}

function deriveLength(dimensions: string) {
  const match = dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*(cm|m)/i);
  if (!match) {
    return "-";
  }

  return match[1];
}

function deriveWidth(dimensions: string) {
  const match = dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*(cm|m)/i);
  if (!match) {
    return "-";
  }

  return match[2];
}
