/**
 * P1-01 — Shared foundation primitives.
 * Source: docs/api-contracts/shared-foundation-api.md §2–§3, §11–§12.
 *
 * Enum vocabularies are implemented as string-literal unions with `as const`
 * value lists. Values are copied verbatim from the contracts; the union form
 * keeps string-literal assignability across the existing UI.
 */

export type ID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type Quantity = number;
export type CurrencyCode = "IDR" | "USD" | (string & {});

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

export interface AuditStamp {
  createdAt: ISODateTimeString;
  createdBy: ID;
  updatedAt: ISODateTimeString;
  updatedBy: ID;
}

// ---------------------------------------------------------------------------
// Shared entity references (order-request-api §2)
// ---------------------------------------------------------------------------

export type ClientReference = EntityReference;

export interface ProjectReference extends EntityReference {
  clientId: ID;
  picName?: string;
  picEmail?: string;
}

export type VendorReference = EntityReference;

export interface SalesPointReference extends EntityReference {
  wCode: string;
  zone: string;
  region: string;
  area: string;
  subArea: string;
}

export interface ProductReference extends EntityReference {
  sku: string;
  materialCode: string;
  unitOfMeasure: import("./status").UnitOfMeasure;
}

// ---------------------------------------------------------------------------
// Roles and entity types
// ---------------------------------------------------------------------------

export type UserRole = "ADMIN" | "OPERATOR" | "ANALYST" | "CLIENT" | "VENDOR";

export const USER_ROLES = ["ADMIN", "OPERATOR", "ANALYST", "CLIENT", "VENDOR"] as const satisfies readonly UserRole[];

export type EntityType =
  | "CLIENT"
  | "PROJECT"
  | "VENDOR"
  | "USER"
  | "PRODUCT"
  | "ORDER_REQUEST"
  | "ORDER_ITEM"
  | "PRODUCTION_JOB"
  | "SALES_POINT"
  | "SALES_POINT_ALIAS"
  | "SALES_POINT_ALLOCATION"
  | "SHIPMENT_BATCH"
  | "SHIPMENT_BATCH_ITEM"
  | "SHIPPING_PACKAGE"
  | "SHIPPING_LABEL"
  | "DELIVERY_NOTE"
  | "DELIVERY_CONFIRMATION"
  | "DELIVERY_CONFIRMATION_ATTEMPT"
  | "OPERATIONAL_EXCEPTION"
  | "FILE_ASSET"
  | "WORKFLOW_POLICY"
  | "AUDIT_EVENT"
  | "INTEGRATION_SYNC_RECORD"
  | "INSTALLATION_JOB"
  | "INVOICE"
  | "RECONCILIATION_RUN";

// ---------------------------------------------------------------------------
// Command and mutation envelope
// ---------------------------------------------------------------------------

export interface CommandMetadata {
  actorUserId: ID;
  actorRole: UserRole;
  idempotencyKey: string;
  reason?: string;
  sourceScreen?: string;
  correlationId?: string;
}

export type MutationSideEffectType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "PROJECTION_REBUILT"
  | "NOTIFICATION_QUEUED"
  | "FILE_LINKED"
  | "EXCEPTION_OPENED"
  | "EXCEPTION_RESOLVED"
  | "INTEGRATION_QUEUED";

export interface MutationSideEffect {
  type: MutationSideEffectType;
  entityType: EntityType;
  entityId: ID;
  description: string;
}

export interface ApiWarning {
  code: string;
  message: string;
  severity: "INFO" | "WARNING";
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

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "POLICY_BLOCKED"
  | "PROJECTION_STALE"
  | "FILE_REJECTED";

export type PermissionDeniedReason =
  | "WRONG_ROLE"
  | "WRONG_CLIENT_SCOPE"
  | "WRONG_VENDOR_SCOPE"
  | "MISSING_DELEGATION"
  | "STATE_LOCKED"
  | "POLICY_BLOCKED";

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

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  fieldErrors?: FieldError[];
  conflict?: ConflictError;
  permission?: PermissionError;
  retryable?: boolean;
}

/** Throwable wrapper carrying a contract `ApiError`. */
export class ApiCommandError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiCommandError";
    this.apiError = apiError;
  }
}

// ---------------------------------------------------------------------------
// Authorization scopes (CR-08; shared-foundation §11)
// ---------------------------------------------------------------------------

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

export interface AuthClaims {
  userId: ID;
  role: UserRole;
  clientIds: ID[];
  vendorIds: ID[];
  projectIds?: ID[];
  delegatedPermissions?: AuthorizationScopeName[];
}

export interface ActionDecision {
  allowed: boolean;
  disabledReason?: string;
  missingScope?: AuthorizationScopeName;
  preconditionFailures?: string[];
}

// ---------------------------------------------------------------------------
// Read projections and pagination (shared-foundation §12)
// ---------------------------------------------------------------------------

export type SortDirection = "ASC" | "DESC";

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

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

export interface PageInfo {
  page?: number;
  pageSize: number;
  cursor?: string;
  nextCursor?: string;
  total?: number;
  hasNextPage: boolean;
}

export interface PageResult<T> {
  data: T[];
  pageInfo: PageInfo;
  projection: ProjectionMetadata;
}
