/**
 * P1-03 — Order Request and Order Item types.
 * Source: docs/api-contracts/order-request-api.md.
 *
 * Projection-only fields (order-request-api §11) must never be mutated by UI
 * or commands directly: productionStatus, distributionStatus, quantitySummary,
 * documentSummary, exceptionSummary, and all OrderItem derived quantities.
 */

import type {
  AuditStamp,
  ClientReference,
  ID,
  ISODateString,
  ISODateTimeString,
  ProductReference,
  ProjectReference,
  Quantity,
  UserRole,
  VendorReference,
} from "./foundation";
import type {
  AllocationStatus,
  AlertSeverity,
  DeadlineState,
  DeliveryNoteStatus,
  DistributionStatus,
  ExceptionState,
  OrderPriority,
  OrderSource,
  PodStatus,
  ProductionStatus,
  ShipmentBatchStatus,
  UnitOfMeasure,
} from "./status";
import type { SalesPointAllocation } from "./salesPoint";
import type { OrderReferenceLink } from "@/lib/orderMetadata";

export interface RequesterSnapshot {
  userId: ID;
  name: string;
  email: string;
  role: UserRole;
  organizationName?: string;
}

export type ExternalReferenceType =
  | "CLIENT_PO"
  | "SALES_ORDER"
  | "COUPA_REQUISITION"
  | "SAP_ORDER"
  | "IMPORT_BATCH"
  | "PIC_CODE";

export interface ExternalReference {
  type: ExternalReferenceType;
  value: string;
  sourceSystem?: "SAP" | "COUPA" | "CLIENT_PORTAL" | "MANUAL";
}

export interface OrderItem {
  id: ID;
  orderRequestId: ID;
  lineNumber: number;
  product: ProductReference;
  description: string;
  specification?: string;
  brandName?: string;
  orderedQuantity: Quantity;
  unitOfMeasure: UnitOfMeasure;
  productionStatus: ProductionStatus;
  productionReadyQuantity: Quantity;
  productionCompletedQuantity: Quantity;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  remainingToAllocateQuantity: Quantity;
  notes?: string;
}

export interface OrderQuantitySummary {
  orderedQuantity: Quantity;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingToShipQuantity: Quantity;
  outstandingToReceiveQuantity: Quantity;
  productionReadyQuantity: Quantity;
  productionCompletionPercent: number;
  deliveryProgressPercent: number;
  salesPointCount: number;
  salesPointsFullyReceived: number;
  openPodIssueCount: number;
}

export interface OrderDocumentSummary {
  shipmentBatchCount: number;
  deliveryNoteCount: number;
  printedDeliveryNoteCount: number;
  uploadedPodCount: number;
  verifiedPodCount: number;
  missingPodCount: number;
  shippingLabelCount: number;
  printedShippingLabelCount: number;
}

export interface OrderExceptionSummary {
  hasException: boolean;
  exceptionCount: number;
  highestSeverity?: AlertSeverity;
  latestExceptionReason?: string;
}

export interface OrderRequest {
  id: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  client: ClientReference;
  project: ProjectReference;
  vendor: VendorReference;
  requester: RequesterSnapshot;
  source: OrderSource;
  priority: OrderPriority;
  productionStatus: ProductionStatus;
  distributionStatus: DistributionStatus;
  /** Compatibility display only — must never drive V2 calculations. */
  legacyStatusLabel?: string;
  deadlineDate: ISODateString;
  requestedDeliveryDate?: ISODateString;
  submittedAt?: ISODateTimeString;
  acceptedAt?: ISODateTimeString;
  cancelledAt?: ISODateTimeString;
  cancellationReason?: string;
  underAllocationReason?: string;
  remarks?: string;
  externalReferences: ExternalReference[];
  items: OrderItem[];
  allocationIds: ID[];
  quantitySummary: OrderQuantitySummary;
  documentSummary: OrderDocumentSummary;
  exceptionSummary: OrderExceptionSummary;
  audit: AuditStamp;
  version: number;
}

/** Detail aggregate joining the owning stores' records for one order. */
export interface OrderRequestDetail {
  order: OrderRequest;
  allocations: SalesPointAllocation[];
}

// ---------------------------------------------------------------------------
// DTOs (order-request-api §6)
// ---------------------------------------------------------------------------

export interface CreateOrderRequestDto {
  clientId: ID;
  projectId: ID;
  vendorId: ID;
  clientPoNumber?: string;
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  deadlineDate: ISODateString;
  requestedDeliveryDate?: ISODateString;
  priority?: OrderPriority;
  source: OrderSource;
  remarks?: string;
  externalReferences?: ExternalReference[];
  items: CreateOrderItemDto[];
  allocations?: CreateOrderAllocationDto[];
  underAllocationReason?: string;
}

export interface CreateOrderItemDto {
  productId: ID;
  lineNumber: number;
  description?: string;
  specification?: string;
  orderedQuantity: Quantity;
  unitOfMeasure: UnitOfMeasure;
  notes?: string;
}

export interface CreateOrderAllocationDto {
  orderItemClientLineNumber: number;
  salesPointId: ID;
  allocatedQuantity: Quantity;
  notes?: string;
}

export interface UpdateOrderRequestDto {
  clientPoNumber?: string | null;
  projectId?: ID;
  vendorId?: ID;
  deadlineDate?: ISODateString;
  requestedDeliveryDate?: ISODateString | null;
  priority?: OrderPriority;
  tags?: string[] | null;
  referenceLink?: OrderReferenceLink | null;
  remarks?: string | null;
  underAllocationReason?: string | null;
  items?: UpdateOrderItemDto[];
  expectedVersion: number;
}

export interface UpdateOrderItemDto {
  id: ID;
  description?: string;
  specification?: string | null;
  orderedQuantity?: Quantity;
  unitOfMeasure?: UnitOfMeasure;
  notes?: string | null;
}

export interface SubmitOrderRequestDto {
  orderRequestId: ID;
  expectedVersion: number;
}

export interface CancelOrderRequestDto {
  orderRequestId: ID;
  reason: string;
  expectedVersion: number;
}

export interface AcceptOrderRequestDto {
  orderRequestId: ID;
  vendorId: ID;
  acceptedAt: ISODateTimeString;
}

export interface AmendOrderRequestDto {
  orderRequestId: ID;
  expectedVersion: number;
  metadataChanges?: Partial<Omit<UpdateOrderRequestDto, "expectedVersion">>;
  itemChanges?: UpdateOrderItemDto[];
  amendmentReason: string;
}

// ---------------------------------------------------------------------------
// View models (order-request-api §7–§8)
// ---------------------------------------------------------------------------

export interface OrderListRow {
  id: ID;
  clientPoNumber: string | null;
  orderRequestNumber: string;
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  clientName: string;
  projectName: string;
  vendorName: string;
  createdAt: ISODateTimeString;
  deadlineDate: ISODateString;
  deadlineState: DeadlineState;
  productionStatus: ProductionStatus;
  distributionStatus: DistributionStatus;
  deliveryProgressLabel: string;
  deliveryProgressPercent: number;
  orderedQuantity: Quantity;
  allocatedQuantity: Quantity;
  productionReadyQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  salesPointCount: number;
  openPodIssueCount: number;
  hasException: boolean;
  legacyStatusLabel?: string;
  actionTargets: {
    detailPath: string;
    createShipmentBatchPath?: string;
    deliveryNotesPath?: string;
    podPath?: string;
  };
}

export interface OrderAllocationTableRow {
  allocationId: ID;
  salesPointCode: string;
  salesPointName: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  productCode: string;
  productName: string;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingQuantity: Quantity;
  shipmentBatchCount: number;
  podStatus: PodStatus;
  allocationStatus: AllocationStatus;
  exceptionState: ExceptionState;
  canAddToBatch: boolean;
}

export interface AllocationProgressRow {
  allocationId: ID;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  vendorName: string;
  createdAt: ISODateTimeString;
  deadlineDate: ISODateString;
  deadlineState: DeadlineState;
  salesPointName: string;
  salesPointCode: string;
  productName: string;
  productCode: string;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingQuantity: Quantity;
  deliveryProgressLabel: string;
  deliveryProgressPercent: number;
  allocationStatus: AllocationStatus;
  podStatus: PodStatus;
  exceptionState: ExceptionState;
  hasException: boolean;
  actionTargets: {
    orderDetailPath: string;
  };
}

export interface ShipmentBatchSummaryRef {
  id: ID;
  batchNumber: string;
  status: ShipmentBatchStatus;
  salesPointCount: number;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
}

export interface DeliveryNoteSummaryRef {
  id: ID;
  deliveryNoteNumber: string;
  shipmentBatchId: ID;
  status: DeliveryNoteStatus;
  shippedQuantity: Quantity;
}

export interface OrderDashboardSummary {
  totalOrders: number;
  draftOrders: number;
  submittedOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  overdueOrders: number;
  exceptionOrders: number;
  totalOrderedQuantity: Quantity;
  totalAllocatedQuantity: Quantity;
  totalShippedQuantity: Quantity;
  totalReceivedQuantity: Quantity;
  deliveryProgressPercent: number;
}

export interface ProductionDashboardSummary {
  byStatus: Record<ProductionStatus, number>;
  ordersInProduction: number;
  ordersInQualityControl: number;
  readyForDistributionOrders: number;
  readyForDistributionQuantity: Quantity;
  completedProductionQuantity: Quantity;
  productionCompletionRate: number;
}

export interface DistributionDashboardSummary {
  byStatus: Record<DistributionStatus, number>;
  allocatedSalesPoints: number;
  dispatchedSalesPoints: number;
  fullyReceivedSalesPoints: number;
  pendingSalesPoints: number;
  partiallyShippedAllocations: number;
  partiallyReceivedAllocations: number;
  openPodIssues: number;
  exceptionCount: number;
  totalShipmentBatches: number;
  totalDeliveryNotes: number;
  deliverySuccessRate: number;
}
