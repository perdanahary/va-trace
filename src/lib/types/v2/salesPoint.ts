/**
 * P1-04 — Sales Point master data and Sales Point Allocation types.
 * Source: docs/api-contracts/sales-point-api.md; alias/merge per HI-12.
 */

import type {
  AuditStamp,
  ID,
  ISODateTimeString,
  ProductReference,
  Quantity,
  SalesPointReference,
} from "./foundation";
import type {
  AlertSeverity,
  AllocationStatus,
  ExceptionState,
  ImportMatchConfidence,
  MasterDataStatus,
  PodStatus,
  SalesPointContactRole,
  SalesPointDataQualityState,
  SalesPointEntityType,
} from "./status";

export interface SalesPointGeography {
  zone: string;
  region: string;
  area: string;
  subArea: string;
  latitude?: number;
  longitude?: number;
}

export interface SalesPointAddress {
  line1: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  fullAddress: string;
}

export type SalesPointDataWarningCode =
  | "MISSING_PRIMARY_CONTACT"
  | "MISSING_PHONE_OR_EMAIL"
  | "MISSING_ADDRESS"
  | "MISSING_GEOGRAPHY"
  | "MISSING_DELIVERY_INSTRUCTION"
  | "RECENT_POD_EXCEPTION"
  | "DUPLICATE_CANDIDATE";

export interface SalesPointDataWarning {
  code: SalesPointDataWarningCode;
  message: string;
  severity: AlertSeverity;
}

export interface SalesPointDataQuality {
  state: SalesPointDataQualityState;
  hasCompleteAddress: boolean;
  hasPrimaryContact: boolean;
  hasValidPhoneOrEmail: boolean;
  hasDeliveryInstructions: boolean;
  recentIssueCount: number;
  warnings: SalesPointDataWarning[];
}

export interface SalesPointContact {
  id: ID;
  salesPointId: ID;
  name: string;
  role: SalesPointContactRole;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
  audit: AuditStamp;
}

export interface SalesPointOperationalSummary {
  activeAllocationCount: number;
  activeShipmentBatchCount: number;
  openPodCount: number;
  rejectedPodCount: number;
  recentExceptionCount: number;
  lastShippedAt?: ISODateTimeString;
  lastReceivedAt?: ISODateTimeString;
}

export interface SalesPointAllocationSummary {
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingQuantity: Quantity;
  remainingToReceiveQuantity: Quantity;
  deliveryProgressPercent: number;
  productCount: number;
  orderCount: number;
  fullyReceivedAllocationCount: number;
  partialAllocationCount: number;
}

export interface SalesPoint {
  id: ID;
  code: string;
  wCode: string;
  name: string;
  clientId: ID;
  clientName: string;
  status: MasterDataStatus;
  entityType?: SalesPointEntityType;
  geography: SalesPointGeography;
  address: SalesPointAddress;
  deliveryInstructions?: string;
  contacts: SalesPointContact[];
  dataQuality: SalesPointDataQuality;
  audit: AuditStamp;
  version: number;
}

/** HI-12 — alternate imported names/codes resolved to one master Sales Point. */
export interface SalesPointAlias {
  id: ID;
  salesPointId: ID;
  aliasValue: string;
  sourceSystem?: string;
  matchConfidence: ImportMatchConfidence;
  confirmedByUserId?: ID;
  confirmedAt?: ISODateTimeString;
  audit: AuditStamp;
}

/** HI-12 — duplicate merge decision preserving historical links. */
export interface SalesPointMerge {
  id: ID;
  survivorSalesPointId: ID;
  mergedSalesPointId: ID;
  reason: string;
  mergedByUserId: ID;
  mergedAt: ISODateTimeString;
  audit: AuditStamp;
}

// ---------------------------------------------------------------------------
// Sales Point Allocation (planning layer between demand and shipment)
// ---------------------------------------------------------------------------

export interface SalesPointAllocation {
  id: ID;
  orderRequestId: ID;
  orderItemId: ID;
  product: ProductReference;
  salesPoint: SalesPointReference;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingQuantity: Quantity;
  remainingToReceiveQuantity: Quantity;
  status: AllocationStatus;
  podStatus: PodStatus;
  exceptionState: ExceptionState;
  batchIds: ID[];
  latestShipmentBatchId?: ID;
  latestDeliveryNoteId?: ID;
  underAllocationReason?: string;
  correctionReason?: string;
  notes?: string;
  audit: AuditStamp;
  version: number;
}

// ---------------------------------------------------------------------------
// DTOs (sales-point-api §6)
// ---------------------------------------------------------------------------

export interface CreateSalesPointDto {
  code: string;
  wCode: string;
  name: string;
  clientId: ID;
  status?: MasterDataStatus;
  entityType?: SalesPointEntityType;
  geography: SalesPointGeography;
  address: SalesPointAddress;
  deliveryInstructions?: string;
  contacts?: CreateSalesPointContactDto[];
}

export interface UpdateSalesPointDto {
  code?: string;
  wCode?: string;
  name?: string;
  clientId?: ID;
  status?: MasterDataStatus;
  entityType?: SalesPointEntityType | null;
  geography?: Partial<SalesPointGeography>;
  address?: Partial<SalesPointAddress>;
  deliveryInstructions?: string | null;
  expectedVersion: number;
}

export interface CreateSalesPointContactDto {
  name: string;
  role: SalesPointContactRole;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateSalesPointContactDto {
  name?: string;
  role?: SalesPointContactRole;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateSalesPointAllocationDto {
  orderRequestId: ID;
  orderItemId: ID;
  salesPointId: ID;
  allocatedQuantity: Quantity;
  notes?: string;
}

export interface BulkCreateSalesPointAllocationDto {
  orderRequestId: ID;
  allocations: Array<{
    salesPointId: ID;
    orderItemId: ID;
    allocatedQuantity: Quantity;
    notes?: string;
  }>;
  underAllocationReason?: string;
}

export interface UpdateSalesPointAllocationDto {
  salesPointAllocationId: ID;
  allocatedQuantity?: Quantity;
  notes?: string | null;
  correctionReason?: string;
  expectedVersion: number;
}

export interface ConfirmSalesPointImportMatchDto {
  importRowId: ID;
  salesPointId: ID;
  matchConfidence: ImportMatchConfidence;
  confirmedByUserId: ID;
}

// ---------------------------------------------------------------------------
// View models (sales-point-api §7)
// ---------------------------------------------------------------------------

export interface SalesPointListRow {
  id: ID;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  wCode: string;
  code: string;
  name: string;
  clientName: string;
  entityType?: SalesPointEntityType;
  primaryContactName?: string;
  primaryContactPhone?: string;
  dataQualityState: SalesPointDataQualityState;
  status: MasterDataStatus;
  activeAllocationCount: number;
  openPodCount: number;
  recentExceptionCount: number;
  actionTargets: {
    detailPath: string;
    editPath?: string;
    shipmentHistoryPath?: string;
  };
}

export interface SalesPointAllocationRow {
  allocationId: ID;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  projectName: string;
  vendorName: string;
  productCode: string;
  productName: string;
  allocatedQuantity: Quantity;
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  outstandingQuantity: Quantity;
  shipmentBatchCount: number;
  deliveryNoteCount: number;
  allocationStatus: AllocationStatus;
  podStatus: PodStatus;
  exceptionState: ExceptionState;
}

export interface SalesPointShipmentHistoryRow {
  shipmentBatchId: ID;
  batchNumber: string;
  orderRequestNumber: string;
  deliveryNoteNumber?: string;
  productCodes: string[];
  shippedQuantity: Quantity;
  receivedQuantity: Quantity;
  varianceQuantity: Quantity;
  status: string;
  dispatchedAt?: ISODateTimeString;
}

export interface SalesPointDashboardSummary {
  totalSalesPoints: number;
  activeSalesPoints: number;
  inactiveSalesPoints: number;
  needsReviewSalesPoints: number;
  completeDataCount: number;
  missingContactCount: number;
  missingAddressCount: number;
  deliveryInstructionMissingCount: number;
  repeatedIssueCount: number;
  allocatedSalesPoints: number;
  dispatchedSalesPoints: number;
  fullyReceivedSalesPoints: number;
  pendingSalesPoints: number;
}
