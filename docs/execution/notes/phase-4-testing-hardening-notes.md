# Phase 4 - Testing & Hardening: Re-check Notes

Status: Partially implemented. Unit and V2 logistics coverage is useful, but
the Phase 4 release gate is failing.

## Implemented

- P4-01 unit runner setup: Vitest is configured via `vitest.config.ts`, and
  `npm run test:unit` is wired in `package.json`.
- P4-02/P4-03 partial fixtures/helpers: V2 seed builders exist and Playwright
  has local route coverage. Full deterministic small/medium/large fixture
  library and all role storage helpers are not complete.
- P4-04..P4-13 partial unit/store coverage:
  `tests/unit/derivedStatus.test.ts`, `legacyCompat.test.ts`,
  `quantities.test.ts`, and `storeCommands.test.ts` cover status derivation,
  legacy mapping, quantity math, migration idempotency, workflow commands,
  conflicts, and idempotency.
- P4-17/P4-22 partial E2E coverage:
  `tests/v2-logistics.spec.ts` verifies V2 redirects and logistics surfaces.

## Current Validation Results

- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS (5 files / 37 tests).
- `npm test`: FAIL (90 passed / 45 failed).

## Full Playwright Failure Buckets

- Missing local fixture:
  `documents/sample item vendor tracking original.xlsx` is absent, causing
  `bulk-import.spec.ts` workbook parsing failures.
- Bulk import regressions:
  expected grouping order and visible-row/tab assertions no longer match the
  current import UI.
- Legacy prototype text drift:
  tests expect old headings such as `Procurement Dashboard`, `Client Dashboard`,
  `Vendor Dashboard`, `Order Details: OR-2026-816972`, and `Ongoing Order
  Progress`.
- External staging specs:
  `analyze-staging.spec.ts`, `debug-staging.spec.ts`, and
  `e2e-sample-order.spec.ts` target `https://printbridge.staging.obdev.my.id`
  and should be separated from the local release gate or updated with explicit
  staging preconditions.
- Legacy print expectations:
  `delivery-note.spec.ts` expects older campaign/project text on the
  order-scoped print route.
- Role switcher legacy selector:
  `prototype-flows.spec.ts` expects a `CLT` link that is no longer present.

## Not Complete Against Phase 4 Plan

- P4-15 migration parity has partial coverage only; snapshots and byte-identical
  legacy key verification are not complete.
- P4-16 projection parity is not fully covered across dashboards/list rows.
- P4-17 full lifecycle UI E2E is not implemented.
- P4-18/P4-19/P4-20 role-specific vendor/client/permission-negative E2E coverage
  is incomplete.
- P4-21 10k Sales Point scale test is not implemented.
- P4-23 print visual snapshots are not implemented.
- P4-25 existing Playwright suite is not green.

## Next Implementation Order

1. Decide whether staging specs remain in default `npm test`; if not, move them
   behind a separate project/tag.
2. Restore or replace the missing workbook fixture.
3. Update stale legacy specs to current route text and V2 behavior, or retire
   them with documented replacement coverage.
4. Add the full Phase 3 exit demo as a local Playwright E2E.
5. Add permission-negative, projection parity, migration parity, and scale
   tests.
