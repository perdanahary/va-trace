import type { SalesPointPic, ShippingAddress } from "@/lib/salesPointSeed";

export interface SalesPointMapping {
  clientId: string;
  clientName: string;
  clientEntityName: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  wcode: string;
  salesPoint: string;
  pic1: SalesPointPic;
  pic2: SalesPointPic;
  remarks: string;
  note: string;
  shippingAddress: ShippingAddress;
  deliveryCompanyName?: string;
  deliveryLocationName?: string;
  address?: string;
  phone?: string;
  picClient?: string;
}

