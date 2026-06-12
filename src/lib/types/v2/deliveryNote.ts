/**
 * P1-07 — Delivery Note and POD (Delivery Confirmation) types.
 * Source: docs/api-contracts/delivery-note-api.md, shared-foundation §10,
 * HI-07 (DN versioning), CR-06 (attempt history + idempotent verification).
 */

import type { AuditStamp, ID, ISODateString, ISODateTimeString, Quantity } from "./foundation";
import type {
  DeliveredItemCondition,
  DeliveryConfirmationReviewDecision,
  DeliveryConfirmationStatus,
  DeliveryNoteFileType,
  DeliveryNoteStatus,
  DeliveryVarianceReason,
  PodEvidenceType,
  PodStatus,
  SalesPointContactRole,
  UnitOfMeasure,
} from "./status";

export interface PartySnapshot {
  id?: ID;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
}

export interface DeliveryDestinationSnapshot {
  salesPointId: ID;
  salesPointCode: string;
  wCode: string;
  salesPointName: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
  address: string;
  deliveryInstructions?: string;
  contacts: Array<{
    name: string;
    role: SalesPointContactRole;
    phone?: string;
    email?: string;
    isPrimary: boolean;
  }>;
  /** MED-02 — master record version captured at generation time. */
  snapshotVersion: number;
}

export interface DeliveryNoteSignatureFields {
  senderPreparedBy?: string;
  senderApprovedBy?: string;
  receiverName?: string;
  receiverSignatureRequired: boolean;
  receiverStampRequired: boolean;
  receivedDateRequired: boolean;
  notes?: string;
}

export interface DeliveryNoteQrPayload {
  deliveryNoteId: ID;
  deliveryNoteNumber: string;
  shipmentBatchId: ID;
  batchNumber: string;
  orderRequestId: ID;
  generatedAt: ISODateTimeString;
  checksum: string;
}

export interface DeliveryNoteFile {
  id: ID;
  type: DeliveryNoteFileType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedAt: ISODateTimeString;
  uploadedByUserId: ID;
}

export interface DeliveryNoteQuantitySummary {
  salesPointCount: number;
  itemCount: number;
  orderedContextQuantity: Quantity;
  allocatedContextQuantity: Quantity;
  shippedQuantity: Quantity;
  outstandingQuantityAfterShipment: Quantity;
}

export interface DeliveryNoteItem {
  id: ID;
  deliveryNoteId: ID;
  shipmentBatchItemId: ID;
  orderItemId: ID;
  salesPointAllocationId: ID;
  poLineNumber: number;
  salesPointId: ID;
  salesPointCode: string;
  salesPointName: string;
  materialCode: string;
  sku: string;
  description: string;
  specification?: string;
  orderedQuantity: Quantity;
  allocatedQuantity: Quantity;
  previouslyShippedQuantity: Quantity;
  shippedQuantity: Quantity;
  outstandingQuantityAfterShipment: Quantity;
  unitOfMeasure: UnitOfMeasure;
  remarks?: string;
}

export interface DeliveryNote {
  id: ID;
  deliveryNoteNumber: string;
  shipmentBatchId: ID;
  batchNumber: string;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  salesOrderNumber?: string;
  projectName: string;
  client: PartySnapshot;
  vendor: PartySnapshot;
  senderSnapshot: PartySnapshot;
  destinationSnapshots: DeliveryDestinationSnapshot[];
  status: DeliveryNoteStatus;
  /** HI-07 — versioning and supersession. */
  documentVersion: number;
  isActive: boolean;
  supersedesDeliveryNoteId?: ID;
  regenerationReason?: string;
  voidReason?: string;
  generatedAt: ISODateTimeString;
  generatedByUserId: ID;
  printedAt?: ISODateTimeString;
  lastPrintedAt?: ISODateTimeString;
  printCount: number;
  signedAt?: ISODateTimeString;
  uploadedAt?: ISODateTimeString;
  verifiedAt?: ISODateTimeString;
  closedAt?: ISODateTimeString;
  qrPayload: DeliveryNoteQrPayload;
  items: DeliveryNoteItem[];
  signatureFields: DeliveryNoteSignatureFields;
  documentFiles: DeliveryNoteFile[];
  quantitySummary: DeliveryNoteQuantitySummary;
  notes?: string;
  audit: AuditStamp;
  version: number;
}

// ---------------------------------------------------------------------------
// Delivery Confirmation (POD) with attempt history (CR-06)
// ---------------------------------------------------------------------------

export interface PodEvidence {
  id: ID;
  type: PodEvidenceType;
  fileAssetId: ID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  capturedAt?: ISODateTimeString;
  uploadedAt: ISODateTimeString;
  uploadedByUserId: ID;
  notes?: string;
}

export interface DeliveryConfirmationItem {
  id: ID;
  deliveryConfirmationId: ID;
  shipmentBatchItemId: ID;
  deliveryNoteItemId?: ID;
  salesPointAllocationId: ID;
  materialCode: string;
  sku: string;
  expectedShippedQuantity: Quantity;
  claimedReceivedQuantity: Quantity;
  verifiedReceivedQuantity?: Quantity;
  varianceQuantity: Quantity;
  varianceReason?: DeliveryVarianceReason;
  condition: DeliveredItemCondition;
  remarks?: string;
}

export interface DeliveryConfirmationQuantitySummary {
  expectedShippedQuantity: Quantity;
  claimedReceivedQuantity: Quantity;
  verifiedReceivedQuantity: Quantity;
  varianceQuantity: Quantity;
  hasPartialDelivery: boolean;
}

/** CR-06 — immutable submission attempt. Corrections create new attempts. */
export interface DeliveryConfirmationAttempt {
  id: ID;
  deliveryConfirmationId: ID;
  attemptNumber: number;
  status: DeliveryConfirmationStatus;
  submittedAt?: ISODateTimeString;
  submittedBy?: ID;
  receiverName?: string;
  receiverRole?: string;
  receiverPhone?: string;
  receivedDate?: ISODateString;
  evidence: PodEvidence[];
  itemConfirmations: DeliveryConfirmationItem[];
  reviewDecision?: DeliveryConfirmationReviewDecision;
  reviewReason?: string;
  reviewedAt?: ISODateTimeString;
  reviewedBy?: ID;
  supersedesAttemptId?: ID;
}

export interface DeliveryConfirmation {
  id: ID;
  shipmentBatchId: ID;
  deliveryNoteId: ID;
  deliveryNoteNumber: string;
  orderRequestId: ID;
  salesPointId: ID;
  salesPointCode: string;
  salesPointName: string;
  status: DeliveryConfirmationStatus;
  receiverName: string;
  receiverRole?: string;
  receiverPhone?: string;
  receivedDate: ISODateString;
  submittedByUserId: ID;
  submittedAt: ISODateTimeString;
  reviewedByUserId?: ID;
  reviewedAt?: ISODateTimeString;
  rejectionReason?: string;
  correctionRequestedReason?: string;
  evidence: PodEvidence[];
  itemConfirmations: DeliveryConfirmationItem[];
  attempts: DeliveryConfirmationAttempt[];
  activeAttemptId: ID;
  quantitySummary: DeliveryConfirmationQuantitySummary;
  notes?: string;
  audit: AuditStamp;
  version: number;
}

/** CR-06 — immutable record of an applied verification (reversible by event). */
export interface PodVerificationEvent {
  id: ID;
  deliveryConfirmationId: ID;
  attemptId: ID;
  idempotencyKey: string;
  appliedAt: ISODateTimeString;
  appliedBy: ID;
  itemApplications: PodVerificationItemApplication[];
  reversedByEventId?: ID;
}

export interface PodVerificationItemApplication {
  shipmentBatchItemId: ID;
  salesPointAllocationId: ID;
  previousVerifiedReceivedQuantity: Quantity;
  newVerifiedReceivedQuantity: Quantity;
  deltaQuantity: Quantity;
}

// ---------------------------------------------------------------------------
// DTOs (delivery-note-api §6)
// ---------------------------------------------------------------------------

export interface GenerateDeliveryNoteDto {
  shipmentBatchId: ID;
  templateCode?: string;
  regenerate?: boolean;
  regenerationReason?: string;
}

export interface RecordDeliveryNotePrintDto {
  deliveryNoteId: ID;
  printedAt: ISODateTimeString;
  expectedVersion: number;
}

export interface VoidDeliveryNoteDto {
  deliveryNoteId: ID;
  reason: string;
  expectedVersion: number;
}

export interface UploadSignedDeliveryNoteDto {
  deliveryNoteId: ID;
  shipmentBatchId: ID;
  file: UploadFileReference;
  signedAt?: ISODateTimeString;
  expectedVersion: number;
}

export interface UploadFileReference {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface CreateDeliveryConfirmationDto {
  shipmentBatchId: ID;
  deliveryNoteId: ID;
  salesPointId: ID;
  receiverName: string;
  receiverRole?: string;
  receiverPhone?: string;
  receivedDate: ISODateString;
  evidence: Array<UploadFileReference & { type?: PodEvidenceType }>;
  itemConfirmations: CreateDeliveryConfirmationItemDto[];
  notes?: string;
}

export interface CreateDeliveryConfirmationItemDto {
  shipmentBatchItemId: ID;
  claimedReceivedQuantity: Quantity;
  varianceReason?: DeliveryVarianceReason;
  condition: DeliveredItemCondition;
  remarks?: string;
}

export interface VerifyDeliveryConfirmationDto {
  deliveryConfirmationId: ID;
  itemVerifications: VerifyDeliveryConfirmationItemDto[];
  decision: DeliveryConfirmationReviewDecision;
  reviewReason?: string;
  expectedVersion: number;
}

export interface VerifyDeliveryConfirmationItemDto {
  deliveryConfirmationItemId: ID;
  verifiedReceivedQuantity: Quantity;
  varianceReason?: DeliveryVarianceReason;
  remarks?: string;
}

export interface ReverseVerificationDto {
  deliveryConfirmationId: ID;
  verificationEventId: ID;
  reason: string;
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// View models (delivery-note-api §7–§8)
// ---------------------------------------------------------------------------

export interface DeliveryNoteListRow {
  id: ID;
  deliveryNoteNumber: string;
  shipmentBatchId: ID;
  batchNumber: string;
  orderRequestId: ID;
  orderRequestNumber: string;
  clientPoNumber: string | null;
  vendorName: string;
  clientName: string;
  projectName: string;
  salesPointCount: number;
  shippedQuantity: Quantity;
  generatedAt: ISODateTimeString;
  printedAt?: ISODateTimeString;
  uploadedAt?: ISODateTimeString;
  status: DeliveryNoteStatus;
  podStatus: PodStatus;
  missingPod: boolean;
  hasException: boolean;
  isActive: boolean;
  documentVersion: number;
  actionTargets: {
    printPath: string;
    batchDetailPath: string;
    podPath?: string;
  };
}

export interface PodVerificationQueueRow {
  deliveryConfirmationId: ID;
  shipmentBatchId: ID;
  deliveryNoteNumber: string;
  orderRequestNumber: string;
  salesPointName: string;
  receiverName: string;
  receivedDate: ISODateString;
  submittedByName: string;
  submittedAt: ISODateTimeString;
  ageHours: number;
  expectedShippedQuantity: Quantity;
  claimedReceivedQuantity: Quantity;
  varianceQuantity: Quantity;
  evidenceCount: number;
  status: DeliveryConfirmationStatus;
}

export interface DeliveryNoteDashboardSummary {
  totalDeliveryNotes: number;
  generatedCount: number;
  printedCount: number;
  signedCount: number;
  uploadedCount: number;
  verifiedCount: number;
  closedCount: number;
  missingPodCount: number;
  rejectedPodCount: number;
  correctionRequestedCount: number;
}

export interface PodDashboardSummary {
  pendingUploadCount: number;
  submittedForVerificationCount: number;
  verifiedCount: number;
  rejectedCount: number;
  correctionRequestedCount: number;
  varianceCount: number;
  totalExpectedQuantity: Quantity;
  totalClaimedReceivedQuantity: Quantity;
  totalVerifiedReceivedQuantity: Quantity;
  totalVarianceQuantity: Quantity;
  podComplianceRate: number;
}
