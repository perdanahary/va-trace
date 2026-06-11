# 06 - Testing Strategy

## Purpose

This document defines the V2 test strategy for incremental implementation across domain, stores, routing, UI components, data migration, and workflows.

The current project uses TypeScript build checks and Playwright E2E tests:

- `npm run build` -> `tsc && vite build`
- `npm run lint`
- `npm test` -> `npx playwright test`

V2 should add focused unit/store tests if a unit test runner is introduced. Until then, pure functions can be tested through lightweight TypeScript test modules or Playwright-driven integration scenarios.

## Test Layers

| Layer | Purpose | Primary targets |
| --- | --- | --- |
| Type/build tests | Contract compatibility and compile safety. | `npm run build`. |
| Unit tests | Pure domain calculations and transformation rules. | Domain selectors, status mapping, quantity math. |
| Store tests | Command validation, persistence, migration, rollback. | V2 stores/repositories. |
| Component tests | Reusable UI behavior. | Status badges, tables, dialogs, forms. |
| Workflow E2E tests | Cross-screen operational flows. | Admin/Vendor/Client scenarios. |
| Regression tests | Preserve V1 behavior and old routes. | Existing tests and compatibility routes. |
| UAT scripts | Business pass/fail scenarios. | Admin, Vendor, PMG/Client workflows. |

## Unit Tests

### Entities

#### `OrderRequest`

Test:

- Create draft with metadata and item lines.
- Submit requires client, project, vendor, deadline, requester, source, item, allocation.
- Cancel blocks new batch and document creation.
- `legacyStatusLabel` does not drive V2 calculations.
- Completion requires production `COMPLETED`, distribution `FULLY_RECEIVED`, and all allocations received.

Acceptance:

- Invalid draft can save if draft rules allow it.
- Invalid submit returns field-level errors.
- Cancelled order cannot create shipment batch.

#### `OrderItem`

Test:

- Quantity must be greater than zero.
- Product reference must resolve or carry explicit import mapping.
- Production status transition sequence:
  - `NEW -> SUBMITTED -> ACCEPTED -> PRINTING -> FINISHING -> QUALITY_CONTROL -> READY_FOR_DISTRIBUTION -> COMPLETED`.
- Production-ready quantity gates shipment when configured.

Acceptance:

- Invalid transitions are rejected.
- Ready quantity cannot exceed ordered quantity.

#### `SalesPoint`

Test:

- Required code/WCode/name/client/geography/address for active use.
- Data quality derives missing contact/address/delivery instruction/recent issue.
- Master-data updates do not mutate historical snapshots.

Acceptance:

- Duplicate code/WCode is rejected.
- Missing data produces warning or blocked state according to policy.

#### `SalesPointAllocation`

Test:

- Allocation references one order, item/product, and Sales Point.
- Allocation quantity > 0.
- Allocation sum by product cannot exceed ordered quantity.
- Under-allocation requires reason.
- Shipped and received quantities are derived from batches/POD.
- Allocation status:
  - `NOT_SHIPPED`
  - `PARTIALLY_SHIPPED`
  - `FULLY_SHIPPED`
  - `PARTIALLY_RECEIVED`
  - `FULLY_RECEIVED`
  - `EXCEPTION`

Acceptance:

- Cannot reduce allocation below shipped quantity.
- Cannot delete allocation after shipment dependency exists.

#### `ShipmentBatch`

Test:

- Batch references exactly one Order Request.
- Batch may contain multiple Sales Points/products from that order.
- Batch item quantity > 0.
- Quantity cannot exceed allocation outstanding quantity.
- Status transitions:
  - `DRAFT -> READY -> DISPATCHED -> IN_TRANSIT -> PARTIALLY_RECEIVED | FULLY_RECEIVED -> CLOSED`.
- Reopen closed batch requires Admin reason.

Acceptance:

- Dispatch requires at least one item and required DN/labels where configured.
- Partial shipment flag is correct.
- Partial delivery flag is correct.

#### `DeliveryNote`

Test:

- DN requires `shipmentBatchId`, order, DN number, destination snapshots, and items.
- One active DN per batch.
- DN items are sourced from batch items.
- DN shipped quantity equals batch shipped quantity.
- Status transitions:
  - `GENERATED -> PRINTED -> SIGNED -> UPLOADED -> VERIFIED -> CLOSED`.

Acceptance:

- Cannot generate order-scoped DN from total order lines.
- Cannot merge multiple batches into one DN.

#### `DeliveryConfirmation`

Test:

- Requires batch, DN, Sales Point, receiver, date, evidence, item confirmations.
- Status transitions:
  - `DRAFT -> SUBMITTED -> VERIFIED | REJECTED | CORRECTION_REQUESTED`.
- Verified quantities update derived received quantities.
- Rejected/correction requested does not update received quantities.
- Verified received quantity over shipped quantity requires Admin overage reason.

Acceptance:

- Item-level variance is calculated correctly.
- POD evidence maps to expected types.

## Store Tests

### All state modules

For each V2 store:

- Reads default seed state.
- Writes and emits change event.
- Handles malformed localStorage safely.
- Supports migration versioning.
- Preserves audit/version fields.
- Rejects stale `expectedVersion`.
- Is idempotent across reloads.

### `OrderRequestStore`

Test:

- Create, update, submit, cancel, accept.
- List response filters: search, client, project, vendor, production status, distribution status, delivery progress, Sales Point, product, POD status, exception.
- Detail response includes batches, DNs, confirmations, permissions.

### `SalesPointStore`

Test:

- Create/update Sales Point.
- Create/update contacts.
- Confirm import match.
- List filters: search, geography, status, data quality, active allocation.

### `SalesPointAllocationStore`

Test:

- Create/bulk create/update/correct.
- Quantity and uniqueness validation.
- Derived shipped/received/outstanding from batch/POD stores.

### `ProductionStore`

Test:

- Vendor assigned update.
- Admin update.
- Analyst/client rejection.
- Production-ready quantity.

### `ShipmentBatchStore`

Test:

- Create draft/ready batch from outstanding allocations.
- Update draft line quantities.
- Generate DN/labels flags.
- Dispatch.
- Close/reopen.
- Vendor scope checks.

### `DeliveryNoteStore`

Test:

- Generate DN from batch.
- Record print.
- Upload signed DN metadata.
- Regenerate with reason.
- Generate/print labels from batch items.

### `DeliveryConfirmationStore`

Test:

- Create draft.
- Submit.
- Verify.
- Reject.
- Request correction.
- Update derived summaries after verification only.

## Workflow Tests

### Order Creation

Scenario:

1. Admin creates Order Request.
2. Adds client/project/vendor/deadline.
3. Adds product lines.
4. Adds Sales Point allocations.
5. Submits order.

Pass criteria:

- Order appears in `/admin/orders`.
- Allocations appear on Order Detail.
- Production status is `SUBMITTED` or expected initial state.
- Distribution status is `NOT_STARTED`.

### Production Progression

Scenario:

1. Vendor opens assigned order.
2. Accepts order.
3. Moves item through printing, finishing, QC.
4. Marks ready for distribution.

Pass criteria:

- Admin and Vendor views show matching production status.
- Distribution status does not change from production actions alone.

### Shipment Batch Creation

Scenario:

1. Vendor/Admin selects outstanding allocation lines.
2. Creates batch with partial quantities.
3. Generates DN and labels.

Pass criteria:

- Batch status is `READY`.
- Allocation shipped quantity reflects selected batch quantities.
- Partial shipment is visible when shipped quantity is below allocation outstanding quantity.

### Delivery Note Generation

Scenario:

1. Open Shipment Batch Detail.
2. Generate Delivery Note.
3. Print DN.

Pass criteria:

- DN has batch ID and order ID.
- DN lines match batch items.
- DN status moves to `PRINTED` after print record.
- Order Delivery Notes tab lists the DN.

### Partial Shipment

Scenario:

1. One allocation quantity is 100.
2. Create Batch 1 for 40.
3. Create Batch 2 for 60.

Pass criteria:

- Allocation is `PARTIALLY_SHIPPED` after Batch 1.
- Allocation is `FULLY_SHIPPED` after Batch 2.
- Order has two shipment batches and two possible DNs.

### Partial Delivery

Scenario:

1. Batch ships 100.
2. Vendor submits claimed received 80.
3. Admin verifies 80 with variance reason.

Pass criteria:

- Batch status is `PARTIALLY_RECEIVED`.
- Allocation status is `PARTIALLY_RECEIVED`.
- `PodStatus` is `VARIANCE` where applicable.
- Received quantity is 80, not 100.

### Multiple DN per Order

Scenario:

1. Create three batches for one order.
2. Generate DN for each batch.

Pass criteria:

- Order Detail shows three DNs.
- Old order DN route opens selector.
- No print view merges all three batches into one DN.

### POD Upload

Scenario:

1. Vendor opens assigned shipment.
2. Uploads signed DN evidence and POD photos.
3. Enters claimed received quantities.
4. Submits.

Pass criteria:

- POD status is `SUBMITTED`.
- Received quantities are not updated until Admin verification.
- Admin queue shows submitted POD.

### POD Verification

Scenario:

1. Admin opens POD queue.
2. Reviews evidence and item quantities.
3. Verifies, rejects, or requests correction.

Pass criteria:

- Verify updates received quantities and DN/POD statuses.
- Reject/request correction stores reason and does not update received quantities.
- Vendor can see rejected/correction status.

## Edge Cases

Test each as unit/store and at least one E2E where UI behavior is critical.

| Edge case | Expected result |
| --- | --- |
| Multiple DN per Order | Order DN tab lists all DNs; old route requires selector. |
| Partial delivery across regions | Allocation and Sales Point history reflect regional variance correctly. |
| Sales Point reassignment before shipment | Draft allocation can update if no shipped quantity; audit records change. |
| Sales Point reassignment after shipment | Block or require Admin correction; historical DN snapshot remains unchanged. |
| Cancelled shipment draft | Draft can be removed/cancelled if no document policy conflict. |
| Cancelled dispatched shipment | Requires Admin correction/exception; quantities not silently removed. |
| Failed delivery | Batch/allocation enters exception or variance state; POD requires correction. |
| Vendor tries other vendor batch | Route/action blocked without entity leakage. |
| Analyst opens mutation route | Route loads read-only or action is blocked. |
| Missing Sales Point contact | Shipment warns or blocks according to policy. |
| Missing Sales Point address | Shipment warns or blocks according to policy. |
| Legacy order with delivered qty but no batch | Admin can create compatibility batch. |
| Legacy order with multiple generated labels | Labels bind to compatibility batch items. |
| POD verified with overage | Requires Admin reason; variance recorded. |

## UI Tests

### Tables

Test:

- All Orders.
- Allocation table.
- Shipment Batch table.
- Shipment item table.
- Delivery Note register.
- POD verification queue.
- Sales Point table.

Pass criteria:

- Columns match screen inventory/API view models.
- Search and filters work.
- Empty states are clear.
- Row actions honor permissions.
- Mobile horizontal scrolling works.

### Filters

Test:

- Production status.
- Distribution status.
- Batch status.
- DN status.
- POD status.
- Client/project/vendor.
- Geography.
- Partial shipment/delivery.
- Exception only.

Pass criteria:

- Filters combine correctly.
- Vendor filters are scoped/hidden where fixed.
- Analyst filters do not expose actions.

### Forms

Test:

- Order creation.
- Allocation editing.
- Batch creation.
- POD upload.
- POD verification.
- Sales Point contact editing.

Pass criteria:

- Required fields validate inline.
- Invalid quantities are blocked.
- Disabled actions explain missing preconditions.
- Dialog focus and keyboard behavior work.

### Status Badges

Test:

- Legacy order labels.
- Production status.
- Distribution status.
- Allocation status.
- Batch status.
- DN status.
- POD status.
- Exception state.

Pass criteria:

- Labels format underscores into readable text.
- Variants use existing status tokens.
- Unknown status falls back safely.

### Dashboards

Test:

- Production metric cards.
- Distribution metric cards.
- Sales Point metrics.
- Vendor metrics.
- POD backlog.
- Shipment exceptions.

Pass criteria:

- Metrics derive from V2 selectors.
- No metric depends only on legacy blended status.

## Integration Tests

### Cross-module workflows

1. Order creation -> allocation -> production -> batch -> DN -> POD -> completion.
2. Import -> Sales Point match -> allocation -> batch creation.
3. Vendor production update -> Admin order detail reflects production status.
4. Vendor POD upload -> Admin verification -> Vendor sees outcome.
5. Sales Point detail -> allocation history -> shipment history -> POD history.
6. Old order print route -> batch selector -> batch print route.

Pass criteria:

- Entity IDs link correctly across modules.
- Derived summaries match raw entity totals.
- Audit events appear for key mutations.

## Regression Tests

Existing V1 functionality must remain until explicitly replaced:

- Admin dashboard loads.
- Admin all orders loads.
- Admin order detail loads.
- Admin create order works.
- Admin imports route loads.
- Vendor dashboard loads.
- Vendor orders loads.
- Vendor old update route redirects or loads workbench.
- Existing Delivery Note print route works for one-batch compatibility.
- Existing packaging labels print route works for one-batch compatibility.
- Client create order still creates usable demand.
- Sales Point list still loads and filters.
- Bulk import tests continue or are intentionally updated.

Regression pass criteria:

- Existing Playwright tests are updated only when route behavior intentionally changes.
- No old route silently generates incorrect order-scoped documents.
- Print CSS remains scoped and printable.

## UAT Scenarios

### Admin Workflow

1. Admin creates order with two products and three Sales Points.
2. Admin checks allocation completeness and data quality warnings.
3. Vendor updates production to ready.
4. Admin creates one partial shipment batch.
5. Admin prints DN/labels.
6. Vendor uploads POD.
7. Admin verifies partial delivery with variance.
8. Admin creates second batch for remaining quantity.
9. Admin verifies final POD.
10. Order becomes complete only after production completed and all allocations fully received.

Pass criteria:

- Admin can trace every quantity from order to allocation to batch to DN to POD.

### Vendor Workflow

1. Vendor sees assigned order.
2. Vendor accepts and updates production.
3. Vendor creates shipment batch from eligible allocations.
4. Vendor generates/prints DN and labels.
5. Vendor dispatches batch.
6. Vendor uploads signed DN and POD photos.
7. Vendor corrects rejected POD when Admin requests correction.

Pass criteria:

- Vendor cannot access other vendor data or verify POD.

### PMG/Client Workflow

1. Client creates order or uploads import.
2. Client tracks production and delivery progress.
3. Client sees verified delivery status by Sales Point where exposed.
4. Client does not see unverified internal POD data unless permitted.

Pass criteria:

- Client sees own scoped data only.
- Client can distinguish production progress from distribution progress.

## Module Acceptance Criteria

### Domain model

- Contract enums and required fields match API contracts.
- Legacy status is compatibility-only.
- No new order-scoped DN generation.

### State management

- Stores own clear entity boundaries.
- Derived selectors produce correct summaries.
- Migration is idempotent.
- Rollback preserves V1 data.

### Routing

- Existing routes load or redirect intentionally.
- New Admin/Vendor routes are guarded.
- Compatibility document routes select batches correctly.

### UI components

- Shared components use shadcn/Tailwind and existing tokens.
- Tables, filters, forms, badges, dialogs, print views meet responsive requirements.
- Action visibility/disabled state follows permissions.

### Data migration

- Every shipped quantity belongs to a batch item.
- Every DN belongs to a shipment batch.
- Every received quantity comes from verified POD or audited compatibility migration.
- Multiple batches/DNs per order are represented.

### Workflows

- Order creation, production, batch creation, DN generation, partial shipment, partial delivery, POD upload, and POD verification all pass.
- Admin/Vendor role separation remains intact.

## Execution Sequence for Test Development

1. Add domain selector/unit tests for status and quantity rules.
2. Add migration parity tests for legacy seed orders.
3. Add store command tests for allocations and batches.
4. Add route smoke tests and permission tests.
5. Add component/UI tests for new tables and badges.
6. Add workflow E2E for partial shipment and partial delivery.
7. Add POD upload/verification E2E.
8. Add regression tests for old document routes.
9. Add UAT scripts as Playwright specs or documented manual test scripts.

## Required CI Gate

Before merging each migration phase:

1. `npm run build` passes.
2. `npm run lint` passes or documented lint baseline is unchanged.
3. Relevant Playwright suite passes.
4. Migration parity checks pass for seed data.
5. Rollback or compatibility behavior for that phase is verified.
