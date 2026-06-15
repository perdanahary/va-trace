import type { DeliveryProgress, ShipmentBatch, StoredDeliveryNoteRecord, StoredPackagingLabel } from "@/lib/types/logistics";
import type { DistributionStatus, LegacyOrderRequestStatus, LegacyOrderStatus, ProductionStatus } from "@/lib/types/status";
import type { OrderReferenceLink } from "@/lib/orderMetadata";

export interface OrderItemProgress {
  id: string;
  name: string;
  quantity: number;
  status: LegacyOrderStatus;
}

export interface OrderLine extends OrderItemProgress {
  productCode: string;
  poLineNumber: string;
  deliveredQuantity?: number;
  labelGenerated: boolean;
  labelGeneratedAt?: string;
}

export type LabelStatus = "none" | "partial" | "all";

export type ComplaintStatus = "pending" | "approved" | "rejected";

export interface ComplaintLineItem {
  lineId: string;
  productCode: string;
  productName: string;
  poLineNumber: string;
  orderedQty: number;
  systemDeliveredQty: number;
  actualReceivedQty: number;
  deltaQty: number;
}

export interface ComplaintHistoryEntry {
  id: string;
  action: "created" | "approved" | "rejected" | "quantity-adjusted";
  actor: string;
  timestamp: string;
  note?: string;
}

export interface OrderComplaint {
  id: string;
  status: ComplaintStatus;
  remarks: string;
  createdAt: string;
  createdBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  items: ComplaintLineItem[];
  history: ComplaintHistoryEntry[];
}

export interface SalesPointAllocation {
  id: string;
  orderId: string;
  salesPointId: string;
  orderLineId: string;
  productCode: string;
  allocatedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
}

export interface ProductionJob {
  id: string;
  orderId: string;
  status: ProductionStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface Order {
  id: string;
  campaign?: string;
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  status: LegacyOrderRequestStatus;
  productionStatus: ProductionStatus;
  distributionStatus: DistributionStatus;
  deliveryProgress: DeliveryProgress;
  createdDate: string;
  deadline: string;
  clientPO: string;
  soNumber: string;
  supplier: string;
  salesPointId: string;
  clientId?: string;
  clientName?: string;
  clientEntityName?: string;
  items: OrderLine[];
  productionJobs: ProductionJob[];
  allocations: SalesPointAllocation[];
  shipmentBatches: ShipmentBatch[];
  complaint?: OrderComplaint;
  complaintStatus?: ComplaintStatus;
  revisionStatus?: ComplaintStatus;
  note?: string;
  labelStatus: LabelStatus;
  labelGeneratedAt?: string;
  storedLabels: StoredPackagingLabel[];
  storedDeliveryNotes: StoredDeliveryNoteRecord[];
}
