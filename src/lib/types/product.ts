export interface Product {
  code: string;
  name: string;
  brand: string;
  weight: string;
  status: "Active" | "Inactive";
  material?: string;
  dimensions?: string;
}

export interface BrandSeed {
  name: string;
  alias: string;
  sysname: string;
}
