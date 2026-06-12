import type { BrandSeed } from "@/lib/types/product";

export const mockBrands: BrandSeed[] = [
  { alias: "A-Mild 16", name: "MLA16 35", sysname: "mla16-35" },
  { alias: "Avolution 20", name: "AVO20", sysname: "avo20" },
  { alias: "Dji Sam Soe", name: "DPP12 20", sysname: "dpp12-20" },
  { alias: "DSS Magnum Filter 12 Edisi Bintang", name: "DSE12 25", sysname: "dse12-25" },
  { alias: "Dji Sam Soe Snap Box 12", name: "DSB12", sysname: "dsb12" },
  { alias: "Sampoerna Prima", name: "SPS12 15", sysname: "sps12-15" },
  { alias: "Sampoerna Prima", name: "SAI12 16", sysname: "sai12-16" },
];

export const getBrandSeedByAlias = (alias: string) =>
  mockBrands.find((brand) => brand.alias.toLowerCase() === alias.toLowerCase());

export const getBrandSeedByName = (brandName: string) =>
  mockBrands.find((brand) => brand.name.toLowerCase() === brandName.toLowerCase());

