# 06 - Implementation Risk Review

## Executive Assessment

The implementation plan is feasible only if the team treats the first build phase as architecture foundation, not UI delivery. The largest risks are data correctness, workflow correction paths, stale derived summaries, authorization leakage, and migration drift between legacy order aggregates and V2 normalized stores.

Severity scale: Critical, High, Medium, Low.

Probability scale: High, Medium, Low.

## Technical Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| Derived state drift | Quantities/statuses are duplicated across orders, allocations, batches, Sales Points, and dashboards. | Critical | High | Store canonical facts only; derive summaries through selectors/projections; add parity tests and rebuild functions. |
| Cross-store circular updates | POD verification updates batch items, allocations, order summaries, dashboards, and notifications. | Critical | High | Implement command handlers with domain events and projection rebuilds; forbid direct UI writes to derived fields. |
| Missing event/audit model | Audit is required everywhere but only `AuditStamp` exists. | Critical | High | Add append-only `AuditEvent` before mutable workflows. |
| File upload complexity | Signed DNs and POD photos are modeled as metadata only. | High | High | Define `FileAsset`, upload validation, preview, retention, and access rules before POD UI. |
| Enum drift | Shared statuses are redefined across contract files. | High | Medium | Centralize shared enums and exhaustive mapping tests. |
| Batch/POD idempotency failure | Duplicate verification could double-count received quantities. | Critical | Medium | Use idempotency keys and verification events; make verification command transactional. |
| High-volume UI slowdown | Sales Point/allocation tables can exceed 10,000 rows. | High | High | Add virtualization, pagination, indexed queries, and performance test fixtures from Phase 1. |
| Print route regressions | Batch selector and batch-scoped print views may break legacy print behavior. | High | Medium | Add route resolver tests and print screenshot tests for one-batch/multi-batch cases. |

## Architecture Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| Exception handling is not modeled | Exceptions drive status, dashboard, and closure, but no entity exists. | Critical | High | Add `OperationalException` contract and workflow before implementing closure or dashboards. |
| Shipping labels are under-modeled | UI requires label lifecycle but API only has IDs/status. | Critical | High | Add label/package contract and commands before label print migration. |
| Policy rules hardcoded in UI | "When configured" rules appear throughout docs without policy source. | High | High | Add scoped workflow policy model and inject into command validation. |
| Authorization is UI-first | Permission matrix exists, but server/repository enforcement is not fully specified. | High | Medium | Add route, query, and command authorization tests; enforce scope in repository layer. |
| Production ownership ambiguity | `ProductionJob` is documented but lacks API contract. | High | Medium | Create production contract or explicitly keep production under Order API. |
| Future integration mismatch | ERP/SAP/Coupa is extension-only. | Medium | High | Add integration sync records before any external integration work. |
| DN-per-batch assumption may be wrong | Multi-Sales Point batches may require per-destination signature docs. | High | Medium | Validate business process before print implementation; adjust DN cardinality if needed. |

## Migration Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| Legacy delivered quantity ambiguity | Existing `deliveredQuantity` may mean shipped, received, or displayed progress. | Critical | High | Use compatibility batches with explicit audit flags; avoid treating unverified legacy data as verified unless policy approves. |
| Dual-write divergence | Legacy and V2 stores may drift during transition. | Critical | Medium | Avoid independent dual writers; after each command run parity checks in tests; keep V1 key untouched. |
| ID mapping breaks routes | Old `OR-*` IDs and new internal IDs can break bookmarks/tests. | High | Medium | Preserve display numbers and route resolver mapping. |
| Duplicate Sales Points | Import and seed data may map WCode/name inconsistently. | High | High | Add uniqueness validation, alias/merge workflow, and low-confidence match review. |
| Rollback data loss | V2 may represent multiple batches/partial deliveries that V1 cannot. | High | Medium | Preserve V2 snapshots; use read-only compatibility mode when reverse migration would lose data. |
| Incomplete migration tests | Seed scenarios are good but not scale-heavy. | Medium | High | Add 10,000 Sales Point synthetic dataset and high-allocation migration parity tests. |

## UX Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| Users confuse production completion with order completion | Docs separate statuses, but UI must reinforce it. | High | Medium | Always display production status, distribution status, and received progress together. |
| Batch selector friction | Users expecting one DN per order may be blocked by selector. | Medium | High | Auto-open when exactly one batch exists; educate through clear DN table and labels. |
| Dense tables become unusable on mobile | Operational tables have many columns. | Medium | High | Use horizontal scroll, sticky key columns where practical, compact filters, and no oversized cards. |
| Missing exception screen | Dashboard references exception queue but no detail workflow. | High | High | Add exception queue/detail before dashboard exception cards go live. |
| Vendor correction workflow unclear | Rejected POD needs clear next action and reason. | High | Medium | Add Vendor POD correction queue and attempt history UI. |
| Client visibility inconsistent | Client "where exposed" is policy-dependent but not defined. | Medium | Medium | Add exposure policy and client-specific acceptance tests. |

## Data Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| Quantity corruption | Allocation, shipment, received, overage, and variance calculations can disagree. | Critical | High | Centralize quantity math; add unit tests for every edge case and projection parity checks. |
| POD evidence mismatch | Uploaded signed DN may not match batch/DN. | High | Medium | Add DN number validation/OCR-ready metadata and Admin verification checks. |
| Master data changes alter history | Sales Point/product edits could mutate documents if snapshots are not immutable. | High | Medium | Snapshot at batch/DN generation with source version; never mutate historical snapshots. |
| Overages lack reconciliation path | Verified received can exceed shipped with Admin reason, but invoice/inventory impact is undefined. | High | Medium | Link overage to exception/reconciliation records. |
| Missing address/contact policy | Warnings vs blockers are configurable but no policy exists. | Medium | High | Implement policy-driven validation and visible disabled reasons. |
| Reporting totals inconsistent | Dashboard summaries may not match drill-down rows. | High | Medium | Build summaries from same query/projection layer as list rows. |

## Testing Risks

| Risk | Description | Severity | Probability | Mitigation Plan |
| --- | --- | --- | --- | --- |
| E2E-only testing is too slow and shallow | Current stack relies on build/lint/Playwright; domain math needs unit tests. | High | High | Add unit/store test runner or lightweight TS test modules for pure selectors and commands. |
| Permission gaps missed | UI hiding can pass tests while commands remain unsafe. | Critical | Medium | Add direct command/route permission tests for every role and wrong-scope entity. |
| Print layout unverified | DN/labels rely on A4/label print CSS. | Medium | Medium | Add screenshot/PDF checks for print routes. |
| Migration parity untested at scale | Small seed scenarios may pass while 10,000 Sales Points fail. | High | High | Generate large fixtures and run migration/performance checks in CI or nightly. |
| Correction workflows not tested | Happy paths are well covered; reversals/resubmissions are not. | High | High | Add tests for rejection, correction, re-verification, overage, reopen, and rollback. |
| Dashboard tests may mask stale projections | Metrics can appear correct for seeds but drift after commands. | Medium | Medium | After every workflow test, compare aggregate summaries to raw entity totals. |

## Highest Priority Mitigations

1. Add event/audit, exception, label, policy, and file contracts before coding workflows.
2. Centralize shared enums and quantity/status selectors.
3. Define command side effects and idempotency for batch creation and POD verification.
4. Treat summaries as projections with rebuild/parity tests.
5. Add unit/store testing before UI work.
6. Move high-volume table performance into Phase 1.
7. Freeze route constants and permission view models.
8. Add migration fixtures for partials, multi-batch, rejected POD, compatibility data, and 10,000 Sales Points.
