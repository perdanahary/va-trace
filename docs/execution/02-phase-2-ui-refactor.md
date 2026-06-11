# 02 - Phase 2: UI Refactor

Scope: routes, layouts, pages, tables, badges, forms, filters.
Normative sources: `docs/implementation/03-routing-refactor.md`, `docs/implementation/04-ui-component-refactor.md`, `docs/ui-architecture-v2.md`, `docs/screen-inventory-v2.md`, `docs/page-entity-matrix.md`, `docs/ui-migration-plan.md`.

Design constraints (from `AGENTS.md` / `DESIGN.md`): shadcn primitives + CVA variants only; `cn()` merging; lucide-react icons; documented status tokens only (success `#10B981`, warning `#F59E0B`, processing `#3B82F6`); no emojis, no neon, no arbitrary inline colors; mobile-first with horizontal scroll for dense tables.

---

## Component Disposition: Keep / Refactor / Replace / Remove

### Keep (unchanged shells, extension only)

| Component | Path | Notes |
| --- | --- | --- |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Extend nav groups only (Admin: Shipments, Delivery Notes, POD, Exceptions; Vendor: Shipment Batches, POD Uploads) |
| `Header` | `src/components/layout/Header.tsx` | Extend breadcrumb segment labels for V2 hierarchy |
| `ContentArea` | `src/components/layout/ContentArea.tsx` | Unchanged |
| `RoleSwitcherFloatingButton` | `src/components/layout/RoleSwitcherFloatingButton.tsx` | Unchanged |
| `UserAccountMenu` | `src/components/layout/UserAccountMenu.tsx` | Unchanged |
| `FilterSection` | `src/components/shared/FilterSection.tsx` | Reused as base for all V2 table filters |
| shadcn primitives (29) | `src/components/ui/*` | Foundation; no library swap |

### Refactor

| Component/Page | Current Issue | Target | Task |
| --- | --- | --- | --- |
| `StatusBadge` | Incomplete V2 status families | Generic wrapper retained; family-specific badges added | P2-05 |
| `AllOrders` | Legacy-status-first table | Demand list w/ production + distribution + delivery progress + POD exception columns | P2-12 |
| `OrderDetail` | Order-centric monolith | Tabbed command center: Overview, Allocations, Production, Shipment Batches, Delivery Notes, POD, Audit | P2-13 |
| `DeliveryNotePrint` | Order-scoped generation | Batch-scoped print view; order route becomes selector | P2-16 |
| `PackagingLabelsPrint` | Order/item-scoped labels | Batch item/package-scoped labels | P2-16 |
| `VendorUpdateProgress` | Simple progress page | Vendor Order Workbench (production, eligible allocations, batches, DNs, POD uploads) | P2-17 |
| `LogisticsList` | Static shipment tracker | Shipment Batch list backed by `ShipmentBatchListRow` | P2-14 |
| `SalesPointList` | Master list only | Add detail route + operational tabs (contacts, allocation history, shipment history) | P2-15 |
| Dashboard cards (`AdminDashboard`, `VendorDashboard`, `ClientDashboard`) | Legacy order metrics | Split production / distribution / POD / batch / Sales Point metrics | P2-18 |

### Replace

| Current Pattern | Replacement | Task |
| --- | --- | --- |
| Order-level "Generate Delivery Note" action | `BatchSelectorDialog` -> batch-scoped `DeliveryNotePrint` | P2-16 |
| Order-level "Print Packaging Labels" action | `BatchSelectorDialog` -> batch-scoped labels print | P2-16 |
| Inline shipment arrays in `OrderDetail` | `ShipmentBatchTable` + `ShipmentBatchCard` via batch selectors | P2-13 |
| Hardcoded delivery progress rows in `OrderDetail` | `DeliveryProgressBar` + `QuantitySummaryRail` | P2-13 |

### Remove (after compatibility phase, end of Phase 3)

| Item | Removal Condition |
| --- | --- |
| Direct order-scoped DN generation UI | Batch selector + batch DN generation cover all cases |
| Direct item-level label generation UI | Batch label generation covers all cases |
| Legacy `PodStatus` display values `PENDING`/`UPLOADED` | All data migrated to `PENDING_UPLOAD`/`SUBMITTED` |
| `/vendor/update/:id` route | Redirect to `/vendor/orders/:id` verified in regression suite |

---

## Batch C1 - Routing (requires Phase 1 Batch A1)

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P2-01 | Canonical route constants | Single `ROUTES` module for all roles per target route map in `docs/implementation/03-routing-refactor.md` (HI-10). No raw path strings in pages. | `src/lib/routes.ts` (new) | P1-01 | M | Yes |
| P2-02 | Redirect table | Redirects: `/admin/logistics/shipments*` -> `/admin/shipments*`, `/admin/logistics/delivery-notes` -> `/admin/delivery-notes`, `/admin/logistics/pod` -> `/admin/pod`, `/vendor/update/:id` -> `/vendor/orders/:id`, `/client/orders` -> client order list, legacy `/admin/logistics` -> `/admin/shipments`. | `src/App.tsx` | P2-01 | M | No (App.tsx single-writer) |
| P2-03 | Route guards + permission selectors | Role/scope guards backed by `authStore` + `AuthorizationScope` (CR-08); permission decisions return disabled reasons for gated actions; wrong-client/vendor access blocked. | `src/lib/v2/permissions.ts` (new), `src/App.tsx` | P1-16, P2-01 | L | After P2-02 |
| P2-04 | Sidebar nav groups | Admin adds Production, Shipments, Delivery Notes, POD, Exceptions; Vendor adds Shipment Batches, POD Uploads, Correction Queue; Client adds Orders list entry (fixes missing `/client/orders`). | `src/components/layout/Sidebar.tsx` | P2-01, P2-03 | M | No |

## Batch D1 - Badges, Tables, Filters (requires Phase 1 Batch A1; parallel with C1)

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P2-05 | Status badge family | `ProductionStatusBadge`, `DistributionStatusBadge`, `AllocationStatusBadge`, `ShipmentBatchStatusBadge`, `DeliveryNoteStatusBadge`, `PodStatusBadge`, `ExceptionStateBadge`. Badge variants + existing tokens; `StatusBadge` kept as generic wrapper; `formatDomainStatusLabel` helper. | `src/components/domain/badges/*.tsx` (new), `src/components/ui/StatusBadge.tsx` | P1-02 | L | Yes |
| P2-06 | `OrderRequestTable` | Bound to `OrderListRow`; columns incl. production/distribution status, delivery progress, POD exception; empty/loading/error states. | `src/components/domain/tables/OrderRequestTable.tsx` (new) | P1-03, P2-05 | M | Yes |
| P2-07 | Allocation tables | `SalesPointAllocationTable` (`OrderAllocationTableRow`/`SalesPointAllocationRow`); virtualized via `@tanstack/react-virtual` for 10k rows (HI-09). | `src/components/domain/tables/SalesPointAllocationTable.tsx` (new) | P1-04, P2-05 | L | Yes |
| P2-08 | Shipment tables | `ShipmentBatchTable` (`ShipmentBatchListRow`), `ShipmentBatchItemTable` (`ShipmentBatchItemTableRow`). | `src/components/domain/tables/ShipmentBatch*.tsx` (new) | P1-06, P2-05 | M | Yes |
| P2-09 | Document tables | `DeliveryNoteRegisterTable` (`DeliveryNoteListRow`), `DeliveryNoteItemTable`, label register table (CR-03/HI-11). | `src/components/domain/tables/DeliveryNote*.tsx`, `LabelRegisterTable.tsx` (new) | P1-06, P1-07, P2-05 | M | Yes |
| P2-10 | POD + Sales Point tables | `PodVerificationQueueTable` (`PodVerificationQueueRow`), `SalesPointTable` (virtualized), `SalesPointShipmentHistoryTable`. | `src/components/domain/tables/Pod*.tsx`, `SalesPoint*.tsx` (new) | P1-04, P1-07, P2-05 | L | Yes |
| P2-11 | Filter presets | `FilterSection`-based presets: production/distribution/allocation/batch/DN/POD status filters, Sales Point hierarchy filter, exception filter; compact mobile variant (MED-08). | `src/components/shared/filters/*.tsx` (new) | P2-05 | M | Yes |

## Batch D2 - Pages, Forms, Dialogs (requires B1 stores, C1 routes, D1 components)

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P2-12 | `AllOrders` refactor | Columns/filters per `docs/ui-migration-plan.md` Phase 2; legacy status demoted to secondary text. Applies to Admin/Operator/Analyst variants. | `src/pages/admin/AllOrders.tsx` | P2-06, P2-11, P1-11 | M | Yes |
| P2-13 | `OrderDetail` command center | Tabs: Overview, Allocations, Production, Shipment Batches, Delivery Notes, POD, Audit. `QuantitySummaryRail`, `DeliveryProgressBar`, `ShipmentBatchCard`, `DeliveryNoteSummaryCard`. Gated actions per permission selectors. | `src/pages/admin/OrderDetail.tsx`, `src/components/domain/detail/*.tsx` (new) | P2-05..P2-10, P2-03, P1-11..P1-15 | XL | Yes |
| P2-14 | Shipment Batch list + detail pages | `/admin/shipments`, `/admin/shipments/:id`; replaces `LogisticsList` (redirect from `/admin/logistics`). Vendor equivalents under `/vendor/shipments`. | `src/pages/admin/ShipmentBatchList.tsx`, `ShipmentBatchDetail.tsx`, `src/pages/vendor/*` (new) | P2-08, P2-02, P1-14 | L | Yes |
| P2-15 | Sales Point detail page | `/admin/sales-points/:id` with contacts panel (`SalesPointContactPanel`), data quality, allocation + shipment history tabs. | `src/pages/admin/SalesPointDetail.tsx` (new), `SalesPointList.tsx` | P2-10, P1-12 | L | Yes |
| P2-16 | Print route compatibility | `DeliveryNotePrint` + `PackagingLabelsPrint` become batch-scoped (`/admin/shipments/:id/delivery-note`, `/admin/shipments/:id/labels`); legacy order routes open `BatchSelectorDialog` (single-batch auto-resolve). Print CSS classes preserved (`delivery-note-chrome`, `packaging-label-chrome`). | `src/pages/shared/DeliveryNotePrint.tsx`, `PackagingLabelsPrint.tsx`, `src/components/domain/dialogs/BatchSelectorDialog.tsx` (new) | P1-14, P1-15, P2-02 | L | Yes |
| P2-17 | Vendor Order Workbench | Convert `VendorUpdateProgress` into workbench: production panel, eligible allocations, batch list, DN list, POD upload entry points. | `src/pages/vendor/VendorOrderWorkbench.tsx` (rename/refactor) | P2-08, P2-09, P2-10, P1-13..P1-15 | XL | Yes |
| P2-18 | Dashboards refactor | Admin/Vendor/Client dashboards split metrics: production, distribution, POD queue, open exceptions, batch states; projection-backed summaries (MED-05). | `src/pages/admin/AdminDashboard.tsx`, `src/pages/vendor/VendorDashboard.tsx`, `src/pages/client/ClientDashboard.tsx` | P1-17, P2-05 | L | Yes |
| P2-19 | Missing screens (HI-11) | Exceptions register (`/admin/exceptions`), label register, production queue (`/admin/production`, `/admin/production/:id`), client order list (`/client/orders`), vendor POD correction queue. | `src/pages/admin/ExceptionList.tsx`, `ProductionQueue.tsx`, `src/pages/client/ClientOrders.tsx`, `src/pages/vendor/PodCorrectionQueue.tsx` (new) | P2-05..P2-11, P1-13, P1-16 | XL | Yes |
| P2-20 | Forms: order creation + allocation step | `AdminCreateOrder`/`CreateOrder` gain Sales Point allocation step; zod validation matching contract field errors; import workspace UI updates for row-level matching (MED-07). | `src/pages/admin/AdminCreateOrder.tsx`, `src/pages/client/CreateOrder.tsx`, import workspace pages | P1-11, P1-12, P1-22, P2-07 | XL | Yes |

Gate Phase 2 exit: all target routes resolve; redirect table verified manually; badges cover every enum member; virtualized tables handle 10k-row fixture; `npm run build` + `npm run lint` green; legacy order print routes still functional through selector.
