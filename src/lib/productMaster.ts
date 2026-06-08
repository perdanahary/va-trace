import {
  getBrandSeedByAlias,
  mockProducts as legacyProducts,
  type Product as LegacyProduct,
} from "@/lib/mockData";

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

  const brandSeed = getBrandSeedByAlias(parsed.brandCode);

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
