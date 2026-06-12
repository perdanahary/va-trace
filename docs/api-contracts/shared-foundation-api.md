# Shared Foundation API Contract

## 1. Purpose

This contract is normative for all V2 API, local repository, mock store, and future backend work. Entity-specific contracts may define resource-specific fields, but must import or mirror the concepts in this file rather than redefining them.

This file closes the development readiness gaps around shared enums, error handling, mutation responses, audit events, exceptions, policies, files, shipping labels, projections, authorization scopes, integration sync, invoice reconciliation, and installation verification.

## 2. Primitive Types

```ts
export type ID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type Quantity = number;
export type CurrencyCode = "IDR" | "USD" | string;

export interface EntityReference {
  id: ID;
  code?: string;
  name: string;
}

export interface VersionedEntity {
  id: ID;
  version: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
```

## 3. Shared Command And Error Models

All mutating commands must accept `expectedVersion` when they update an existing aggregate and `idempotencyKey` when retries can occur.

```ts
export interface CommandMetadata {
  actorUserId: ID;
  actorRole: UserRole;
  idempotencyKey: string;
  reason?: string;
  sourceScreen?: string;
  correlationId?: string;
}

export interface MutationResponse<T> {
  data: T;
  version: number;
  auditEventIds: ID[];
  domainEventIds: ID[];
  projectionVersion: number;
  sideEffects: MutationSideEffect[];
  warnings?: ApiWarning[];
}

export interface MutationSideEffect {
  type: MutationSideEffectType;
  entityType: EntityType;
  entityId: ID;
  description: string;
}

export enum MutationSideEffectType {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  PROJECTION_REBUILT = "PROJECTION_REBUILT",
  NOTIFICATION_QUEUED = "NOTIFICATION_QUEUED",
  FILE_LINKED = "FILE_LINKED",
  EXCEPTION_OPENED = "EXCEPTION_OPENED",
  EXCEPTION_RESOLVED = "EXCEPTION_RESOLVED",
  INTEGRATION_QUEUED = "INTEGRATION_QUEUED",
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  fieldErrors?: FieldError[];
  conflict?: ConflictError;
  permission?: PermissionError;
  retryable?: boolean;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ConflictError {
  entityType: EntityType;
  entityId: ID;
  expectedVersion?: number;
  actualVersion?: number;
  latestProjectionVersion?: number;
  resolution: "REFETCH" | "REAPPLY_COMMAND" | "CONTACT_ADMIN";
}

export interface PermissionError {
  action: string;
  reason: PermissionDeniedReason;
  missingScope?: AuthorizationScopeName;
}

export interface ApiWarning {
  code: string;
  message: string;
  severity: "INFO" | "WARNING";
}

export enum ApiErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NOT_FOUND = "NOT_FOUND",
  VERSION_CONFLICT = "VERSION_CONFLICT",
  IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  POLICY_BLOCKED = "POLICY_BLOCKED",
  PROJECTION_STALE = "PROJECTION_STALE",
  FILE_REJECTED = "FILE_REJECTED",
}

export enum PermissionDeniedReason {
  WRONG_ROLE = "WRONG_ROLE",
  WRONG_CLIENT_SCOPE = "WRONG_CLIENT_SCOPE",
  WRONG_VENDOR_SCOPE = "WRONG_VENDOR_SCOPE",
  MISSING_DELEGATION = "MISSING_DELEGATION",
  STATE_LOCKED = "STATE_LOCKED",
  POLICY_BLOCKED = "POLICY_BLOCKED",
}
```

## 4. Shared Enums

Entity contracts must reference these shared lifecycle vocabularies. List row projections may expose display labels, but canonical calculations must use these values.

```ts
export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  ANALYST = "ANALYST",
  CLIENT = "CLIENT",
  VENDOR = "VENDOR",
}

export enum EntityType {
  CLIENT = "CLIENT",
  PROJECT = "PROJECT",
  VENDOR = "VENDOR",
  USER = "USER",
  PRODUCT = "PRODUCT",
  ORDER_REQUEST = "ORDER_REQUEST",
  ORDER_ITEM = "ORDER_ITEM",
  PRODUCTION_JOB = "PRODUCTION_JOB",
  SALES_POINT = "SALES_POINT",
  SALES_POINT_ALIAS = "SALES_POINT_ALIAS",
  SALES_POINT_ALLOCATION = "SALES_POINT_ALLOCATION",
  SHIPMENT_BATCH = "SHIPMENT_BATCH",
  SHIPMENT_BATCH_ITEM = "SHIPMENT_BATCH_ITEM",
  SHIPPING_PACKAGE = "SHIPPING_PACKAGE",
  SHIPPING_LABEL = "SHIPPING_LABEL",
  DELIVERY_NOTE = "DELIVERY_NOTE",
  DELIVERY_CONFIRMATION = "DELIVERY_CONFIRMATION",
  DELIVERY_CONFIRMATION_ATTEMPT = "DELIVERY_CONFIRMATION_ATTEMPT",
  OPERATIONAL_EXCEPTION = "OPERATIONAL_EXCEPTION",
  FILE_ASSET = "FILE_ASSET",
  WORKFLOW_POLICY = "WORKFLOW_POLICY",
  AUDIT_EVENT = "AUDIT_EVENT",
  INTEGRATION_SYNC_RECORD = "INTEGRATION_SYNC_RECORD",
  INSTALLATION_JOB = "INSTALLATION_JOB",
  INVOICE = "INVOICE",
  RECONCILIATION_RUN = "RECONCILIATION_RUN",
}

export enum ProductionStatus {
  NEW = "NEW",
  SUBMITTED = "SUBMITTED",
  ACCEPTED = "ACCEPTED",
  PRINTING = "PRINTING",
  FINISHING = "FINISHING",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  READY_FOR_DISTRIBUTION = "READY_FOR_DISTRIBUTION",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXCEPTION = "EXCEPTION",
}

export enum DistributionStatus {
  NOT_STARTED = "NOT_STARTED",
  PARTIALLY_DISTRIBUTED = "PARTIALLY_DISTRIBUTED",
  FULLY_DISTRIBUTED = "FULLY_DISTRIBUTED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  FULLY_RECEIVED = "FULLY_RECEIVED",
  CANCELLED = "CANCELLED",
  EXCEPTION = "EXCEPTION",
}

export enum AllocationStatus {
  NOT_SHIPPED = "NOT_SHIPPED",
  PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED",
  FULLY_SHIPPED = "FULLY_SHIPPED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  FULLY_RECEIVED = "FULLY_RECEIVED",
  SHORT_RECEIVED = "SHORT_RECEIVED",
  OVER_RECEIVED = "OVER_RECEIVED",
  ADJUSTED = "ADJUSTED",
  CANCELLED = "CANCELLED",
  EXCEPTION = "EXCEPTION",
}

export enum ShipmentBatchStatus {
  DRAFT = "DRAFT",
  READY = "READY",
  DISPATCHED = "DISPATCHED",
  IN_TRANSIT = "IN_TRANSIT",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  FULLY_RECEIVED = "FULLY_RECEIVED",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED = "RETURNED",
  EXCEPTION = "EXCEPTION",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
  VOIDED = "VOIDED",
}

export enum DeliveryNoteStatus {
  GENERATED = "GENERATED",
  PRINTED = "PRINTED",
  SIGNED = "SIGNED",
  UPLOADED = "UPLOADED",
  VERIFIED = "VERIFIED",
  CLOSED = "CLOSED",
  SUPERSEDED = "SUPERSEDED",
  REGENERATED = "REGENERATED",
  VOIDED = "VOIDED",
}

export enum DeliveryConfirmationStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  CORRECTION_REQUESTED = "CORRECTION_REQUESTED",
  RESUBMITTED = "RESUBMITTED",
  WITHDRAWN = "WITHDRAWN",
  SUPERSEDED = "SUPERSEDED",
  CLOSED = "CLOSED",
}

// AMENDED (V2 implementation alignment): the previous draft of this enum used
// NOT_STARTED/DRAFT/PENDING/PARTIALLY_VERIFIED/MISSING values that conflicted with
// the entity contracts (sales-point-api, shipment-batch-api, delivery-note-api) and
// docs/implementation/01-domain-model-refactor.md, which all agree on the vocabulary
// below. The entity-contract vocabulary is canonical. "Missing POD" is a derived
// projection flag (printed/dispatched without submission past threshold), not a status.
export enum PodStatus {
  NOT_REQUIRED = "NOT_REQUIRED",
  PENDING_UPLOAD = "PENDING_UPLOAD",
  SUBMITTED = "SUBMITTED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  CORRECTION_REQUESTED = "CORRECTION_REQUESTED",
  VARIANCE = "VARIANCE",
}
```

## 5. Audit And Domain Events

`AuditStamp` is metadata only. It does not replace the append-only event log.

```ts
export interface AuditStamp {
  createdAt: ISODateTimeString;
  createdBy: ID;
  updatedAt: ISODateTimeString;
  updatedBy: ID;
}

export interface AuditEvent extends VersionedEntity {
  eventType: AuditEventType;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  actorUserId: ID;
  actorRole: UserRole;
  occurredAt: ISODateTimeString;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  sourceScreen?: string;
  correlationId?: string;
  domainEventId?: ID;
}

export interface DomainEvent extends VersionedEntity {
  eventType: DomainEventType;
  aggregateType: EntityType;
  aggregateId: ID;
  occurredAt: ISODateTimeString;
  payload: unknown;
  idempotencyKey?: string;
  correlationId?: string;
  projectionVersion?: number;
}

export enum AuditEventType {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  QUANTITY_ADJUSTED = "QUANTITY_ADJUSTED",
  FILE_UPLOADED = "FILE_UPLOADED",
  PRINTED = "PRINTED",
  VOIDED = "VOIDED",
  REGENERATED = "REGENERATED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  CORRECTION_REQUESTED = "CORRECTION_REQUESTED",
  EXCEPTION_OPENED = "EXCEPTION_OPENED",
  EXCEPTION_RESOLVED = "EXCEPTION_RESOLVED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  INTEGRATION_ATTEMPTED = "INTEGRATION_ATTEMPTED",
}

export enum DomainEventType {
  ORDER_SUBMITTED = "ORDER_SUBMITTED",
  PRODUCTION_READY_QUANTITY_CHANGED = "PRODUCTION_READY_QUANTITY_CHANGED",
  ALLOCATION_ADJUSTED = "ALLOCATION_ADJUSTED",
  SHIPMENT_BATCH_CREATED = "SHIPMENT_BATCH_CREATED",
  SHIPMENT_BATCH_DISPATCHED = "SHIPMENT_BATCH_DISPATCHED",
  DELIVERY_NOTE_GENERATED = "DELIVERY_NOTE_GENERATED",
  SHIPPING_LABEL_PRINTED = "SHIPPING_LABEL_PRINTED",
  POD_SUBMITTED = "POD_SUBMITTED",
  POD_VERIFICATION_APPLIED = "POD_VERIFICATION_APPLIED",
  POD_VERIFICATION_REVERSED = "POD_VERIFICATION_REVERSED",
  EXCEPTION_STATE_CHANGED = "EXCEPTION_STATE_CHANGED",
  PROJECTION_REBUILD_REQUESTED = "PROJECTION_REBUILD_REQUESTED",
}
```

## 6. Operational Exceptions

Operational exceptions are first-class, source-linked records. Closing a batch or completing an order requires either no open blocking exception or an explicit policy waiver.

```ts
export interface OperationalException extends VersionedEntity {
  exceptionNumber: string;
  type: OperationalExceptionType;
  severity: ExceptionSeverity;
  status: OperationalExceptionStatus;
  ownerRole: UserRole;
  ownerUserId?: ID;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  affectedEntityRefs: ExceptionEntityRef[];
  title: string;
  description: string;
  dueAt?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
  resolvedBy?: ID;
  resolution?: ExceptionResolution;
  reopenedFromExceptionId?: ID;
  auditEventIds: ID[];
}

export interface ExceptionEntityRef {
  entityType: EntityType;
  entityId: ID;
  lineId?: ID;
}

export interface ExceptionResolution {
  resolutionType: ExceptionResolutionType;
  reason: string;
  waiverPolicyId?: ID;
  billableImpact?: "NONE" | "SHORTAGE" | "OVERAGE" | "DISPUTED";
}

export enum OperationalExceptionType {
  QUANTITY_VARIANCE = "QUANTITY_VARIANCE",
  MISSING_ADDRESS = "MISSING_ADDRESS",
  MISSING_CONTACT = "MISSING_CONTACT",
  REJECTED_POD = "REJECTED_POD",
  MISSING_POD = "MISSING_POD",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED_SHIPMENT = "RETURNED_SHIPMENT",
  DAMAGED_ITEM = "DAMAGED_ITEM",
  ORDER_CANCELLATION = "ORDER_CANCELLATION",
  ALLOCATION_CORRECTION = "ALLOCATION_CORRECTION",
  DOCUMENT_CORRECTION = "DOCUMENT_CORRECTION",
  INTEGRATION_CONFLICT = "INTEGRATION_CONFLICT",
  MASTER_DATA_DUPLICATE = "MASTER_DATA_DUPLICATE",
}

export enum ExceptionSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum OperationalExceptionStatus {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  IN_REVIEW = "IN_REVIEW",
  RESOLVED = "RESOLVED",
  WAIVED = "WAIVED",
  REOPENED = "REOPENED",
  CANCELLED = "CANCELLED",
}

export enum ExceptionResolutionType {
  FIXED = "FIXED",
  ACCEPTED_VARIANCE = "ACCEPTED_VARIANCE",
  WAIVED_BY_POLICY = "WAIVED_BY_POLICY",
  CANCELLED_SOURCE = "CANCELLED_SOURCE",
  DUPLICATE = "DUPLICATE",
}
```

Required DTOs:

```ts
export interface CreateOperationalExceptionDto {
  type: OperationalExceptionType;
  severity: ExceptionSeverity;
  ownerRole: UserRole;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  affectedEntityRefs?: ExceptionEntityRef[];
  title: string;
  description: string;
  dueAt?: ISODateTimeString;
  command: CommandMetadata;
}

export interface ResolveOperationalExceptionDto {
  exceptionId: ID;
  expectedVersion: number;
  resolution: ExceptionResolution;
  command: CommandMetadata;
}

export interface ReopenOperationalExceptionDto {
  exceptionId: ID;
  expectedVersion: number;
  reason: string;
  ownerRole: UserRole;
  command: CommandMetadata;
}
```

## 7. Workflow Policy

Policies are resolved by specificity: Project overrides Client, Client overrides Vendor default, and global default applies last.

```ts
export interface WorkflowPolicy extends VersionedEntity {
  name: string;
  scope: WorkflowPolicyScope;
  clientId?: ID;
  projectId?: ID;
  vendorId?: ID;
  effectiveFrom: ISODateString;
  effectiveTo?: ISODateString;
  orderRules: OrderPolicyRules;
  shipmentRules: ShipmentPolicyRules;
  podRules: PodPolicyRules;
  documentRules: DocumentPolicyRules;
  exposureRules: ExposurePolicyRules;
  slaRules: SlaPolicyRules;
}

export enum WorkflowPolicyScope {
  GLOBAL = "GLOBAL",
  CLIENT = "CLIENT",
  PROJECT = "PROJECT",
  VENDOR = "VENDOR",
  CLIENT_VENDOR = "CLIENT_VENDOR",
}

export interface OrderPolicyRules {
  clientPoRequired: boolean;
  allowUnderAllocationOnSubmit: boolean;
  requireUnderAllocationApproval: boolean;
  allowOrderAmendmentAfterShipment: boolean;
}

export interface ShipmentPolicyRules {
  enforceProductionReadyQuantity: boolean;
  requireDeliveryNoteBeforeDispatch: boolean;
  requireLabelsBeforeDispatch: boolean;
  allowOverShipment: boolean;
  maxOverShipmentPercent?: number;
  blockDispatchForMissingAddress: boolean;
  blockDispatchForMissingContact: boolean;
}

export interface PodPolicyRules {
  podRequired: boolean;
  signedDeliveryNoteRequired: boolean;
  photoEvidenceRequired: boolean;
  minPhotoCount?: number;
  allowOverReceipt: boolean;
  requireAdminOverageApproval: boolean;
  missingPodEscalationHours: number;
}

export interface DocumentPolicyRules {
  oneActiveDeliveryNotePerBatch: boolean;
  allowVendorRegenerateDeliveryNote: boolean;
  requireAdminReasonForVoid: boolean;
  labelType: ShippingLabelType;
}

export interface ExposurePolicyRules {
  clientCanViewPodEvidence: boolean;
  clientCanViewDeliveryNotes: boolean;
  clientCanViewVendorName: boolean;
  analystCanExportEvidenceMetadata: boolean;
}

export interface SlaPolicyRules {
  productionDueHours?: number;
  dispatchDueHours?: number;
  podDueHours?: number;
  exceptionResolutionDueHours?: number;
}
```

## 8. Files And Evidence

```ts
export interface FileAsset extends VersionedEntity {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: "LOCAL_MOCK" | "S3" | "GCS" | "AZURE" | string;
  storageKey: string;
  status: FileAssetStatus;
  scanStatus: FileScanStatus;
  qualityStatus?: FileQualityStatus;
  checksumSha256?: string;
  previewUrl?: string;
  downloadUrl?: string;
  capturedAt?: ISODateTimeString;
  capturedBy?: ID;
  geo?: GeoPoint;
  accessPolicy: FileAccessPolicy;
  retentionUntil?: ISODateString;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface FileAccessPolicy {
  visibleToRoles: UserRole[];
  clientVisible: boolean;
  vendorVisible: boolean;
  expiresAt?: ISODateTimeString;
}

export enum FileAssetStatus {
  UPLOADING = "UPLOADING",
  AVAILABLE = "AVAILABLE",
  REJECTED = "REJECTED",
  QUARANTINED = "QUARANTINED",
  DELETED = "DELETED",
}

export enum FileScanStatus {
  NOT_SCANNED = "NOT_SCANNED",
  PENDING = "PENDING",
  CLEAN = "CLEAN",
  FAILED = "FAILED",
}

export enum FileQualityStatus {
  NOT_CHECKED = "NOT_CHECKED",
  ACCEPTABLE = "ACCEPTABLE",
  BLURRY = "BLURRY",
  WRONG_DOCUMENT = "WRONG_DOCUMENT",
  INCOMPLETE = "INCOMPLETE",
}
```

## 9. Shipping Packages And Labels

Labels belong to packages, and packages belong to shipment batch items or grouped package plans. Printing a label is an event, not only a status.

```ts
export interface ShippingPackage extends VersionedEntity {
  shipmentBatchId: ID;
  packageNumber: string;
  salesPointId: ID;
  shipmentBatchItemIds: ID[];
  quantityByItem: PackageItemQuantity[];
  labelIds: ID[];
  status: ShippingPackageStatus;
  snapshotVersion: number;
}

export interface PackageItemQuantity {
  shipmentBatchItemId: ID;
  orderItemId: ID;
  productId: ID;
  quantity: Quantity;
}

export interface ShippingLabel extends VersionedEntity {
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
}

export interface ShippingLabelQrPayload {
  labelNumber: string;
  shipmentBatchId: ID;
  shippingPackageId: ID;
  salesPointId: ID;
  checksum: string;
}

export interface ShippingLabelPrintEvent extends VersionedEntity {
  shippingLabelId: ID;
  printedAt: ISODateTimeString;
  printedBy: ID;
  printStatus: PrintEventStatus;
  printerName?: string;
  reason?: string;
}

export enum ShippingPackageStatus {
  PLANNED = "PLANNED",
  PACKED = "PACKED",
  LABELLED = "LABELLED",
  DISPATCHED = "DISPATCHED",
  DELIVERED = "DELIVERED",
  VOIDED = "VOIDED",
}

export enum ShippingLabelType {
  PACKAGE = "PACKAGE",
  SALES_POINT = "SALES_POINT",
  PALLET = "PALLET",
}

export enum ShippingLabelStatus {
  NOT_GENERATED = "NOT_GENERATED",
  GENERATED = "GENERATED",
  PRINTED = "PRINTED",
  REPRINTED = "REPRINTED",
  VOIDED = "VOIDED",
  SUPERSEDED = "SUPERSEDED",
}

export enum ShippingLabelVoidReason {
  WRONG_PACKAGE = "WRONG_PACKAGE",
  WRONG_DESTINATION = "WRONG_DESTINATION",
  DAMAGED_PRINT = "DAMAGED_PRINT",
  BATCH_CANCELLED = "BATCH_CANCELLED",
  DOCUMENT_REGENERATED = "DOCUMENT_REGENERATED",
}

export enum PrintEventStatus {
  REQUESTED = "REQUESTED",
  PRINTED = "PRINTED",
  FAILED = "FAILED",
}
```

Required DTOs:

```ts
export interface GenerateShippingLabelsDto {
  shipmentBatchId: ID;
  packagePlan?: CreateShippingPackageDto[];
  command: CommandMetadata;
}

export interface CreateShippingPackageDto {
  salesPointId: ID;
  shipmentBatchItemIds: ID[];
  quantityByItem: PackageItemQuantity[];
}

export interface RecordShippingLabelPrintDto {
  shippingLabelIds: ID[];
  printerName?: string;
  command: CommandMetadata;
}

export interface VoidShippingLabelDto {
  shippingLabelId: ID;
  expectedVersion: number;
  reason: ShippingLabelVoidReason;
  command: CommandMetadata;
}
```

## 10. Delivery Confirmation Attempts And Verification Events

```ts
export interface DeliveryConfirmationAttempt extends VersionedEntity {
  deliveryConfirmationId: ID;
  attemptNumber: number;
  status: DeliveryConfirmationStatus;
  submittedAt?: ISODateTimeString;
  submittedBy?: ID;
  receiverName?: string;
  receiverRole?: string;
  receivedAt?: ISODateTimeString;
  evidenceFileAssetIds: ID[];
  itemDecisions: DeliveryConfirmationAttemptItem[];
  reviewDecision?: DeliveryConfirmationReviewDecision;
  reviewReason?: string;
  reviewedAt?: ISODateTimeString;
  reviewedBy?: ID;
  supersedesAttemptId?: ID;
}

export interface DeliveryConfirmationAttemptItem {
  shipmentBatchItemId: ID;
  claimedReceivedQuantity: Quantity;
  verifiedReceivedQuantity?: Quantity;
  condition?: DeliveredItemCondition;
  decision?: DeliveryConfirmationItemDecision;
  varianceReason?: DeliveryVarianceReason;
  exceptionId?: ID;
}

export interface PodVerificationEvent extends VersionedEntity {
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

export enum DeliveryConfirmationReviewDecision {
  VERIFY = "VERIFY",
  PARTIALLY_VERIFY = "PARTIALLY_VERIFY",
  REJECT = "REJECT",
  REQUEST_CORRECTION = "REQUEST_CORRECTION",
}

export enum DeliveryConfirmationItemDecision {
  ACCEPT = "ACCEPT",
  REJECT = "REJECT",
  REQUEST_CORRECTION = "REQUEST_CORRECTION",
  ACCEPT_WITH_VARIANCE = "ACCEPT_WITH_VARIANCE",
}

export enum DeliveredItemCondition {
  GOOD = "GOOD",
  DAMAGED = "DAMAGED",
  MISSING = "MISSING",
  EXCESS = "EXCESS",
}

export enum DeliveryVarianceReason {
  SHORT_SHIPMENT = "SHORT_SHIPMENT",
  OVER_RECEIVED = "OVER_RECEIVED",
  DAMAGED = "DAMAGED",
  MISSING_AT_DESTINATION = "MISSING_AT_DESTINATION",
  DATA_ENTRY_ERROR = "DATA_ENTRY_ERROR",
  CLIENT_ACCEPTED_VARIANCE = "CLIENT_ACCEPTED_VARIANCE",
}
```

## 11. Authorization Scopes And Action Decisions

```ts
export interface AuthClaims {
  userId: ID;
  role: UserRole;
  clientIds: ID[];
  vendorIds: ID[];
  projectIds?: ID[];
  delegatedPermissions?: AuthorizationScopeName[];
}

export type AuthorizationScopeName =
  | "orders:read"
  | "orders:write"
  | "production:update"
  | "shipments:create"
  | "shipments:dispatch"
  | "documents:print"
  | "labels:manage"
  | "pod:upload"
  | "pod:verify"
  | "exceptions:manage"
  | "master-data:manage"
  | "reports:export";

export interface ActionDecision {
  allowed: boolean;
  disabledReason?: string;
  missingScope?: AuthorizationScopeName;
  preconditionFailures?: string[];
}
```

## 12. Read Projections And Pagination

Canonical aggregates store facts. Summaries, progress, list rows, badges, dashboard cards, and counts are read projections.

```ts
export interface ProjectionMetadata {
  projectionName: string;
  projectionVersion: number;
  rebuiltAt: ISODateTimeString;
  sourceEventId: ID;
  stale: boolean;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: SortSpec[];
  includeSummary?: boolean;
}

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

export interface PageResult<T> {
  data: T[];
  pageInfo: PageInfo;
  projection: ProjectionMetadata;
}

export interface PageInfo {
  page?: number;
  pageSize: number;
  cursor?: string;
  nextCursor?: string;
  total?: number;
  hasNextPage: boolean;
}

export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}
```

Scale requirements:

- Sales Point, allocation, audit, POD attempt, and batch item lists must support server-style filtering, sorting, and pagination from Phase 1.
- Cursor pagination is required for changing operational queues; page/pageSize is allowed for stable small reference lists.
- Supported filter/sort combinations must map to indexed fields in future backend implementation.
- React tables for Sales Points and allocation-heavy screens must use TanStack Table-compatible row models and virtualization.

## 13. Integration Sync

```ts
export interface IntegrationSyncRecord extends VersionedEntity {
  sourceSystem: IntegrationSystem;
  direction: IntegrationDirection;
  entityType: EntityType;
  entityId: ID;
  externalId?: string;
  idempotencyKey: string;
  status: IntegrationAttemptStatus;
  lastAttemptAt?: ISODateTimeString;
  nextRetryAt?: ISODateTimeString;
  attemptCount: number;
  conflictType?: IntegrationConflictType;
  lastError?: string;
  payloadChecksum?: string;
}

export enum IntegrationSystem {
  SAP = "SAP",
  COUPA = "COUPA",
  ERP = "ERP",
  MANUAL_IMPORT = "MANUAL_IMPORT",
}

export enum IntegrationDirection {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}

export enum IntegrationAttemptStatus {
  PENDING = "PENDING",
  RETRYING = "RETRYING",
  SUCCESS = "SUCCESS",
  PARTIAL_SUCCESS = "PARTIAL_SUCCESS",
  FAILED = "FAILED",
  IGNORED = "IGNORED",
  MANUAL_ACTION_REQUIRED = "MANUAL_ACTION_REQUIRED",
}

export enum IntegrationConflictType {
  VERSION_CONFLICT = "VERSION_CONFLICT",
  FIELD_MAPPING_ERROR = "FIELD_MAPPING_ERROR",
  MISSING_REFERENCE = "MISSING_REFERENCE",
  EXTERNAL_REJECTED = "EXTERNAL_REJECTED",
}
```

## 14. Installation Verification

Installation is not part of the initial fulfillment workflow, but current entities must expose stable attachment points.

```ts
export interface InstallationJob extends VersionedEntity {
  orderRequestId: ID;
  salesPointId: ID;
  allocationIds: ID[];
  vendorId?: ID;
  installerUserId?: ID;
  status: InstallationStatus;
  requiredByPolicyId?: ID;
  scheduledAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  confirmationIds: ID[];
}

export interface InstallationConfirmation extends VersionedEntity {
  installationJobId: ID;
  evidenceFileAssetIds: ID[];
  notes?: string;
  status: InstallationStatus;
  reviewedBy?: ID;
  reviewedAt?: ISODateTimeString;
}

export enum InstallationStatus {
  NOT_REQUIRED = "NOT_REQUIRED",
  REQUIRED = "REQUIRED",
  SCHEDULED = "SCHEDULED",
  INSTALLED = "INSTALLED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}
```

## 15. Invoice Reconciliation

Invoice reconciliation is future scope for workflow implementation, but the data model must reserve source links so shipped, verified, overage, shortage, and dispute outcomes remain billable.

```ts
export interface Invoice extends VersionedEntity {
  invoiceNumber: string;
  vendorId: ID;
  clientId: ID;
  status: InvoiceStatus;
  lineIds: ID[];
  reconciliationRunIds: ID[];
}

export interface InvoiceLine extends VersionedEntity {
  invoiceId: ID;
  sourceEntityType: EntityType;
  sourceEntityId: ID;
  orderItemId?: ID;
  salesPointId?: ID;
  claimedQuantity: Quantity;
  billableQuantity?: Quantity;
  unitPrice?: number;
  currency?: CurrencyCode;
  reconciliationStatus: InvoiceReconciliationStatus;
  exceptionId?: ID;
}

export interface ReconciliationRun extends VersionedEntity {
  invoiceId: ID;
  status: InvoiceReconciliationStatus;
  startedAt: ISODateTimeString;
  completedAt?: ISODateTimeString;
  sourceEventIds: ID[];
  varianceSummary: string;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  IN_RECONCILIATION = "IN_RECONCILIATION",
  APPROVED = "APPROVED",
  DISPUTED = "DISPUTED",
  PAID = "PAID",
  VOIDED = "VOIDED",
}

export enum InvoiceReconciliationStatus {
  NOT_STARTED = "NOT_STARTED",
  MATCHED = "MATCHED",
  VARIANCE = "VARIANCE",
  DISPUTED = "DISPUTED",
  APPROVED_WITH_VARIANCE = "APPROVED_WITH_VARIANCE",
  CLOSED = "CLOSED",
}
```

## 16. Development Readiness Rules

- No UI command may directly write projection-only fields such as shipped quantity, received quantity, dashboard summary, or derived status.
- Every command that changes fulfillment state must return `MutationResponse<T>` and emit audit/domain event IDs.
- Every correction, reversal, void, and waiver must require a reason.
- Every file used as evidence must be a `FileAsset` and must pass file status/access checks before verification.
- Every queue/list capable of exceeding 1,000 rows must use paginated query contracts; Sales Point and allocation tables must be designed for 10,000+ rows.
- Every role-scoped query and command must evaluate `AuthClaims` server-side or in the local repository boundary during mock implementation.

