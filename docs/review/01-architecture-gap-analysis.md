# 01 - Architecture Gap Analysis

## Review Scope

Reviewed project documentation:

- `AGENTS.md`
- `docs/specs/*`
- `docs/api-contracts/*`
- `docs/implementation/*`
- `docs/ui-architecture-v2.md`
- `docs/screen-inventory-v2.md`
- `docs/page-entity-matrix.md`
- `docs/low-fidelity-wireframes-v2.md`
- `docs/ui-migration-plan.md`
- Supporting V2 summary docs in `docs/v2-*`

Perspective: Principal Solution Architect, Staff Frontend Engineer, Staff Backend Engineer, Product Manager, and QA Lead.

## Executive Assessment

The V2 architecture makes the correct strategic move: separate demand (`OrderRequest`), manufacturing (`ProductionJob`), planned destination quantity (`SalesPointAllocation`), physical movement (`ShipmentBatch`), logistics documents (`DeliveryNote` and labels), and receipt verification (`DeliveryConfirmation`/POD).

However, the system is not implementation-ready for a future backend or 10,000+ Sales Points without closing several structural gaps. The current documents still treat some hard problems as derived UI concerns instead of durable domain capabilities: exception management, audit/event history, policy configuration, shipping labels, invoice reconciliation, installation verification, and integration sync. These are repeatedly referenced but not modeled as first-class subsystems.

## Architectural Strengths

- Demand and logistics are explicitly separated. Orders no longer own shipped or received truth.
- `SalesPointAllocation` is correctly introduced as the distribution planning bridge.
- `ShipmentBatch` is correctly defined as the source of truth for shipped quantities, Delivery Notes, labels, dispatch, and POD attachment.
- Partial shipment and partial delivery are explicitly recognized across specs, UI, API, and migration.
- The UI architecture preserves the existing React/shadcn/Tailwind system and avoids unnecessary component-system churn.
- The implementation plan proposes normalized stores, API-shaped DTO boundaries, optimistic concurrency, and compatibility routes.
- Role ownership is directionally correct: Vendor executes, Admin verifies, Analyst reads, Client sees scoped/exposed data.

## Critical And High Severity Gaps

| Severity | Issue | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Critical | No first-class `Exception` or issue-management entity. | Specs mention exceptions across allocation, shipment, POD, dashboard, notifications, and closure, but only model `ExceptionState`/summary strings. | Quantity variance, missing address, rejected POD, failed delivery, cancellation, and correction workflows will be untraceable and inconsistently resolved. | Add `OperationalException` with type, severity, owner, source entity, affected line/entity IDs, status, resolution, audit, SLA fields, and links to notifications. |
| Critical | No durable event/audit subsystem. | Every spec requires audit events; API contracts mostly expose `AuditStamp`, not append-only event contracts. | Reversals, POD corrections, Admin overrides, integration retries, and invoice reconciliation cannot be forensically reconstructed. | Define `AuditEvent`/`DomainEvent` contract and event writers for all commands before implementation. Treat `AuditStamp` as metadata only. |
| Critical | Shipping Label is referenced as an entity but lacks a complete contract. | Page/entity matrix and UI docs include Shipping Label; API only has `labelIds` and `ShippingLabelStatus`. | Label printing, package counts, reprints, voids, QR payloads, and package-level tracking will be ad hoc. | Add `ShippingLabel`, `ShippingLabelItem` or package model, QR payload, print events, void/reprint status, package count, and label list/detail DTOs. |
| Critical | Policy/configuration model is missing. | Docs repeatedly say "when configured", "where exposed", "client policy", "readiness gating", "signed DN policy", and "Admin waiver". | Rules will be hardcoded in UI/store commands and impossible to vary by client/vendor/project. | Add `WorkflowPolicy` or scoped policy config for client/vendor/project: PO required, POD evidence required, photos required, address/contact blocking, readiness gating, overage rules, exposure rules, SLAs. |
| High | Integration architecture is under-modeled. | SAP/Coupa/ERP appears in roadmap and extension fields only. | Future ERP integration will require idempotency, external IDs, sync attempts, conflict resolution, and source-of-truth rules that are absent. | Add `IntegrationSyncRecord`, external reference normalization, idempotency keys, retry/conflict states, and inbound/outbound event contracts. |
| High | Invoice reconciliation is only an extension field. | Requirements include future invoice reconciliation; docs only expose optional extension flags/status. | Billing against shipped, verified, damaged, overage, and disputed quantities will need explicit invoice line linkage. | Add `Invoice`, `InvoiceLine`, `ReconciliationRun`, billable quantity rules, variance/dispute reasons, and source links to verified delivery/exception outcomes. |
| High | Installation verification is optional text, not a workflow. | `InstallationConfirmation` is marked future; extension fields exist but no lifecycle or ownership. | Delivery and installation will be conflated, especially for POSM where received does not mean installed. | Add `InstallationJob`/`InstallationConfirmation` with required Sales Points, evidence, verification state, installer/vendor ownership, and relation to allocation or shipment item. |
| High | Multi-client tenancy and ownership are described but not architected. | Role docs scope Client and Vendor, but no tenant boundary, data partition strategy, or scoped identifiers are defined. | Vendor/client leakage risk, weak future backend authorization, and difficult API query scoping. | Define tenant/scope model: client ownership, vendor assignment, user scope, role grants, field exposure, and server-side authorization rules per command/query. |
| High | Derived summaries are stored on aggregates without rebuild semantics. | `OrderRequest`, `SalesPoint`, and `ShipmentBatch` include summaries while docs also say values are derived. | Cached totals will drift across local stores, future APIs, and migrations. | Treat summaries as read projections with documented source inputs, rebuild triggers, stale markers, and parity tests. Do not let UI write them. |
| High | Lifecycle transition tables are incomplete for correction/reversal paths. | Main paths exist; Admin corrections, reopen, cancellation after partial shipment, POD re-verification, and overage approval are under-specified. | Edge cases become one-off patches and may corrupt quantities. | Add transition matrices with actor, preconditions, side effects, audit events, and compensating updates for each entity. |

## Medium And Low Severity Gaps

| Severity | Issue | Risk | Recommendation |
| --- | --- | --- | --- |
| Medium | `ProductionJob` is conceptually defined but no API contract is provided. | Production readiness, item progress, QC, and SLA calculations are split between `OrderItem` fields and planned store docs. | Add production API contract or explicitly fold production into `OrderRequest` with command boundaries. |
| Medium | Batch model forbids multi-order shipment consolidation except as future extension. | Real logistics may consolidate routes by region/vendor. | Keep one-order batches for Phase 1, but reserve `ShipmentManifest` or `RouteManifest` for multi-order physical trips. |
| Medium | Destination snapshots are duplicated across batch and DN without snapshot versioning. | Regeneration and correction may not know which snapshot generated which document. | Add `snapshotVersion`, `capturedAt`, `capturedFromEntityVersion`, and regeneration reason. |
| Medium | Master data duplicate/merge workflow is only mentioned. | Sales Point imports at 10,000+ scale will produce duplicates and aliases. | Add Sales Point alias/merge/remap workflow with audit and historical preservation. |
| Medium | Notifications are specified but not connected to command/event architecture. | Notification spam, missed task resolution, and inconsistent recipient scoping. | Drive notifications from domain events and workflow policies, not direct UI actions. |
| Medium | SLA and deadline model is shallow. | Reports require production, dispatch, POD, and closure SLA but only deadline/date fields exist. | Add SLA policy, target timestamps, breach states, pause/reason handling, and escalation hooks. |
| Medium | No explicit attachment/file storage contract. | POD photos, signed DNs, generated PDFs, and labels need storage provider abstraction and retention policy. | Add `FileAsset` contract, upload lifecycle, virus/quality checks, preview metadata, and access permissions. |
| Medium | No explicit search/index strategy. | 10,000+ Sales Points and allocation-heavy orders will exceed naive client-side filtering. | Define server-side pagination/filter/sort contract and local virtualization/index fallback. |
| Low | Terminology still mixes Supplier and Vendor. | User confusion and mapping bugs. | Decide final label in UI and aliases in data migration; prefer Vendor for execution partner. |
| Low | Route naming conflicts between `/admin/logistics/*` and `/admin/shipments`. | Duplicate route implementation risk. | Freeze canonical route constants and redirects before coding. |

## Missing Entities

Required before safe implementation:

- `OperationalException`
- `AuditEvent` / `DomainEvent`
- `ShippingLabel`
- `WorkflowPolicy`
- `FileAsset`
- `IntegrationSyncRecord`

Required before future scope:

- `InstallationJob` / `InstallationConfirmation`
- `Invoice` / `InvoiceLine` / `ReconciliationRun`
- `ShipmentManifest` or `RouteManifest` for consolidated logistics
- `SalesPointAlias` / `SalesPointMerge`
- `SlaPolicy` / `SlaBreach`
- `Notification` as event-derived task/message, if current `Message` is insufficient

## Missing Workflows

| Severity | Workflow | Gap |
| --- | --- | --- |
| Critical | Exception lifecycle | No create/assign/resolve/reopen/escalate flow. |
| Critical | Admin quantity correction | Mentioned but not formally modeled with correction source and side effects. |
| High | POD correction versioning | Resubmissions exist conceptually, but current contract permits only active uniqueness without explicit attempt history. |
| High | Shipping label regeneration/void/reprint | Labels are printed, but no durable lifecycle exists. |
| High | Sales Point duplicate merge/remap | Import matching exists; post-import duplicate governance does not. |
| High | Invoice reconciliation | Future requirement not structurally supported. |
| Medium | Installation verification | Future requirement not structurally supported. |
| Medium | Integration retry/conflict resolution | Extension status exists but not a workflow. |
| Medium | Batch closure with unresolved variance | Closure says exceptions must resolve, but exception object does not exist. |
| Medium | Client approval/amendment | Mentioned as future; no current architecture for order amendments after shipment. |

## Missing States

- Shipment batch: `CANCELLED`, `VOIDED`, `EXCEPTION`, `RETURNED`, `FAILED_DELIVERY`.
- Delivery Note: `VOIDED`, `REGENERATED`, `SUPERSEDED`.
- Shipping Label: no full state model exists.
- Delivery Confirmation/POD: `RESUBMITTED`, `SUPERSEDED`, `WITHDRAWN`, `PARTIALLY_VERIFIED`.
- Allocation: `OVER_RECEIVED`, `SHORT_RECEIVED`, `CANCELLED`, `ADJUSTED`.
- Exception: no state model exists.
- Integration: `PENDING`, `RETRYING`, `PARTIAL_SUCCESS`, `IGNORED`, `MANUAL_ACTION_REQUIRED`.
- Invoice reconciliation: no state model exists.
- Installation: no state model exists.

## Redundant Or Duplicated Concepts

| Issue | Recommendation |
| --- | --- |
| `PodStatus` is duplicated across order, batch, DN, and Sales Point contracts, and one contract includes `NOT_REQUIRED` while others do not. | Centralize shared enums or explicitly define context-specific enums with mapping rules. |
| `SalesPointAllocation` is defined in both Order and Sales Point APIs with slightly different shape. | Define one canonical allocation contract and separate list-row projections per context. |
| `DeliveryConfirmationStatus` and `PodStatus` overlap. | Use `DeliveryConfirmationStatus` for review lifecycle and derive `PodStatus` for dashboard/list summaries. |
| Distribution and allocation statuses overlap. | Keep both only if order-level distribution status is aggregate-derived and allocation status is row-derived. Document derivation priority. |
| Client/Project/Vendor references repeat in many list rows. | Accept this for read models, but keep canonical ownership in master/reference entities. |

## Over-Engineering

| Severity | Area | Concern | Recommendation |
| --- | --- | --- | --- |
| Medium | Extension fields on every aggregate | Extensions are broad but not executable; they create false readiness for invoice, installation, vendor scorecard, and ERP. | Replace vague extensions with reserved nullable references or defer until concrete contracts exist. |
| Medium | Too many dashboard summaries before query engine exists | Many summary fields can drift if implemented locally without projections. | Build a projection/query layer first; expose only summaries required by active screens. |
| Low | Production status on both order and item without `ProductionJob` contract | Risk of duplicated production truth. | Either commit to `ProductionJob` as source or state item fields are denormalized projection. |

## Under-Engineering

| Severity | Area | Concern | Recommendation |
| --- | --- | --- | --- |
| Critical | Audit/events | `AuditStamp` is not enough for regulated operational corrections. | Add append-only audit events before mutable workflows. |
| Critical | File/evidence handling | POD and signed DN workflows depend on files, but upload lifecycle is not specified. | Add file asset, upload, preview, access, retention, and deletion policy. |
| High | Authorization | Permission matrix is UI-oriented. | Define command/query authorization contract and server-enforceable scopes. |
| High | Scale | 10,000+ Sales Points requires server-side query assumptions and virtualized UI from Phase 1. | Treat pagination, filters, and virtualization as foundation. |
| High | Exception management | Exceptions drive closure/completion but are not modeled. | Add operational exception subsystem. |
| Medium | Test data | Seed scenarios are good but too small for scale/performance. | Add synthetic 10,000 Sales Point and high-allocation datasets. |

## Scalability Review

The current architecture can support 1,400+ Sales Points if selectors are normalized and tables are virtualized. It is not yet ready for 10,000+ Sales Points because:

- Query contracts include pagination but not cursor strategy, server-side filtering guarantees, or multi-column index expectations.
- UI places high-volume allocation virtualization in later phases.
- Sales Point operational summaries are on the aggregate but rebuild/invalidation is undefined.
- Import matching and duplicate detection are under-specified.
- Dashboard metrics require aggregation over orders, allocations, batches, POD, and exceptions, but no projection model exists.

Recommendation: add a `ReadProjection` architecture section before implementation. Define list/read endpoints as projections optimized for TanStack Table, not raw aggregate joins in React.

## Final Architecture Recommendation

Do not begin full implementation yet. Begin only a narrow foundation phase that freezes:

1. Canonical entities and shared enums.
2. Event/audit model.
3. Exception model.
4. Shipping label model.
5. Workflow policy model.
6. Query/projection and authorization strategy.

After those are documented, the current V2 plan becomes a strong basis for incremental implementation.
