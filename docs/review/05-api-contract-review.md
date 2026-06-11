# 05 - API Contract Review

## Executive Assessment

The API contracts are a strong TypeScript-first starting point. They include entity interfaces, DTOs, list queries, list/detail responses, table rows, dashboard summaries, sort fields, and permission models for the main V2 resources.

They are not yet backend-ready. The contracts duplicate shared enums, mix canonical entities with read projections, omit several required aggregate contracts, and do not fully specify error models, authorization, idempotency, audit events, file upload lifecycle, or state transition side effects.

## Reviewed Contracts

- `OrderRequest`
- `ShipmentBatch`
- `DeliveryNote`
- `DeliveryConfirmation`
- `SalesPoint`
- `SalesPointAllocation`

## Naming Consistency

### Strengths

- Entity names mostly align with V2 terminology: `OrderRequest`, `SalesPointAllocation`, `ShipmentBatch`, `DeliveryNote`, `DeliveryConfirmation`.
- DTO names follow predictable `Create*Dto`, `Update*Dto`, `*ListQuery`, `*ListResponse`, `*DetailResponse`.
- List row models are explicitly optimized for UI tables.

### Findings

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | `PodStatus` and `DeliveryConfirmationStatus` overlap and are inconsistently used. | Use `DeliveryConfirmationStatus` for submission/review lifecycle; derive `PodStatus` for summary/list views. |
| High | `PodStatus.NOT_REQUIRED` appears in Order contract but not batch/DN/Sales Point contracts. | Centralize shared enum or explicitly document context-specific variants. |
| Medium | Supplier/Vendor terminology remains mixed in docs and existing app. | Contract should use `Vendor`; UI can show migration alias if needed. |
| Medium | `DeliveryNoteStatus` appears in multiple contract files. | Import from shared domain module instead of redefining in each contract. |
| Medium | `ShipmentBatchStatus` and `ShipmentBatchItemStatus` names are clear, but item status transitions are not documented. | Add item transition rules or derive item status from quantity/POD. |
| Low | Route/action target fields embed path strings in view models. | Acceptable for local SPA, but future API should return IDs/permissions; frontend route builder should create paths. |

## DTO Completeness

### OrderRequest

| Area | Assessment | Gap |
| --- | --- | --- |
| Create/update/submit/cancel/accept | Mostly complete | Missing requester/current actor handling; assumes caller context or DTO. |
| Production update | Partial | Should move to `ProductionJob` contract or explicitly remain under Order API. |
| Allocation create/update | Partial | Duplicates Sales Point API allocation DTOs. |
| List/detail responses | Good | Needs error/empty/permission-denied models. |

Missing DTOs:

- `AmendOrderRequestDto`
- `ApproveUnderAllocationDto`
- `CorrectOrderSummaryDto` or better event-based correction commands
- `CreateOrderExceptionDto`
- `ResolveOrderExceptionDto`

### ShipmentBatch

| Area | Assessment | Gap |
| --- | --- | --- |
| Create/update/ready/dispatch/close/reopen | Good happy-path coverage | Missing cancel/void/failed delivery/return/correction commands. |
| List/detail response | Good | Detail lacks labels, POD confirmations, exceptions, and audit events. |
| Permissions | Good start | Needs disabled reasons/precondition failures for UI. |

Missing DTOs:

- `CancelShipmentBatchDto`
- `RecordFailedDeliveryDto`
- `CorrectShipmentBatchItemDto`
- `CreateBatchExceptionDto`
- `ResolveBatchExceptionDto`
- `GenerateShippingLabelsDto`
- `RecordShippingLabelPrintDto`
- `VoidShippingLabelDto`

### DeliveryNote And DeliveryConfirmation

| Area | Assessment | Gap |
| --- | --- | --- |
| Generate/update/print/upload | Mostly complete | Regeneration lacks document version/supersession response. |
| Create/verify confirmation | Partial | No draft/update/submit separation; resubmission history missing. |
| List/detail response | Good | Detail needs audit/version history and file access metadata. |

Missing DTOs:

- `CreateDeliveryConfirmationDraftDto`
- `UpdateDeliveryConfirmationDraftDto`
- `SubmitDeliveryConfirmationDto`
- `ResubmitDeliveryConfirmationDto`
- `WithdrawDeliveryConfirmationDto`
- `ReverseDeliveryVerificationDto`
- `VoidDeliveryNoteDto`
- `RegenerateDeliveryNoteResponse`

### SalesPoint

| Area | Assessment | Gap |
| --- | --- | --- |
| Create/update/contact/list/detail | Good | Contact update lacks `expectedVersion`; contact delete/deactivate should be explicit. |
| Allocation DTOs | Partial | Duplicates Order allocation DTOs. |
| Import matching | Basic | No candidate list/search result model. |

Missing DTOs:

- `DeactivateSalesPointDto`
- `ReactivateSalesPointDto`
- `MergeSalesPointsDto`
- `CreateSalesPointAliasDto`
- `SearchSalesPointCandidatesDto`
- `BulkImportSalesPointsDto`
- `ReviewSalesPointDto`

## Missing Enums

Required:

- `OperationalExceptionType`
- `OperationalExceptionStatus`
- `AuditEventType`
- `ShippingLabelStatus` exists, but missing `ShippingLabelType`, `ShippingLabelVoidReason`, `PrintEventStatus`
- `FileAssetStatus`
- `FileScanStatus`
- `WorkflowPolicyScope`
- `DocumentVersionStatus`
- `ProductionJobStatus` if separated from `ProductionStatus`
- `InstallationStatus`
- `InvoiceReconciliationStatus` exists in one contract but needs full invoice enums
- `IntegrationDirection`, `IntegrationAttemptStatus`, `IntegrationConflictType`
- `SlaStatus`

## Missing Response Models

| Severity | Model | Why Needed |
| --- | --- | --- |
| Critical | Error response model | React forms need field errors, global errors, conflict errors, and permission errors. |
| Critical | Mutation response model | Commands need updated entity, new version, audit/event IDs, and side-effect summaries. |
| Critical | File upload response model | POD/DN uploads need storage URL/key, preview, size, type, and validation results. |
| High | Audit/event list response | Every detail screen has Audit tab. |
| High | Exception list/detail response | Dashboards and closure blockers need source-linked exceptions. |
| High | Shipping label list/detail response | Batch label sections and print routes need canonical payloads. |
| High | Production job list/detail response | Production queue routes require it. |
| Medium | Batch selector response | Legacy document routes need one/none/many decision payload. |
| Medium | Import validation response | Import workspace needs row-level issue and candidate data. |
| Medium | Dashboard aggregate response by role | Current summaries are fragmented by entity contract. |

## Missing Aggregate Models

| Aggregate | Current Gap |
| --- | --- |
| Production aggregate | `ProductionJob` lacks API contract. |
| Shipping label aggregate | Referenced in UI and matrix but not modeled. |
| Exception aggregate | Only summaries/state enums exist. |
| Audit/event aggregate | Only `AuditStamp` exists. |
| File/evidence aggregate | `UploadFileReference` is only metadata; no asset lifecycle. |
| Workflow policy aggregate | Repeated policy-driven validation lacks source. |
| Invoice reconciliation aggregate | Future requirement is extension-only. |
| Installation verification aggregate | Future requirement is extension-only. |
| Integration sync aggregate | Extension status is insufficient. |

## React Suitability

Strong points:

- List row models fit table rendering.
- Detail responses include permissions.
- DTOs map cleanly to form submissions.
- `expectedVersion` is present in many update commands.

Problems:

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | No standard field validation error shape. | Add `ApiError`, `FieldError`, `ConflictError`, and `PermissionError` models. |
| High | Permission booleans lack disabled reasons. | Return `actions: { allowed, disabledReason?, preconditions? }`. |
| Medium | Paths in `actionTargets` couple API/read model to router. | Prefer entity IDs and route intent; build paths in frontend. |
| Medium | Detail responses may be too heavy for large batches/orders. | Add paginated child collections for allocations, batch items, POD, audit. |
| Medium | No loading/stale metadata. | Include version/updatedAt where UI must detect stale screens. |

## Zustand/Local Store Suitability

The user asked to validate suitability for Zustand; the current project docs use localStorage + `useSyncExternalStore`, but the same contract concerns apply to Zustand or any client store.

Strong points:

- Normalized entity maps can be built from IDs.
- DTOs make command boundaries testable.
- List rows can be selector outputs.

Risks:

- Duplicated enum definitions will create drift across slices/stores.
- Derived summaries on entities invite direct writes.
- Cross-store side effects are not command/event driven.
- No canonical mutation result shape makes optimistic updates fragile.

Recommendation:

- Use store slices for canonical entities only.
- Put derived quantities/statuses in selectors.
- Use command handlers that emit domain events and then rebuild projections.
- Keep DTO types in one shared contract module.

## TanStack Table Suitability

Strong points:

- Dedicated row models and column constants exist for major tables.
- Query filters and sort fields are documented.

Risks:

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | Pagination is page/pageSize only; no cursor option for large changing datasets. | Add cursor-compatible contract or define page semantics clearly. |
| High | Sort fields are not guaranteed to map to indexed backend fields. | Define supported indexed sort/filter combinations. |
| High | Child tables in detail screens may load huge arrays. | Add paginated child list queries for allocations, batch items, audit, POD attempts. |
| Medium | Filter field names differ slightly across contracts. | Standardize date range naming and status filter naming. |
| Medium | Summary included in every list response may be expensive. | Allow `includeSummary` or separate summary endpoint. |

## Future Backend Suitability

Current contracts are frontend-friendly but incomplete for backend implementation.

Backend gaps:

- No HTTP route/resource conventions.
- No standard error model.
- No auth/scope claims contract.
- No idempotency keys for commands.
- No transaction/side-effect model.
- No event/audit write contract.
- No file upload lifecycle.
- No projection rebuild/versioning model.
- No server-side pagination/index guidance.
- No webhook/integration contract.

Recommendation: add a backend contract appendix before implementation:

- resource routes,
- command idempotency,
- auth/scopes,
- error responses,
- event emission,
- file storage,
- transactional side effects,
- projection updates,
- pagination and filtering guarantees.

## Contract Corrections Before Implementation

1. Create shared enum/type module and remove duplicated enum definitions.
2. Add standard API error and mutation response models.
3. Add `ProductionJob` API contract.
4. Add `ShippingLabel` API contract.
5. Add `OperationalException` API contract.
6. Add `AuditEvent` API contract.
7. Add `FileAsset` upload/access contract.
8. Add policy/configuration contract.
9. Add POD attempt/versioning model.
10. Add Delivery Note document versioning model.
11. Define all command side effects and idempotency rules.
12. Add paginated child collection query contracts for high-volume detail screens.

## Final API Readiness Verdict

The API contracts are useful for frontend mock implementation and documentation alignment, but not yet sufficient for a future backend. They are suitable for a controlled prototype if the team accepts rework. They are not suitable for production-grade implementation without the corrections above.
