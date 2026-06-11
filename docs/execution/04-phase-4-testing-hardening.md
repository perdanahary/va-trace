# 04 - Phase 4: Testing & Hardening

Scope: unit, integration (store), E2E, regression tests with acceptance criteria.
Normative source: `docs/implementation/06-testing-strategy.md`. Current toolchain: `npm run build` (tsc + vite), `npm run lint`, `npm test` (Playwright). Unit/store layers introduce Vitest (Vite-native) or pure-TS test modules per the testing strategy.

---

## Batch E0 - Scaffolding (can start parallel with Phase 2)

| Task ID | Title | Description | Depends On |
| --- | --- | --- | --- |
| P4-01 | Unit runner setup | Add Vitest config aligned with Vite aliases (`@/`); wire `npm run test:unit`; CI job | P1-01 |
| P4-02 | Fixture library | Deterministic fixtures from Phase 1 seed builders: small (demo), medium (regression), large (10k Sales Points / HI-09) | P1-20 |
| P4-03 | Playwright state helpers | Per-test localStorage seed/reset helpers; role login helpers for all 5 surfaces | Existing `playwright.config.ts` |

## Batch E1 - Unit Tests (after Phase 1 / per Phase 3 batch)

| Task ID | Target | Tests | Acceptance Criteria |
| --- | --- | --- | --- |
| P4-04 | `OrderRequest` domain | Draft/submit validation; cancel blocks batches/documents; `legacyStatusLabel` never drives V2 calc; completion rule | Invalid submit returns field-level errors; cancelled order cannot create batch; completion only when production `COMPLETED` + distribution `FULLY_RECEIVED` + all allocations received |
| P4-05 | `OrderItem` + Production | Quantity > 0; product resolution; full production transition sequence; ready quantity gates | Invalid transitions rejected; ready quantity cannot exceed ordered |
| P4-06 | `SalesPoint` | Required fields for active use; data quality derivation; snapshot immutability | Duplicate code/WCode rejected; master update never mutates historical DN snapshots |
| P4-07 | `SalesPointAllocation` | Quantity rules; sum <= ordered; under-allocation reason; derived status matrix incl. SHORT/OVER_RECEIVED | Cannot reduce below shipped; cannot delete with shipment dependency; every `AllocationStatus` member reachable in tests |
| P4-08 | `ShipmentBatch` | One order per batch; item <= allocation outstanding; full status transitions incl. FAILED_DELIVERY/RETURNED/VOIDED; reservation conflicts (HI-13) | Dispatch requires items + policy DN/labels; partial flags correct; concurrent reservation conflict raises contract error |
| P4-09 | `DeliveryNote` | One active DN per batch; versioning/supersession (HI-07); void rules | Regenerate increments `documentVersion`, marks predecessor `SUPERSEDED`; second active DN rejected |
| P4-10 | POD verification | Attempt history; idempotent submit (CR-06); item-level decisions; reversal | Duplicate `idempotencyKey` is no-op; reversal restores prior quantities; `VerificationEvent` immutable |
| P4-11 | Quantity math module | Ordered/allocated/shipped/received/outstanding across partial scenarios | Property-style cases: invariants hold for random valid partial sequences |
| P4-12 | Policy + exception engine | Scope resolution (global/client/project/vendor); closure blockers; waiver recording | Most specific scope wins; close blocked with open blocking exception; waiver requires policy + recorded resolution |

## Batch E1b - Store/Integration Tests

| Task ID | Target | Tests | Acceptance Criteria |
| --- | --- | --- | --- |
| P4-13 | Repository base | `expectedVersion` conflicts; `idempotencyKey` dedupe; `MutationResponse` shape | Stale version returns `ConflictError`; every mutation appends >= 1 `AuditEvent` |
| P4-14 | Persistence round-trips | Each V2 store write/read/subscribe cycle; cross-tab event propagation | Snapshot equality after reload; no store writes into another store's key |
| P4-15 | Migration parity (CR-09) | Legacy seed -> migrate -> assert V2 entities, compatibility batches, derived statuses vs snapshots; re-run; reverse migration read-only | Second run is no-op; `va-trace-orders` byte-identical before/after; parity snapshots match |
| P4-16 | Projection parity (CR-07, MED-05) | Derived summaries vs recomputation-from-source for dashboards and list rows | Zero drift across fixture set; rebuild triggers fire on each mutating command type |

## Batch E2 - E2E Tests (Playwright; after Phase 3)

| Task ID | Scenario | Acceptance Criteria |
| --- | --- | --- |
| P4-17 | Admin full lifecycle | The Phase 3 exit demo (order -> allocations -> production -> 2 partial batches -> DN/labels -> POD -> variance exception -> correction -> completion) passes headless; audit tab shows every command |
| P4-18 | Vendor execution surface | Vendor sees only owned orders; workbench production updates; batch creation limited to eligible allocations; POD upload with required evidence count; correction queue round-trip |
| P4-19 | Client visibility | Client order list/progress shows policy-permitted fields only (no vendor names where policy hides); no mutation affordances beyond create/import |
| P4-20 | Permission negatives (CR-08) | Wrong-role direct URL access redirected/blocked; gated buttons disabled with reasons; analyst is read-only |
| P4-21 | Scale | 10k Sales Point fixture: Sales Point list and allocation table render, filter, and scroll under threshold (no frame > 200ms on CI baseline); tagged `@scale`, separate CI job |

## Batch E3 - Regression Tests

| Task ID | Target | Acceptance Criteria |
| --- | --- | --- |
| P4-22 | Legacy route compatibility | Every redirect in the P2-02 table verified; `/admin/orders/:id/delivery-note` and `/vendor/orders/:id/packaging-labels` resolve via batch selector (auto-resolve single batch); `/vendor/update/:id` redirects |
| P4-23 | Print views | DN and packaging label print pages match existing print CSS contract (`@media print`, A4 portrait, chrome classes hidden); visual snapshot per template |
| P4-24 | Legacy data safety | App boots with pre-migration `va-trace-orders` profiles (V1 user upgrade path); no data loss; legacy `PodStatus` values mapped not displayed raw |
| P4-25 | Existing Playwright suite | All pre-existing tests in `tests/` pass unmodified or with documented, reviewed updates only |

## Exit Criteria (Phase 4 / release gate)

- `npm run build`, `npm run lint`, `npm run test:unit`, `npm test` all green in CI.
- P4-15 migration parity and P4-16 projection parity: zero failures.
- All six workflow E2E scenarios pass on all required roles.
- No open Critical/High findings; residual items logged against `docs/remediation/00-master-gap-register.md` backlog.
