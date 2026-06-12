/**
 * P1-05 — Production Job types (HI-01).
 * Source: docs/api-contracts/production-job-api.md.
 */

import type { AuditStamp, EntityReference, ID, ISODateString, ISODateTimeString, Quantity } from "./foundation";
import type { ProductionStatus } from "./status";

export interface ProductionJob {
  id: ID;
  jobNumber: string;
  orderRequestId: ID;
  orderItemId: ID;
  vendorId: ID;
  status: ProductionStatus;
  orderedQuantity: Quantity;
  producedQuantity: Quantity;
  qcPassedQuantity: Quantity;
  readyQuantity: Quantity;
  reservedForShipmentQuantity: Quantity;
  completedQuantity: Quantity;
  reworkQuantity: Quantity;
  rejectedQuantity: Quantity;
  startedAt?: ISODateTimeString;
  qcStartedAt?: ISODateTimeString;
  readyAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  cancelledAt?: ISODateTimeString;
  assignedUserId?: ID;
  notes?: string;
  attachmentFileAssetIds: ID[];
  exceptionIds: ID[];
  audit: AuditStamp;
  version: number;
}

export interface ProductionJobListRow {
  id: ID;
  jobNumber: string;
  orderRequest: EntityReference;
  orderItem: EntityReference;
  vendor: EntityReference;
  status: ProductionStatus;
  orderedQuantity: Quantity;
  producedQuantity: Quantity;
  qcPassedQuantity: Quantity;
  readyQuantity: Quantity;
  reservedForShipmentQuantity: Quantity;
  completedQuantity: Quantity;
  rejectedQuantity: Quantity;
  deadline?: ISODateString;
  hasBlockingException: boolean;
  updatedAt: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// DTOs (production-job-api §3)
// ---------------------------------------------------------------------------

export interface CreateProductionJobDto {
  orderRequestId: ID;
  orderItemId: ID;
  vendorId: ID;
  orderedQuantity: Quantity;
  assignedUserId?: ID;
}

export interface AcceptProductionJobDto {
  productionJobId: ID;
  expectedVersion: number;
  acceptedByUserId: ID;
}

export interface UpdateProductionProgressDto {
  productionJobId: ID;
  expectedVersion: number;
  status: ProductionStatus;
  producedQuantity: Quantity;
  qcPassedQuantity?: Quantity;
  readyQuantity?: Quantity;
  completedQuantity?: Quantity;
  reworkQuantity?: Quantity;
  rejectedQuantity?: Quantity;
  notes?: string;
  attachmentFileAssetIds?: ID[];
}

export interface MarkProductionReadyDto {
  productionJobId: ID;
  expectedVersion: number;
  readyQuantity: Quantity;
}

export interface CompleteProductionJobDto {
  productionJobId: ID;
  expectedVersion: number;
  completedQuantity: Quantity;
}

export interface CancelProductionJobDto {
  productionJobId: ID;
  expectedVersion: number;
  cancelReason: string;
}

export interface ReopenProductionJobDto {
  productionJobId: ID;
  expectedVersion: number;
  reopenReason: string;
}

export interface ReserveProductionReadyQuantityDto {
  productionJobId: ID;
  expectedVersion: number;
  shipmentBatchId: ID;
  quantity: Quantity;
}
