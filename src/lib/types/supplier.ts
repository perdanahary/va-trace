export interface VendorPIC {
  name: string;
  phone: string;
  email: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: "PT" | "CV" | "Individual";
  phone: string;
  picName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  addressLines?: string[];
  vendorPICs: VendorPIC[];
}

