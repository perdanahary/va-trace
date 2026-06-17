import type { ID } from "@/lib/types/v2/foundation";
import type { SalesPoint } from "@/lib/types/v2/salesPoint";
import type { HydratedOrder } from "@/lib/v2/projections";

export interface VendorDeliveryAddress {
  companyName: string;
  salesPointName: string;
  wCode: string;
  address: string;
  zone: string;
  region: string;
  phone?: string;
  picName?: string;
}

export function resolveVendorDeliveryAddress(
  hydrated: HydratedOrder,
  getSalesPoint: (id: ID) => SalesPoint | undefined,
): VendorDeliveryAddress | null {
  // 1. Post-batch: use last batch's destinationSnapshots[0]
  if (hydrated.shipmentBatches.length > 0) {
    const last = hydrated.shipmentBatches[hydrated.shipmentBatches.length - 1];
    const snap = last.destinationSnapshots?.[0];
    if (snap) {
      return {
        companyName: snap.companyName,
        salesPointName: snap.salesPointName,
        wCode: snap.wCode,
        address: snap.address,
        zone: snap.zone,
        region: snap.region,
        phone: snap.contacts?.[0]?.phone,
        picName: snap.contacts?.find((c) => c.isPrimary)?.name,
      };
    }
  }

  // 2. Pre-batch, has allocations
  if (hydrated.allocations.length > 0) {
    const salesPointId = hydrated.allocations[0].salesPoint.id;
    const sp = getSalesPoint(salesPointId);
    if (!sp) return null;
    return {
      companyName: sp.companyName,
      salesPointName: sp.name,
      wCode: sp.wCode,
      address: sp.address.fullAddress,
      zone: sp.geography.zone,
      region: sp.geography.region,
      phone: sp.contacts?.[0]?.phone,
      picName: sp.contacts?.find((c) => c.isPrimary)?.name,
    };
  }

  // 3. No batch, no allocations
  return null;
}
