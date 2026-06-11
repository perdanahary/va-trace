# 02 - Data Model Review

## Executive Assessment

The proposed V2 data model is a major improvement over the current order-centered aggregate. It correctly introduces allocation and shipment layers, and it can represent basic partial shipment and partial delivery.

It is not yet ready for backend implementation or long-term scale. The model still relies on denormalized summary fields, repeated enum definitions, and implied workflows. Several required business concepts are missing as durable entities: shipping labels, audit events, operational exceptions, workflow policies, files/evidence, invoice reconciliation, and installation verification.

## Entity Review Summary

| Entity | Current Readiness | Main Concern |
| --- | --- | --- |
| `OrderRequest` | Mostly ready for demand tracking | Stores derived logistics summaries without projection/rebuild rules. |
| `OrderItem` | Partially ready | Production fields duplicate missing `ProductionJob` contract. |
| `SalesPoint` | Mostly ready for master data | Operational summaries on aggregate need projection semantics. |
| `SalesPointAllocation` | Strong concept, needs refinement | Correction/versioning and over/short receipt states are under-modeled. |
| `ProductionJob` | Not ready | Mentioned everywhere but no API contract exists. |
| `ShipmentBatch` | Mostly ready | Needs cancellation/exception states, package/label model, and correction events. |
| `DeliveryNote` | Mostly ready | Needs document versioning, void/regenerate semantics, and file asset policy. |
| `DeliveryConfirmation` | Partially ready | Needs submission attempt history and idempotent verification model. |

## OrderRequest

### Strengths

- Correctly represents demand rather than shipment.
- Contains client, project, vendor, requester, source, priority, deadline, items, allocations, quantity summary, document summary, and exception summary.
- Supports legacy compatibility through `legacyStatusLabel`.
- API includes list/detail response models and permissions.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | `productionStatus`, `distributionStatus`, `quantitySummary`, `documentSummary`, and `exceptionSummary` are stored on the aggregate but should be derived projections. | Mark these as read-model fields or cache fields with rebuild triggers. Do not mutate them directly. |
| High | Order completion depends on "all allocated quantities received", but no immutable calculation source is defined. | Define completion as a projection over allocations, shipment batch items, verified confirmations, and unresolved exceptions. |
| High | No order amendment model after partial shipment. | Add amendment/correction workflow for changing demand or allocations after dependencies exist. |
| Medium | `clientPoNumber` uniqueness is policy-based but no policy entity exists. | Add client-scoped workflow policy. |
| Medium | External references are too shallow for ERP integration. | Add external reference IDs with source system, external status, sync direction, idempotency key, and last sync result. |
| Medium | `underAllocationReason` exists at order and allocation level without approval status. | Add under-allocation approval decision or policy waiver. |

### Missing Fields

- `statusVersion` or projection timestamp for derived status.
- `completedAt` and `completedBySystemEventId`.
- `cancelledByUserId`.
- `amendmentIds` or active amendment state.
- `policySnapshotId`.
- `sourceImportBatchId`.
- `integrationSyncIds`.

## OrderItem

### Strengths

- Product reference includes SKU, material code, unit.
- Tracks ordered, ready, completed, allocated, shipped, received quantities.
- Supports item-level production status.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | `shippedQuantity` and `receivedQuantity` on item are derived from shipments/POD, but the model does not state they are read-only. | Treat as projection-only fields and derive from batch items and verified confirmations. |
| High | `productionStatus`, `productionReadyQuantity`, and `productionCompletedQuantity` duplicate the missing `ProductionJob` model. | Add `ProductionJob` contract or rename these to projection fields. |
| Medium | No per-item cancellation, substitution, or rework fields. | Add item exception/amendment support or link to `OperationalException`. |
| Medium | No product snapshot version. | Capture product master version/name/spec at order creation to preserve historical intent. |

### Reporting Limitations

- Cannot reliably report production lead time by item without production event timestamps.
- Cannot distinguish produced, QC-passed, packed, ready, and shipped if only summary quantities exist.

## SalesPoint

### Strengths

- Strong destination identity with code, WCode, client, geography, address, contacts, data quality, and audit.
- Supports high-volume table requirements with list row models and filters.
- Captures future installation and integration extension fields.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | `operationalSummary` and `allocationSummary` are read projections but embedded on master aggregate. | Move to detail/list response projections or define rebuild/update rules. |
| High | No alias/merge/remap model for duplicate Sales Points. | Add `SalesPointAlias` and merge workflow. |
| Medium | WCode uniqueness is configurable, but no tenant/client namespace model exists. | Define namespace policy and indexes. |
| Medium | Address is a single current address; no address history. | Add address version/history or snapshot policy for dispatch documents. |
| Medium | Latitude/longitude are optional but no geocoding/validation state exists. | Add geocode status if route tracking is a future requirement. |

### 10,000+ Sales Point Readiness

Partially ready. The list query has pagination and filters, but implementation must avoid loading all Sales Points into React for matching/filtering. Required additions:

- Server-style search/filter/sort contract even for mock repositories.
- Indexed lookup by `clientId`, `wCode`, `code`, geography, name.
- Virtualized table from first implementation phase.
- Bulk import match service with deterministic confidence and duplicate handling.

## SalesPointAllocation

### Strengths

- Correctly bridges `OrderRequest`, `OrderItem`, and `SalesPoint`.
- Supports partial shipment by linking multiple batch items.
- Tracks allocated, shipped, received, outstanding, remaining-to-receive, status, POD status, and exceptions.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| Critical | Correction/version model is underspecified. | Add allocation revision or correction events for post-shipment changes. |
| High | `status` lacks overage/shortage/cancelled/adjusted states. | Add statuses or derive them from exception/variance records. |
| High | Quantity fields mix source and derived values. | Persist only `allocatedQuantity`; derive shipped/received/outstanding from shipment/POD events. |
| High | No allocation approval workflow for under-allocation or client changes. | Add approval/waiver state if under-allocation is allowed after submit. |
| Medium | `batchIds`/`deliveryNoteIds` are denormalized arrays that can become stale. | Use indexes/projections rather than canonical arrays, or define rebuild semantics. |

### Relationship Review

The uniqueness rule `(orderRequestId, orderItemId, salesPointId)` is valid for the active allocation. It will not support allocation revision history unless active allocation identity is separate from immutable revision rows. Add either:

- `allocationId` as logical ID and `allocationRevisionId` for immutable history, or
- append-only `AllocationAdjustment` events.

## ProductionJob

### Current State

`ProductionJob` is a core entity in specs, architecture, page matrix, implementation plan, and testing strategy. It has no dedicated API contract.

### Severity: High

Without a contract, production will be implemented through `OrderItem` fields or ad hoc store types, which weakens production reporting and batch readiness gating.

### Required Fields

- `id`
- `orderRequestId`
- `orderItemId`
- `vendorId`
- `status`
- `orderedQuantity`
- `producedQuantity`
- `qcPassedQuantity`
- `readyQuantity`
- `reworkQuantity`
- `rejectedQuantity`
- `startedAt`
- `qcStartedAt`
- `readyAt`
- `completedAt`
- `assignedUserId`
- `notes`
- `attachments`
- `audit`
- `version`

### Required Relationships

- One `OrderItem` may have one or many `ProductionJob` records depending on vendor/subcontracting model.
- Shipment batch creation should validate against ready quantity projection.

## ShipmentBatch

### Strengths

- Strong batch-level model with source order, vendor, status, destination snapshots, batch items, quantity summary, carrier, audit, and version.
- Batch item links allocation, order item, product snapshot, Sales Point snapshot, shipped and verified quantities.
- Supports multiple Sales Points and products in one batch.
- Supports one active Delivery Note per batch.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| Critical | Shipping labels are not modeled as first-class records. | Add label/package entities and APIs. |
| High | No `CANCELLED`, `VOIDED`, `EXCEPTION`, `FAILED_DELIVERY`, or `RETURNED` batch states. | Add explicit exception/cancellation paths or link to exception records with derived state. |
| High | Dispatch and receipt status transitions do not specify side effects on allocation projections. | Add transition side-effect matrix. |
| High | `deliveryNoteId` implies only one active DN but does not handle regenerated/superseded documents. | Add document versioning or `activeDeliveryNoteId` plus historical IDs. |
| Medium | `destinationSnapshots` duplicates Sales Point data but batch item also has Sales Point snapshot. | Keep both only if `destinationSnapshots` is batch-level grouped view; otherwise derive from items. |
| Medium | Carrier model is too shallow for route tracking/courier integration. | Add `carrierReference`, tracking number, route/checkpoint events when integration begins. |

### Scalability Concern

A single batch with many Sales Points and many items may become too large for detail response and print views. Add:

- paginated batch item endpoints for UI tables,
- dedicated print payload endpoint,
- package/label grouping model.

## DeliveryNote

### Strengths

- Correctly batch-scoped.
- Captures immutable party and destination snapshots.
- Contains item lines sourced from shipment batch items.
- Has QR payload, signature fields, files, summary, audit, and version.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| High | Regeneration is supported by DTO but no version/supersession model exists. | Add `documentVersion`, `supersedesDeliveryNoteId`, `isActive`, `regenerationReason`, `voidedAt`. |
| High | Generated PDF file, signed scan, and corrected version are all represented as files but not via shared file asset. | Add `FileAsset` and file access policy. |
| Medium | `SIGNED` status is ambiguous because signed state can be inferred from upload. | Decide whether `SIGNED` is user-marked, evidence-derived, or removed. |
| Medium | One DN for multi-Sales Point batch may be operationally hard to sign at multiple destinations. | Consider one DN per batch per Sales Point or add destination signature sections. The current docs assume one batch DN can cover many Sales Points. Validate business reality. |

### Multiple Delivery Notes Per Order

Supported through multiple batches. Not supported for multiple DNs per single batch except regenerated/corrected versions. If the business needs one DN per Sales Point within a batch, the current model must change before implementation.

## DeliveryConfirmation

### Strengths

- Properly belongs to batch, DN, and Sales Point.
- Contains receiver details, evidence, item confirmations, claimed and verified quantities, review fields, audit, and version.
- Verification updates received quantity only after Admin review.

### Gaps

| Severity | Issue | Recommendation |
| --- | --- | --- |
| Critical | Resubmission history is not first-class. | Add `DeliveryConfirmationAttempt` or allow immutable confirmation submissions linked by `parentConfirmationId`. |
| Critical | Idempotent verification is stated but not structurally guaranteed. | Add `verificationEventId`, idempotency key, and rule that verified quantities are applied through one append-only event. |
| High | Partial verification is not modeled. | Add item-level review decision or `PARTIALLY_VERIFIED` if some items are accepted and others require correction. |
| High | Overage handling requires Admin decision but no approval/reason structure is defined. | Add overage reason, approvedBy, and exception linkage. |
| Medium | POD evidence lacks geotag, capture source, quality/OCR state. | Add fields before mobile/photo roadmap begins. |

## Relationship Review

### Valid Relationships

- `Client -> Project -> OrderRequest`
- `OrderRequest -> OrderItem`
- `OrderRequest -> SalesPointAllocation`
- `OrderItem -> SalesPointAllocation`
- `SalesPoint -> SalesPointAllocation`
- `SalesPointAllocation -> ShipmentBatchItem`
- `ShipmentBatch -> ShipmentBatchItem`
- `ShipmentBatch -> DeliveryNote`
- `ShipmentBatch/SalesPoint/DeliveryNote -> DeliveryConfirmation`

### Problematic Relationships

| Severity | Relationship | Problem | Recommendation |
| --- | --- | --- | --- |
| High | `SalesPoint -> DeliveryConfirmation` in summary docs | Direct relationship is useful for lookup but not ownership. | Ownership should remain batch/DN; Sales Point is an index/projection. |
| High | `ShipmentBatch 1:1 DeliveryNote` | Active DN can be 1:1, but regenerated/voided history requires 1:N historical relationship. | Use one active DN per batch plus historical document versions. |
| Medium | `OrderRequest -> ProductionJob` | No contract defines whether jobs are per order or per item. | Decide before coding. |
| Medium | `DeliveryNote -> DeliveryConfirmation` | POD may be per Sales Point within a multi-Sales Point DN; relationship must support multiple confirmations. | Current 1:N is valid, but uniqueness/versioning needs refinement. |

## Circular Dependencies

No direct circular ownership is intentionally documented, but derived summaries create effective circular dependencies:

- `OrderRequest.quantitySummary` depends on allocations, batches, confirmations.
- `SalesPoint.operationalSummary` depends on allocations, batches, confirmations.
- `ShipmentBatch.deliveryNoteStatus` depends on DeliveryNote.
- `DeliveryNote.podStatus` in list rows depends on DeliveryConfirmation.
- `DeliveryConfirmation` verification updates batch items and allocation/order projections.

Recommendation: canonical entities must not synchronously own each other's derived totals. Create a query/projection layer with rebuildable indexes.

## Data Duplication

Acceptable duplication:

- Read model rows duplicate names and counts for UI performance.
- Shipment/DN snapshots duplicate master data for historical document integrity.

Risky duplication:

- Quantity summaries on canonical aggregates.
- Status fields duplicated across entity and summary contexts.
- Batch IDs and DN IDs arrays on allocation records.
- Operational summaries on Sales Point master.

Recommendation: classify every duplicated field as one of:

- canonical,
- immutable snapshot,
- rebuildable projection,
- compatibility field.

## Reporting Limitations

Current reporting can answer basic counts and quantities. It cannot reliably answer:

- first-pass POD acceptance rate by vendor,
- SLA breach reasons and paused time,
- variance by cause over time,
- invoice billable quantity vs disputed quantity,
- installation completion by Sales Point,
- ERP sync latency/failure by document,
- production rework rate,
- delivery exception aging by owner,
- duplicate Sales Point cleanup impact.

Required additions:

- event/audit log,
- exception entity,
- SLA target and breach model,
- invoice reconciliation model,
- integration sync records,
- installation verification model,
- read projections for dashboards.

## Support Matrix

| Requirement | Current Model Support | Assessment |
| --- | --- | --- |
| 1,400+ Sales Points | Partial | Possible with normalized stores and virtualization. |
| 10,000+ Sales Points | Weak | Needs server-side-style query/index/projection strategy from day one. |
| Multiple Vendors | Partial | Vendor assignment exists, but no multi-vendor per order/item support. |
| Multiple Clients | Partial | Client references exist, but tenancy/scoping architecture is incomplete. |
| Partial Shipment | Strong | Allocation-to-batch item model supports it. |
| Partial Delivery | Strong basic support | Needs exception/correction/versioning for real operations. |
| Multiple Delivery Notes per Order | Strong via multiple batches | Validate if one batch can cover many Sales Points under one DN. |
| POD Verification | Partial | Needs attempts, idempotency, file policy, partial verification. |
| Installation Verification | Weak | Only extension fields. |
| Invoice Reconciliation | Weak | Only extension fields. |
| ERP Integration | Weak | Only external references/extensions. |

## Final Data Model Recommendations

Before implementation, add or revise:

1. `OperationalException`.
2. `AuditEvent` / `DomainEvent`.
3. `ShippingLabel` and package/label line model.
4. `WorkflowPolicy`.
5. `FileAsset`.
6. `ProductionJob` API contract.
7. `DeliveryConfirmationAttempt` or immutable confirmation versioning.
8. Document versioning for Delivery Notes.
9. Projection/read-model semantics for all summaries.
10. Server-style query/index strategy for Sales Points, allocations, and dashboards.
