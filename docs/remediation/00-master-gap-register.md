# Master Gap Register

Status: Remediated for development readiness

This register consolidates findings from architecture, data model, workflow, UI, API, implementation risk, and readiness reviews. Duplicate findings are merged into a single gap with affected documents, impacted entities, impacted workflows, and remediation disposition.

## Severity Definitions

| Severity | Definition |
| --- | --- |
| Critical | Blocks safe implementation because source-of-truth, auditability, authorization, or quantity correctness would be unreliable. |
| High | Blocks broad product workflow implementation or future backend readiness if left unresolved. |
| Medium | Does not block the first build after remediation, but must be planned or tested to prevent rework. |
| Low | Terminology, route hygiene, or documentation cleanup issue with limited implementation risk. |

## Critical Issues

| ID | Consolidated issue | Affected documents | Impacted entities | Impacted workflows | Remediation applied |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Missing first-class exception management model and lifecycle. | `docs/v2-domain-model.md`, `docs/v2-status-lifecycle.md`, `docs/specs/*`, `docs/api-contracts/shared-foundation-api.md`, `docs/ui-architecture-v2.md`, `docs/screen-inventory-v2.md`, `docs/page-entity-matrix.md`, `docs/implementation/06-testing-strategy.md` | `OperationalException`, `OrderRequest`, `SalesPointAllocation`, `ShipmentBatch`, `DeliveryConfirmation`, `SalesPoint` | Quantity variance, missing address/contact, rejected POD, failed delivery, cancellation, close blockers, SLA escalation | Added `OperationalException` aggregate, statuses, commands, route/screen ownership, closure blocker rules, and tests. |
| CR-02 | Missing append-only audit/domain event subsystem. | `docs/v2-domain-model.md`, `docs/v2-status-lifecycle.md`, `docs/specs/*`, `docs/api-contracts/shared-foundation-api.md`, `docs/implementation/*` | `AuditEvent`, `DomainEvent`, all mutable aggregates | Creation, correction, reversal, POD verification, DN regeneration, label print, integration retry, invoice reconciliation | Added event contract, mutation response event IDs, side-effect rules, and projection rebuild requirements. |
| CR-03 | Shipping label/package lifecycle under-modeled. | `docs/v2-domain-model.md`, `docs/specs/03-shipment-batch-spec.md`, `docs/specs/04-delivery-note-spec.md`, `docs/api-contracts/shipment-batch-api.md`, `docs/api-contracts/shared-foundation-api.md`, `docs/screen-inventory-v2.md`, `docs/page-entity-matrix.md`, `docs/ui-migration-plan.md` | `ShippingLabel`, `ShippingPackage`, `ShipmentBatch`, `ShipmentBatchItem`, `DeliveryNote` | Generate, print, reprint, void, regenerate, QR scan, package reconciliation | Added label/package contracts, states, commands, UI label register, print events, and void/regeneration rules. |
| CR-04 | Policy/configuration source missing for conditional validation. | `docs/v2-domain-model.md`, `docs/specs/10-role-permission-spec.md`, `docs/api-contracts/shared-foundation-api.md`, `docs/implementation/02-state-management-refactor.md`, `docs/implementation/06-testing-strategy.md` | `WorkflowPolicy`, `Client`, `Project`, `Vendor`, `User`, all commands | PO requirement, POD evidence, address/contact blockers, overage rules, exposure rules, SLAs, readiness gating | Added scoped `WorkflowPolicy` contract and command validation rules. |
| CR-05 | File/evidence lifecycle missing for POD, signed DN, labels, and generated documents. | `docs/v2-domain-model.md`, `docs/specs/04-delivery-note-spec.md`, `docs/specs/06-pod-verification-spec.md`, `docs/api-contracts/delivery-note-api.md`, `docs/api-contracts/shared-foundation-api.md` | `FileAsset`, `DeliveryNote`, `DeliveryConfirmation`, `DeliveryConfirmationAttempt`, `ShippingLabel` | Upload, preview, validation, retention, access control, evidence quality review | Added `FileAsset` contract, upload lifecycle, scan/quality status, access policy, and evidence linkage. |
| CR-06 | POD verification idempotency and resubmission history not structurally guaranteed. | `docs/specs/06-pod-verification-spec.md`, `docs/api-contracts/delivery-note-api.md`, `docs/api-contracts/shared-foundation-api.md`, `docs/implementation/06-testing-strategy.md` | `DeliveryConfirmation`, `DeliveryConfirmationAttempt`, `VerificationEvent`, `ShipmentBatchItem`, `SalesPointAllocation` | Submit, resubmit, reject, partial verify, reverse verification, apply received quantity | Added attempt history, item-level decisions, idempotency keys, immutable verification event, reversal command, and parity tests. |
| CR-07 | Derived state drift and cross-store circular updates. | `docs/v2-domain-model.md`, `docs/api-contracts/*`, `docs/implementation/01-domain-model-refactor.md`, `docs/implementation/02-state-management-refactor.md`, `docs/implementation/06-testing-strategy.md`, `docs/ui-architecture-v2.md` | All aggregates with summaries/statuses | Batch creation, POD verification, dashboards, exports, migration parity | Marked summaries/statuses as read projections, added source inputs, rebuild triggers, stale markers, and parity tests. |
| CR-08 | Command-level authorization and tenant/scope enforcement under-specified. | `docs/specs/10-role-permission-spec.md`, `docs/api-contracts/shared-foundation-api.md`, `docs/page-entity-matrix.md`, `docs/implementation/03-routing-refactor.md`, `docs/implementation/06-testing-strategy.md` | `AuthorizationScope`, `User`, `Client`, `Vendor`, `Project`, all aggregates | Query scoping, command enforcement, wrong-client/vendor access, client data exposure | Added server-enforceable scope model, permission decisions with disabled reasons, and negative permission tests. |
| CR-09 | Legacy migration can corrupt shipped/received meaning. | `docs/implementation/05-data-migration.md`, `docs/ui-migration-plan.md`, `docs/implementation/06-testing-strategy.md` | Legacy order, compatibility batch, compatibility DN, audit events | V1 to V2 migration, print route compatibility, rollback | Added compatibility batch semantics, legacy verification flags, parity fixtures, and read-only reverse migration rule. |

## High Issues

| ID | Consolidated issue | Affected documents | Impacted entities | Impacted workflows | Remediation applied |
| --- | --- | --- | --- | --- | --- |
| HI-01 | `ProductionJob` lacks API contract and readiness-gating rules. | `docs/specs/02-production-management-spec.md`, `docs/api-contracts/production-job-api.md`, `docs/page-entity-matrix.md`, `docs/screen-inventory-v2.md` | `ProductionJob`, `OrderItem`, `ShipmentBatchItem` | Accept, progress, QC, ready quantity, batch eligibility | Added production contract, route/screen priority, readiness allocation rule, and side effects. |
| HI-02 | Integration architecture under-modeled. | `docs/api-contracts/shared-foundation-api.md`, `docs/specs/08-dashboard-reporting-spec.md`, `docs/v2-domain-model.md` | `IntegrationSyncRecord`, `ExternalReference`, `AuditEvent` | ERP import/export, webhook/outbox, retries, conflicts | Added integration record, idempotency, conflict states, and dashboard/reporting hooks. |
| HI-03 | Invoice reconciliation extension is not structurally supported. | `docs/api-contracts/shared-foundation-api.md`, `docs/v2-domain-model.md`, `docs/specs/08-dashboard-reporting-spec.md` | `Invoice`, `InvoiceLine`, `ReconciliationRun`, `OperationalException` | Billable quantity calculation, variance, overage/shortage disputes | Added future-ready invoice contracts and Phase 1 attachment points without making billing part of core implementation. |
| HI-04 | Installation verification is optional text, not a workflow. | `docs/api-contracts/shared-foundation-api.md`, `docs/v2-domain-model.md`, `docs/specs/06-pod-verification-spec.md` | `InstallationJob`, `InstallationConfirmation`, `SalesPointAllocation` | Post-delivery installation evidence, client visibility, installer/vendor execution | Added installation lifecycle and explicit future-phase boundary with current references. |
| HI-05 | Multi-client/vendor tenancy and ownership boundaries insufficient. | `docs/specs/10-role-permission-spec.md`, `docs/api-contracts/shared-foundation-api.md`, `docs/page-entity-matrix.md` | `Client`, `Project`, `Vendor`, `User`, all role-scoped rows | Client portal, vendor work queues, analyst exports | Added ownership rules, claims, query filters, and field exposure policy. |
| HI-06 | Lifecycle transition matrices incomplete for cancellation, reversal, correction, return, failed delivery, and reopen. | `docs/v2-status-lifecycle.md`, `docs/specs/01-order-management-spec.md`, `docs/specs/03-shipment-batch-spec.md`, `docs/specs/04-delivery-note-spec.md`, `docs/specs/05-sales-point-allocation-spec.md`, `docs/specs/06-pod-verification-spec.md` | `OrderRequest`, `SalesPointAllocation`, `ShipmentBatch`, `DeliveryNote`, `DeliveryConfirmation`, `OperationalException` | Cancel, void, regenerate, return, failed delivery, reopen, overage approval | Added expanded statuses, transition guards, side effects, and audit requirements. |
| HI-07 | DN versioning/supersession absent. | `docs/specs/04-delivery-note-spec.md`, `docs/api-contracts/delivery-note-api.md`, `docs/ui-migration-plan.md` | `DeliveryNote`, `FileAsset`, `AuditEvent` | Generate, print, regenerate, void, upload signed DN, print route resolution | Added `documentVersion`, `isActive`, `supersedesDeliveryNoteId`, regeneration reason, and void rules. |
| HI-08 | Shared enums, API errors, mutation response, and idempotency conventions absent. | `docs/api-contracts/shared-foundation-api.md`, `docs/api-contracts/*` | All DTOs and command responses | Forms, optimistic updates, conflicts, retries | Added shared contract module and referenced it from entity contracts. |
| HI-09 | Query/projection and 10,000+ Sales Point scale assumptions insufficient. | `docs/ui-architecture-v2.md`, `docs/api-contracts/*`, `docs/implementation/02-state-management-refactor.md`, `docs/implementation/06-testing-strategy.md`, `docs/specs/07-master-data-spec.md` | `ReadProjection`, `SalesPoint`, `SalesPointAllocation`, dashboards | Search, filter, sort, tables, exports, migration | Added cursor-compatible query rules, indexed filters, virtualized tables in Phase 1, and large fixtures. |
| HI-10 | Route and navigation inconsistencies across Admin logistics routes, Client orders, Operator/Analyst. | `docs/ui-architecture-v2.md`, `docs/screen-inventory-v2.md`, `docs/ui-migration-plan.md`, `docs/implementation/03-routing-refactor.md` | Routes, sidebar, compatibility routes | Navigation, bookmarks, role visibility | Froze canonical route constants and redirect table. |
| HI-11 | Missing screens for exceptions, labels, production, client order list, and vendor POD correction queue. | `docs/screen-inventory-v2.md`, `docs/low-fidelity-wireframes-v2.md`, `docs/page-entity-matrix.md`, `docs/ui-architecture-v2.md` | UI view models for affected entities | Admin triage, Vendor correction, Client tracking, production execution | Added required screens/actions/columns/filters and phase priority. |
| HI-12 | Sales Point alias/merge/remap workflow missing. | `docs/specs/07-master-data-spec.md`, `docs/api-contracts/sales-point-api.md`, `docs/screen-inventory-v2.md`, `docs/implementation/05-data-migration.md` | `SalesPoint`, `SalesPointAlias`, `SalesPointMerge`, allocations, historical snapshots | Imports, duplicate cleanup, active dependency preservation | Added alias/merge commands, audit, and migration matching rules. |
| HI-13 | Batch eligibility/concurrency under-specified. | `docs/specs/02-production-management-spec.md`, `docs/specs/03-shipment-batch-spec.md`, `docs/api-contracts/shipment-batch-api.md` | `ProductionJob`, `SalesPointAllocation`, `ShipmentBatch`, `ShipmentReservation` | Create batch, reserve quantity, dispatch, concurrent edits | Added expected versions, readiness pool rule, reservation semantics, and conflict errors. |
| HI-14 | Testing strategy lacks unit/store/domain tests and scale fixtures. | `docs/implementation/06-testing-strategy.md`, `docs/ui-migration-plan.md` | Selectors, commands, route guards, print views | Quantity math, permissions, correction, migration, performance | Added test layers, fixtures, acceptance gates, and readiness thresholds. |

## Medium Issues

| ID | Consolidated issue | Remediation disposition |
| --- | --- | --- |
| MED-01 | Multi-order physical route consolidation is deferred. | Reserved future `ShipmentManifest`/`RouteManifest` boundary in domain and shipment docs; Phase 1 remains one-order batch scoped. |
| MED-02 | Destination snapshot versioning needed. | Added snapshot version, captured-at/source-version fields to batch/DN/label addenda. |
| MED-03 | Notification delivery not linked to events. | Updated notification spec to make notifications event-derived with recipient policy. |
| MED-04 | SLA model shallow. | Added `SlaPolicy`/breach concepts under workflow policy and dashboard reporting. |
| MED-05 | Dashboard summaries can be expensive. | Added projection and include-summary rules; summary parity tests required. |
| MED-06 | Evidence quality, geotag, and OCR are future. | Added `FileAsset` quality/scan fields and future mobile capture hooks. |
| MED-07 | Import validation details need more UI depth. | Added import issue workspace requirements and row-level candidate matching. |
| MED-08 | Mobile dense tables need careful treatment. | Added compact filters, horizontal scroll, sticky columns, and virtualized high-volume tables. |

## Low Issues

| ID | Consolidated issue | Remediation disposition |
| --- | --- | --- |
| LOW-01 | Supplier/Vendor terminology mixed. | Canonical term is `Vendor`; Supplier remains migration alias only. |
| LOW-02 | Route names and action targets risk duplication. | Canonical route constants are defined; API/read models return IDs and route intents instead of raw path strings where future backend matters. |
| LOW-03 | Delivery Note `SIGNED` status ambiguous. | Retained as offline/manual state only; upload/review status is driven by POD and file evidence. |

## Residual Medium/Low Backlog

The remaining issues do not block development after remediation:

- Validate DN cardinality during implementation discovery: Phase 1 assumes one active DN per batch with per-destination POD attempts. If the business requires one DN per Sales Point, change DN generation before print UI implementation.
- Defer multi-order route consolidation until route/courier optimization is explicitly funded.
- Defer invoice reconciliation, installation execution, and ERP connectors as workflows, while retaining first-class attachment points and identifiers.

