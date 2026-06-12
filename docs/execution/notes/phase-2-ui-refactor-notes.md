# Phase 2 - UI Refactor: Re-check Notes

Status: Partially implemented. Build/lint gate is green, but the Phase 2 exit
criteria are not complete.

## Implemented

- P2-01 route constants: `src/lib/routes.ts` exists with canonical admin,
  operator, vendor, and client logistics paths plus redirect metadata.
- P2-02 redirect wiring: `src/App.tsx` redirects `/admin/logistics*` to
  `/admin/shipments*` and `/vendor/update/:id` to `/vendor/orders/:id`.
- P2-04 sidebar expansion: Admin exposes Production, Shipment Batches,
  Delivery Notes, Shipping Labels, POD Verification, and Exceptions. Vendor
  exposes Production, Shipment Batches, Delivery Notes, and POD Uploads. Client
  exposes the orders list.
- P2-05 badge family: `src/components/domain/badges/badges.tsx` covers
  production, distribution, allocation, shipment batch, delivery note, POD,
  delivery confirmation, and exception display states.
- P2-14/P2-15/P2-19 route surfaces: shipment batch list/detail, delivery note
  register, label register, POD verification queue, exceptions register,
  production queue, sales point detail, client order list, and vendor POD upload
  queue exist and render from migrated V2 seeds.
- P2-16 batch print routes exist:
  `/admin/shipments/:id/delivery-note`, `/admin/shipments/:id/labels`, and role
  equivalents render batch-scoped print pages.

## Partial / Not Complete

- P2-03 permission selectors now exist in `src/lib/v2/permissions.ts` with unit
  coverage in `tests/unit/permissions.test.ts`. Route guards are not yet wired
  into `App.tsx`, so route/action enforcement remains partial.
- P2-06..P2-10 domain tables exist in a compact set
  (`OrderRequestTable`, allocation, shipment, delivery note, POD, production),
  but not every named table from the execution plan is present.
- P2-11 shared filter preset modules are missing (`src/components/shared/filters`
  does not exist). Existing pages use local filters or `FilterSection` directly.
- P2-12 `AllOrders` is still primarily bound to legacy `useOrders()` and legacy
  `StatusBadge`; V2 production/distribution/POD columns are not the table's
  primary contract.
- P2-13 `OrderDetail` has V2 fulfillment and allocation/batch content, but it is
  not the planned tabbed command center with Overview, Allocations, Production,
  Shipment Batches, Delivery Notes, POD, and Audit tabs.
- P2-16 legacy order print routes still render the old order-scoped print pages
  (`DeliveryNotePrint`, `PackagingLabelsPrint`) instead of opening a
  `BatchSelectorDialog` with single-batch auto-resolution.
- P2-17 vendor order workbench remains `VendorUpdateProgress` and still mutates
  the legacy order store for stage progression.
- P2-18 dashboards appear refactored toward V2 metrics, but the Phase 2 gate
  still needs projection parity coverage before marking this complete.
- P2-19 is missing at least a vendor POD correction queue route/component and
  an admin production detail route.
- P2-20 order creation/allocation and import output remain mixed with legacy
  flows; V2 order creation commands are not wired end-to-end from UI.

## Validation

- `npm run build`: PASS.
- `npm run lint`: PASS.
- V2 logistics Playwright coverage in `tests/v2-logistics.spec.ts` passed inside
  the full Playwright run across Chromium, Firefox, and WebKit.
- Phase 2 release gate cannot be marked complete because full `npm test` fails
  and several Phase 2 tasks remain partial.

## Next Implementation Order

1. Wire `src/lib/v2/permissions.ts` route/action decisions into `App.tsx` and
   command surfaces.
2. Add shared filter preset modules and migrate `AllOrders` to
   `OrderRequestTable`/V2 view models.
3. Refactor `OrderDetail` into the planned tabs and add the audit tab.
4. Replace legacy print action behavior with batch selector compatibility.
5. Replace `VendorUpdateProgress` with the V2 workbench and add the correction
   queue.
