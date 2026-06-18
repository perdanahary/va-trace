/**
 * P1-06 — Shipment Batch, reservation, package, and label types.
 * Source: docs/api-contracts/shipment-batch-api.md, shared-foundation §9 (CR-03),
 * HI-13 (reservations), MED-02 (snapshot versions).
 */

import type { AuditStamp, EntityReference, ID, ISODateString, ISODateTimeString, ProjectReference, Quantity } from "./foundation";
import type {
  AlertSeverity,
  DeliveryNoteStatus,
  PodStatus,
  PrintEventStatus,
  SalesPointContactRole,
  ShipmentBatchItemStatus,
  ShipmentBatchStatus,
  ShippingLabelStatus,
  ShippingLabelType,
  ShippingLabelVoidReason,
  ShippingPackageStatus,
  UnitOfMeasure,
} from "./status";

export interface ShipmentPartySnapshot {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  contactName?: string;
}

export interface SalesPointContactSnapshot {
  contactId?: ID;
  name: string;
  role: SalesPointContactRole;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface ShipmentDestinationSnapshot {
  salesPointId: ID;
  salesPointCode: string;
  wCode: string;
  salesPointName: string;
  clientId: ID;
  clientName: string;
  companyName: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  address: string;
  deliveryInstructions?: string;
  contacts: SalesPointContactSnapshot[];
  /** MED-02 — version of the master record captured at snapshot time. */
  snapshotVersion: number;
  capturedAt: ISODateTimeString;
}

export interface ProductSnapshot {
  productId: ID;
  sku: string;
  materialCode: string;
  name: string;
  description?: string;
  specification?: string;
  unitOfMeasure: UnitOfMeasure;
}

export interface SalesPointSnapshot {
  salesPointId: ID;
  code: string;
  wCode: string;
  name: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
}

export interface CarrierSnapshot {
  carrierName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
}

export interface ShipmentBatchQuantitySummary {
  allocatedContextQuantity: Quantity;
  shippedQuantity: Quantity;
  claimedReceivedQuantity: Quantity;
  verifiedReceivedQuantity: Quantity;
  varianceQuantity: Quantity;
  receiptProgressPercent: number;
  salesPointCount: number;
  itemCount: number;
  partialShipmentLineCount: number;
  partialDeliveryLineCount: number;
}

export interface ShipmentBatchExceptionSummary {
  hasException: boolean;
  exceptionCount: number;
  highestSeverity?: AlertSeverity;
  unresolvedReasons: string[];
}

export interface ShipmentBatchItem {
  id: ID;
  shipmentBatchId: ID;
  orderRequestId: ID;
  orderItemId: ID;
  salesPointAllocationId: ID;
  product: ProductSnapshot;
  salesPoint: SalesPointSnapshot;
  allocatedQuantity: Quantity;
  previouslyShippedQuantity: Quantity;
  outstandingBeforeBatchQuantity: Quantity;
  shippedQuantity: Quantity;
  verifiedReceivedQuantity: Quantity;
  claimedReceivedQuantity?: Quantity;
  outstandingAfterBatchQuantity: Quantity;
  varianceQuantity: Quantity;
  status: ShipmentBatchItemStatus;
  podStatus: PodStatus;
  packageCount?: number;
  labelIds: ID[];
  remarks?: string;
}

export interface ShipmentBatch {
  id: ID;
  batchNumber: string;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  client: EntityReference;
  project: ProjectReference;
  vendor: EntityReference;
  status: ShipmentBatchStatus;
  deliveryNoteId?: ID;
  deliveryNoteNumber?: string;
  deliveryNoteStatus?: DeliveryNoteStatus;
  labelStatus: ShippingLabelStatus;
  podStatus: PodStatus;
  plannedDispatchDate?: ISODateString;
  dispatchedAt?: ISODateTimeString;
  inTransitAt?: ISODateTimeString;
  receivedAt?: ISODateTimeString;
  closedAt?: ISODateTimeString;
  closedByUserId?: ID;
  closureReason?: string;
  cancellationReason?: string;
  failureReason?: string;
  senderSnapshot: ShipmentPartySnapshot;
  destinationSnapshots: ShipmentDestinationSnapshot[];
  items: ShipmentBatchItem[];
  quantitySummary: ShipmentBatchQuantitySummary;
  exceptionSummary: ShipmentBatchExceptionSummary;
  carrier?: CarrierSnapshot;
  /** CR-09 — marks batches synthesized from V1 delivered quantities. */
  compatibilitySource?: "LEGACY_MIGRATION";
  /** CR-09 — legacy received quantities are migration-trusted, not POD-verified. */
  legacyVerificationFlag?: boolean;
  audit: AuditStamp;
  version: number;
}

/** HI-13 — transactional reservation of ready quantity for a draft batch. */
export interface ShipmentReservation {
  id: ID;
  shipmentBatchId: ID;
  productionJobId: ID;
  orderItemId: ID;
  salesPointAllocationId: ID;
  quantity: Quantity;
  status: "ACTIVE" | "CONSUMED" | "RELEASED";
  createdAt: ISODateTimeString;
  releasedAt?: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// Packages and labels (CR-03; shared-foundation §9)
// ---------------------------------------------------------------------------

export interface PackageItemQuantity {
  shipmentBatchItemId: ID;
  orderItemId: ID;
  productId: ID;
  quantity: Quantity;
}

export interface ShippingPackage {
  id: ID;
  shipmentBatchId: ID;
  packageNumber: string;
  salesPointId: ID;
  shipmentBatchItemIds: ID[];
  quantityByItem: PackageItemQuantity[];
  labelIds: ID[];
  status: ShippingPackageStatus;
  snapshotVersion: number;
  audit: AuditStamp;
  version: number;
}

export interface ShippingLabelQrPayload {
  labelNumber: string;
  shipmentBatchId: ID;
  shippingPackageId: ID;
  salesPointId: ID;
  checksum: string;
}

export interface ShippingLabel {
  id: ID;
  labelNumber: string;
  shipmentBatchId: ID;
  shippingPackageId: ID;
  salesPointId: ID;
  deliveryNoteId?: ID;
  type: ShippingLabelType;
  status: ShippingLabelStatus;
  qrPayload: ShippingLabelQrPayload;
  fileAssetId?: ID;
  printCount: number;
  lastPrintedAt?: ISODateTimeString;
  voidedAt?: ISODateTimeString;
  voidReason?: ShippingLabelVoidReason;
  supersedesLabelId?: ID;
  /** Display context for the label register and print view. */
  productCode: string;
  productName: string;
  quantity: Quantity;
  unitOfMeasure: UnitOfMeasure;
  destinationName: string;
  destinationAddress: string;
  projectName: string;
  audit: AuditStamp;
  version: number;
}

export interface ShippingLabelPrintEvent {
  id: ID;
  shippingLabelId: ID;
  printedAt: ISODateTimeString;
  printedBy: ID;
  printStatus: PrintEventStatus;
  printerName?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// DTOs (shipment-batch-api §6; shared-foundation §9)
// ---------------------------------------------------------------------------

export interface CreateShipmentBatchDto {
  orderRequestId: ID;
  plannedDispatchDate?: ISODateString;
  carrier?: CarrierSnapshot;
  items: CreateShipmentBatchItemDto[];
  generateDeliveryNote?: boolean;
  generateLabels?: boolean;
  remarks?: string;
}

export interface CreateShipmentBatchItemDto {
  salesPointAllocationId: ID;
  orderItemId: ID;
  shippedQuantity: Quantity;
  packageCount?: number;
  remarks?: string;
}

export interface UpdateShipmentBatchDto {
  shipmentBatchId: ID;
  plannedDispatchDate?: ISODateString | null;
  carrier?: CarrierSnapshot | null;
  items?: UpdateShipmentBatchItemDto[];
  remarks?: string | null;
  expectedVersion: number;
}

export interface UpdateShipmentBatchItemDto {
  id: ID;
  shippedQuantity?: Quantity;
  packageCount?: number | null;
  remarks?: string | null;
}

export interface MarkShipmentBatchReadyDto {
  shipmentBatchId: ID;
  generateDeliveryNote: boolean;
  generateLabels: boolean;
  expectedVersion: number;
}

export interface DispatchShipmentBatchDto {
  shipmentBatchId: ID;
  dispatchedAt: ISODateTimeString;
  carrier?: CarrierSnapshot;
  expectedVersion: number;
}

export interface RecordFailedDeliveryDto {
  shipmentBatchId: ID;
  reason: string;
  expectedVersion: number;
}

export interface RecordReturnDto {
  shipmentBatchId: ID;
  reason: string;
  returnedQuantities: Array<{ shipmentBatchItemId: ID; quantity: Quantity }>;
  expectedVersion: number;
}

export interface CancelShipmentBatchDto {
  shipmentBatchId: ID;
  reason: string;
  expectedVersion: number;
}

export interface VoidShipmentBatchDto {
  shipmentBatchId: ID;
  reason: string;
  expectedVersion: number;
}

export interface CloseShipmentBatchDto {
  shipmentBatchId: ID;
  closedAt: ISODateTimeString;
  closureReason?: string;
  expectedVersion: number;
}

export interface ReopenShipmentBatchDto {
  shipmentBatchId: ID;
  reason: string;
  expectedVersion: number;
}

export interface GenerateShippingLabelsDto {
  shipmentBatchId: ID;
}

export interface RecordShippingLabelPrintDto {
  shippingLabelIds: ID[];
  printerName?: string;
}

export interface VoidShippingLabelDto {
  shippingLabelId: ID;
  expectedVersion: number;
  reason: ShippingLabelVoidReason;
}

// ---------------------------------------------------------------------------
// View models (shipment-batch-api §7–§8)
// ---------------------------------------------------------------------------

export interface ShipmentBatchListRow {
  id: ID;
  batchNumber: string;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  vendorName: string;
  clientName: string;
  projectName: string;
  salesPointCount: number;
  itemCount: number;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  varianceQuantity: Quantity;
  plannedDispatchDate?: ISODateString;
  dispatchedAt?: ISODateTimeString;
  status: ShipmentBatchStatus;
  deliveryNoteStatus?: DeliveryNoteStatus;
  podStatus: PodStatus;
  hasPartialShipment: boolean;
  hasPartialDelivery: boolean;
  hasException: boolean;
  actionTargets: {
    detailPath: string;
    deliveryNotePrintPath?: string;
    labelsPrintPath?: string;
    podPath?: string;
  };
}

export interface ShipmentBatchItemTableRow {
  id: ID;
  salesPointCode: string;
  salesPointName: string;
  productCode: string;
  productName: string;
  allocatedQuantity: Quantity;
  previouslyShippedQuantity: Quantity;
  shippedQuantity: Quantity;
  verifiedReceivedQuantity: Quantity;
  varianceQuantity: Quantity;
  podStatus: PodStatus;
  remarks?: string;
}

export interface ShipmentBatchDashboardSummary {
  totalBatches: number;
  draftBatches: number;
  readyBatches: number;
  dispatchedBatches: number;
  inTransitBatches: number;
  partiallyReceivedBatches: number;
  fullyReceivedBatches: number;
  closedBatches: number;
  totalShippedQuantity: Quantity;
  totalReceivedQuantity: Quantity;
  totalVarianceQuantity: Quantity;
  partialShipmentBatchCount: number;
  partialDeliveryBatchCount: number;
  missingPodBatchCount: number;
  exceptionBatchCount: number;
  averageReceiptProgressPercent: number;
}
