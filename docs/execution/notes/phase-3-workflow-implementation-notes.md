# Phase 3 - Workflow Implementation: Re-check Notes

Status: Store/workflow backend is substantially implemented; Phase 3 is not
complete because UI wiring and a few workflow commands are partial.

## Implemented

- Workflow foundation: `src/lib/v2/workflows.ts` composes store-scoped commands
  without cross-store writes and uses `expectedVersion` and `idempotencyKey`
  through `CommandMetadata`.
- Order Request store commands exist:
  `createOrderRequestDraft`, `submitOrderRequest`, `amendOrderRequest`,
  `cancelOrderRequest`, and `acceptOrderRequest`.
- Sales Point allocation commands exist:
  `createAllocations`, `adjustAllocation`, `cancelAllocation`, and exception
  state updates.
- Production commands exist:
  `createProductionJobs`, `acceptProductionJob`, `updateProductionProgress`,
  `markProductionReady`, `cancelProductionJob`, `reopenProductionJob`, and
  reservation adjustment.
- Shipment batch commands exist:
  `createShipmentBatch`, draft update, ready/dispatch, failed delivery, return,
  cancel, void, close, reopen, reservation release/consume, and verified
  quantity application.
- Delivery note and labels commands exist:
  batch DN generation/regeneration/supersession, print/upload/status updates,
  labels/package generation, print/reprint/void/supersede handling.
- POD commands exist:
  `submitPod`, `resubmitPod`, `reviewPod`, `reverseVerification`, immutable
  verification events, file assets for evidence, verified quantity application,
  DN lifecycle updates, and variance/rejected-POD exception creation.

## Partial / Not Complete

- P3-04 order creation wizard and order list/detail actions are not fully wired
  to V2 `createOrderRequestDraft` + `submitOrderRequest`.
- P3-05/P3-06 include create/adjust/cancel, but a dedicated
  `approveAllocation` command from the execution plan is not present.
- P3-09 `createProductionJobs` exists, but no direct call was found from
  `submitOrderRequest`; production job generation is not yet an automatic
  submit side effect in the code searched.
- P3-12/P3-17/P3-21/P3-25 UI wiring is incomplete: production queue and batch
  dialogs exist, but the planned full command center, vendor workbench,
  correction queue, DN/label lifecycle actions, and POD decision drawer are not
  all implemented.
- The Phase 3 cross-workflow exit demo exists as unit/store-level coverage in
  `tests/unit/storeCommands.test.ts`, but not as the required full UI E2E.

## Validation

- `npm run test:unit`: PASS. The unit suite includes migration idempotency,
  partial shipment lifecycle, DN regeneration, POD verification, stale
  `expectedVersion`, and idempotency-key replay.
- `npm run build`: PASS.
- `npm run lint`: PASS.
- Phase 3 gate cannot be marked complete until the workflows are executable
  end-to-end through the UI and the exit demo is encoded as E2E.

## Next Implementation Order

1. Finish V2 order creation/submit UI and connect allocation creation during the
   same flow.
2. Add allocation approval semantics or explicitly reconcile the execution plan
   if the policy model replaces the approval command.
3. Wire production job generation from order submission.
4. Complete batch failure/return/close UI and exception blocker affordances.
5. Complete DN/label lifecycle UI.
6. Complete POD upload, verification, correction, resubmission, and reversal UI.
7. Add the audit tab and the full cross-workflow E2E demo.
