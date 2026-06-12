# Phase 1 — Foundation Refactor: Migration Notes

Status: Complete. Gate: `npm run build` (tsc + vite) green.

## Implementation Summary

- Contract types implemented verbatim in `src/lib/types/v2/*` (P1-01..P1-08):
  `foundation.ts` (primitives, CommandMetadata, MutationResponse, ApiError family,
  AuthClaims/ActionDecision, pagination/projection), `status.ts` (all lifecycle
  vocabularies per `docs/v2-status-lifecycle.md`), `orderRequest.ts`,
  `salesPoint.ts` (incl. `SalesPointAlias`/`SalesPointMerge`, HI-12),
  `production.ts`, `shipment.ts` (incl. `ShipmentReservation` HI-13,
  `ShippingPackage`/`ShippingLabel` CR-03, snapshot versions MED-02),
  `deliveryNote.ts` (DN versioning HI-07, attempt history + verification events
  CR-06), `exception.ts` (CR-01), `events.ts` (CR-02), `policy.ts` (CR-04),
  `fileAsset.ts` (CR-05), `scope.ts` (CR-08).
- Repository base `src/lib/v2/repository.ts` (P1-09): collection stores over a
  shared local repository, `expectedVersion` conflicts as contract
  `ConflictError`, `idempotencyKey` dedupe replaying the original
  `MutationResponse`, audit/domain event emission on every mutation.
- Append-only event store `src/lib/v2/auditEventStore.ts` (P1-10), key
  `va-trace-v2-events`; event count doubles as the monotonic projection version.
- Module-owned stores (P1-11..P1-16) with one storage key per aggregate group:
  | Store | Key |
  | --- | --- |
  | orderRequestStore | `va-trace-v2-orders` |
  | salesPointStore | `va-trace-v2-salespoints` |
  | allocationStore | `va-trace-v2-allocations` |
  | productionStore | `va-trace-v2-production` |
  | shipmentBatchStore | `va-trace-v2-shipments` (+ `va-trace-v2-shipment-reservations`) |
  | labelStore | `va-trace-v2-labels` |
  | deliveryNoteStore | `va-trace-v2-dns` |
  | podStore | `va-trace-v2-pod` (+ `va-trace-v2-pod-verification-events`) |
  | exceptionStore | `va-trace-v2-exceptions` |
  | policyStore | `va-trace-v2-policies` |
  | fileAssetStore | `va-trace-v2-files` |
- Derived selectors (P1-17/P1-18): `selectors/derivedStatus.ts` (allocation /
  distribution / POD projection / completion rule / deadline state),
  `selectors/quantities.ts` (single quantity-math source), `projections.ts`
  (order/batch hydration — the only sanctioned summary builder, CR-07).
- Legacy adapters (P1-19): `compat/legacyLabels.ts` (V2 -> legacy label,
  `PENDING` -> `PENDING_UPLOAD`, `UPLOADED` -> `SUBMITTED`). `orderStatus.ts`,
  `orderDomain.ts`, `deliveryNote.ts` remain frozen compatibility layers.
- Seeds + migration (P1-20/P1-21): `seed/seedBuilders.ts` builds the full V2
  dataset from legacy mocks/aggregate; `seed/migrate.ts` materializes stores
  idempotently and records `va-trace-v2-migration-manifest` with legacy
  fingerprints; `buildLegacyCompatibilityView()` is the read-only reverse
  migration.
- Rollback: `src/lib/v2/config.ts` (`v2DomainEnabled` flag); deleting
  `va-trace-v2-*` keys restores pure-legacy behavior. `va-trace-orders` is
  never written by any V2 module.

## Status System Refactor

- Legacy `src/lib/types/status.ts` was extended (canonical value subsets +
  normalization helpers) so the legacy embedded aggregate can persist migrated
  POD statuses; legacy literal writes were fixed (`orderDomain.ts` compatibility
  POD `PENDING` -> `DRAFT` + `source: "LEGACY_COMPATIBILITY"`; `orderStore.ts`
  POD upload `UPLOADED` -> `SUBMITTED` with item-level claims).
- Persisted legacy values are normalized on read (`normalizeOrder`), so existing
  user localStorage keeps working.

## Documented Inconsistency Resolutions

1. **PodStatus**: `shared-foundation-api.md` and `v2-status-lifecycle.md` used a
   projection set containing ambiguous `PENDING`; the three entity contracts and
   the Phase 2 removal table mandate `PENDING_UPLOAD`/`SUBMITTED`. Resolution:
   projection union keeps the wide set, replacing `PENDING` with the two precise
   members. `shared-foundation-api.md` amended in place with rationale.
2. **Exception severity**: `OperationalException` uses `LOW/MEDIUM/HIGH/CRITICAL`
   (shared foundation) while entity view models use `INFO/WARNING/CRITICAL`.
   Both retained as distinct types: `ExceptionSeverity` vs `AlertSeverity`.
3. **Enums as unions**: contracts use the TS `enum` keyword; implementation uses
   string-literal unions + `as const` value lists with identical values, to
   preserve assignability with the existing UI's string literals.
4. **CR-09 legacy received quantities**: compatibility batches carry
   `compatibilitySource: "LEGACY_MIGRATION"` and `legacyVerificationFlag`;
   legacy delivered quantities remain received facts (parity with current UI)
   but are flagged as migration-trusted, not POD-verified.

## File Change Summary

New: `src/lib/types/v2/*` (13 files), `src/lib/v2/*` (stores, selectors, seed,
compat, repository, ids, config — 20 files), `docs/execution/notes/*`.
Modified: `src/lib/types/status.ts`, `src/lib/types/logistics.ts`,
`src/lib/orderDomain.ts`, `src/lib/orderStore.ts`,
`docs/api-contracts/shared-foundation-api.md`.
Deleted: none (no legacy file removed; guardrail honored).

## Risk Summary

- Persisted summary fields on V2 entities are caches; UI must read through
  hydration selectors (`projections.ts`). Drift risk mitigated by recompute-on-
  read; parity tests land in Phase 4.
- Vendor scope for store commands travels as `correlationId: "vendor:<id>"` in
  mock auth until the permission layer (P2-03) provides claims end-to-end.
- Lint configuration now exists (`eslint.config.js`) and the current gate is
  green; older notes about ESLint 10 missing flat config are obsolete.

## Validation Summary

- `npx tsc --noEmit`: PASS. `npm run build`: PASS.
- Re-check on 2026-06-11: `npm run build`: PASS; `npm run lint`: PASS;
  `npm run test:unit`: PASS (5 files / 37 tests).
- Existing screens unaffected (no page imports changed in Phase 1).
- Migration idempotency implemented (manifest + fingerprint no-op detection);
  automated parity tests are Phase 4 scope (P4-15).

## Remaining Work

- P1-22 import output adapter is wired in Phase 3 with the workflow layer.
- Phases 2–4 per `docs/execution/*`.
