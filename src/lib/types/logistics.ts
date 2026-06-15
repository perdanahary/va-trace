import type {
  DeliveredItemCondition,
  DeliveryConfirmationStatus,
  DeliveryNoteStatus,
  DeliveryVarianceReason,
  ShipmentBatchStatus,
} from "@/lib/types/status";

export interface StoredPackagingLabel {
  id: string;
  lineId: string;
  labelCode: string;
  qrPayload: string;
  orderId: string;
  shipmentBatchId?: string;
  doNumber: string;
  poLineNumber: string;
  productCode: string;
  productName: string;
  deliveredQty: number;
  uom: string;
  destinationCompanyName: string;
  destinationLocationName: string;
  destinationAddress: string;
  salesPointCode: string;
  projectName: string;
  createdAt: string;
}

export interface StoredDeliveryNoteRecord {
  id: string;
  shipmentBatchId?: string;
  status?: DeliveryNoteStatus;
  doNumber: string;
  barcodeValue: string;
  qrPayload: string;
  poNumber: string;
  soNumber: string;
  projectName: string;
  senderProfile: {
    name: string;
    addressLines: string[];
    phone: string;
  };
  deliverySnapshot: {
    deliveryCompanyName: string;
    deliveryLocationName: string;
    address: string;
    phone: string;
    picClient: string;
    wcode: string;
  };
  lines: Array<{
    id: string;
    poLineNumber: string;
    materialCode: string;
    description: string;
    orderedQty: number;
    deliveredQty: number;
    outstandingQty: number;
    uom: string;
  }>;
  note: string;
  createdAt: string;
  scopeLabelIds: string[];
}

export interface ShipmentItem {
  id: string;
  orderLineId: string;
  productCode: string;
  salesPointId: string;
  quantity: number;
  receivedQuantity: number;
  /** Sales Point Allocation this shipment line was selected from. */
  allocationId?: string;
  /** Vendor-claimed received quantity awaiting Admin verification. */
  claimedReceivedQuantity?: number;
  remarks?: string;
}

export interface DeliveryConfirmationItemRecord {
  shipmentItemId: string;
  claimedReceivedQuantity: number;
  verifiedReceivedQuantity?: number;
  varianceReason?: DeliveryVarianceReason;
  condition?: DeliveredItemCondition;
  remarks?: string;
}

export interface DeliveryConfirmation {
  id: string;
  shipmentBatchId: string;
  salesPointId: string;
  deliveryNoteId?: string;
  receiverName: string;
  receiverRole?: string;
  receiverPhone?: string;
  receivedAt: string;
  status: DeliveryConfirmationStatus;
  scannedDeliveryNoteUrl?: string;
  photoUrls: string[];
  itemConfirmations?: DeliveryConfirmationItemRecord[];
  remarks?: string;
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  correctionRequestedReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface CarrierSnapshot {
  carrierName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
}

export interface ShipmentBatch {
  id: string;
  orderId: string;
  batchNumber: number;
  status: ShipmentBatchStatus;
  salesPointIds: string[];
  items: ShipmentItem[];
  deliveryNoteId?: string;
  plannedDispatchDate?: string;
  dispatchedAt?: string;
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
  carrier?: CarrierSnapshot;
  remarks?: string;
  /** "LEGACY_COMPATIBILITY" marks batches synthesized from V1 delivered quantities. */
  source?: "V2" | "LEGACY_COMPATIBILITY";
  deliveryConfirmations: DeliveryConfirmation[];
}

export interface DeliveryProgress {
  allocatedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  salesPointCount: number;
  deliveredSalesPointCount: number;
  podCount: number;
  percentage: number;
}

