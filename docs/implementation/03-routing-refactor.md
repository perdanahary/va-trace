# 03 - Routing Refactor

## Purpose

This document defines the route migration from the current V1 order-centered SPA to the V2 route model in `docs/ui-architecture-v2.md`, `docs/screen-inventory-v2.md`, `docs/page-entity-matrix.md`, and `docs/ui-migration-plan.md`.

The migration must preserve existing Admin/Vendor routes until compatibility behavior exists. New routes must enforce role ownership and prevent order-scoped document generation from bypassing Shipment Batch ownership.

## Current Route Map

Current routes are declared in `src/App.tsx`.

### Admin

| Current route | Current page | V2 interpretation |
| --- | --- | --- |
| `/admin` | `AdminDashboard` | Keep; upgrade metrics to production/distribution/POD. |
| `/admin/create` | `AdminCreateOrder` | Keep; add Sales Point allocation step. |
| `/admin/progress` | `OrderProgress` | Keep or redirect into order/reporting view after V2 tracking exists. |
| `/admin/orders` | `AllOrders` | Keep; demand-level Order Request list. |
| `/admin/orders/:id` | `OrderDetail` | Keep; refactor to command center tabs. |
| `/admin/orders/:id/delivery-note` | `DeliveryNotePrint` | Compatibility selector/default batch DN route. |
| `/admin/orders/:id/packaging-labels` | `PackagingLabelsPrint` | Compatibility selector/default batch labels route. |
| `/admin/imports` | `ImportDispatchWorkspace` | Keep; output V2 order/items/allocations. |
| `/admin/inbox` | `InboxPage` | Keep. |
| `/admin/users` | `UserList` | Keep with permissions. |
| `/admin/logistics` | `LogisticsList` | Redirect or replace with shipment batch list. |
| `/admin/suppliers` | `SupplierList` | Keep. |
| `/admin/suppliers/new` | `SupplierDetail` | Keep. |
| `/admin/suppliers/:id` | `SupplierDetail` | Keep. |
| `/admin/products` | `ProductList` | Keep. |
| `/admin/products/:code` | `ProductDetail` | Keep. |
| `/admin/brands` | `BrandList` | Keep. |
| `/admin/sales-points` | `SalesPointList` | Keep; add detail route. |
| `/admin/clients` | `ClientList` | Keep. |
| `/admin/clients/:id` | `ClientDetail` | Keep. |

### Operator

| Current route | Current page | V2 interpretation |
| --- | --- | --- |
| `/operator` | `AdminDashboard` with operator role | Keep with constrained actions. |
| `/operator/create` | `AdminCreateOrder` | Keep. |
| `/operator/progress` | `OrderProgress` | Keep or redirect after V2 tracking exists. |
| `/operator/orders` | `AllOrders` | Keep. |
| `/operator/orders/:id` | `OrderDetail` | Keep with operator permissions. |
| `/operator/orders/:id/packaging-labels` | `PackagingLabelsPrint` | Add compatibility batch selector. |
| `/operator/imports` | `ImportDispatchWorkspace` | Keep. |
| `/operator/inbox` | `InboxPage` | Keep. |

### Analyst

| Current route | Current page | V2 interpretation |
| --- | --- | --- |
| `/analyst` | `AdminDashboard` with analyst role | Keep read-only/reporting. |
| `/analyst/progress` | `OrderProgress` | Keep or redirect after V2 tracking exists. |
| `/analyst/orders` | `AllOrders` | Keep read-only. |
| `/analyst/orders/:id` | `OrderDetail` | Keep read-only. |
| `/analyst/orders/:id/packaging-labels` | `PackagingLabelsPrint` | Read/print only if allowed. |
| `/analyst/inbox` | `InboxPage` | Keep. |
| `/analyst/users` | `UserList` | Keep read-only. |

### Client

| Current route | Current page | V2 interpretation |
| --- | --- | --- |
| `/client` | `ClientDashboard` | Keep. |
| `/client/progress` | `OrderProgress` | Keep. |
| `/client/create` | `CreateOrder` | Keep; create `OrderRequest` with allocations. |
| `/client/imports` | `ImportUploadPage` | Keep; map imports to allocations. |
| `/client/inbox` | `InboxPage` | Keep. |
| `/client/orders` | Sidebar points here, route missing | Add or redirect to `/client/progress`/client order list. |

### Vendor

| Current route | Current page | V2 interpretation |
| --- | --- | --- |
| `/vendor` | `VendorDashboard` | Keep; add production/shipment/POD queues. |
| `/vendor/orders` | `VendorOrders` | Keep; demand list with V2 status columns. |
| `/vendor/profile` | `VendorProfile` | Keep. |
| `/vendor/progress` | `OrderProgress` | Keep or redirect to production/order workbench. |
| `/vendor/orders/:id` | `VendorUpdateProgress` | Convert to Vendor Order Workbench. |
| `/vendor/update/:id` | `VendorUpdateProgress` | Redirect to `/vendor/orders/:id`. |
| `/vendor/orders/:id/delivery-note` | `DeliveryNotePrint` | Compatibility selector/default batch DN route with vendor scope. |
| `/vendor/orders/:id/packaging-labels` | `PackagingLabelsPrint` | Compatibility selector/default batch labels route with vendor scope. |
| `/vendor/inbox` | `InboxPage` | Keep. |

## Target Route Map

### Admin target routes

| Target route | Purpose | Primary entity | Required permissions |
| --- | --- | --- | --- |
| `/admin` | Operational dashboard. | All summaries | Admin read all. |
| `/admin/orders` | Order Request list. | `OrderRequest` | Read/export orders. |
| `/admin/orders/:id` | Order command center. | `OrderRequest` | Read order; gated actions per tab. |
| `/admin/create` | Create Order Request. | `OrderRequest` | Create order/allocation. |
| `/admin/imports` | Bulk import workspace. | Order/allocation import | Create/import. |
| `/admin/production` | Production work queue across vendors. | `ProductionJob` | Read/update where Admin allowed. |
| `/admin/production/:id` | Production job/detail. | `ProductionJob` | Read/update. |
| `/admin/shipments` | Shipment Batch list. | `ShipmentBatch` | Read/create/update/export batches. |
| `/admin/shipments/:id` | Shipment Batch detail. | `ShipmentBatch` | Read/update/close/reopen. |
| `/admin/shipments/:id/delivery-note` | Batch-scoped DN print. | `DeliveryNote` | Read/print owning batch DN. |
| `/admin/shipments/:id/labels` | Batch-scoped labels print. | Shipping Label | Read/print owning batch labels. |
| `/admin/delivery-notes` | DN register. | `DeliveryNote` | Read/print/export. |
| `/admin/delivery-notes/:id` | DN detail/print. | `DeliveryNote` | Read/print/verify through POD. |
| `/admin/pod` | POD verification queue. | `DeliveryConfirmation` | Verify/reject/request correction. |
| `/admin/pod/:id` | POD verification detail. | `DeliveryConfirmation` | Verify/reject/request correction. |
| `/admin/sales-points` | Sales Point list. | `SalesPoint` | Read/create/update/export. |
| `/admin/sales-points/:id` | Sales Point detail. | `SalesPoint` | Read/update/contact/allocation history. |
| Existing master routes | Suppliers, products, brands, clients, users, inbox. | Master data | Existing Admin permissions. |

`docs/ui-architecture-v2.md` uses `/admin/logistics/shipments` and `/admin/logistics/delivery-notes`; the user-requested package names target Admin routes as `/shipments`, `/delivery-notes`, and `/sales-points` under the Admin prefix. Implement with canonical route constants and support redirects from both forms:

- `/admin/logistics/shipments` -> `/admin/shipments`
- `/admin/logistics/shipments/:batchId` -> `/admin/shipments/:batchId`
- `/admin/logistics/delivery-notes` -> `/admin/delivery-notes`
- `/admin/logistics/pod` -> `/admin/pod`

### Vendor target routes

| Target route | Purpose | Primary entity | Required permissions |
| --- | --- | --- | --- |
| `/vendor` | Vendor dashboard. | Assigned summaries | Vendor assigned scope. |
| `/vendor/orders` | Assigned Order Requests. | `OrderRequest` | Read assigned. |
| `/vendor/orders/:id` | Vendor Order Workbench. | `OrderRequest`, `ProductionJob`, allocations, batches | Read/update assigned production and batches. |
| `/vendor/production` | Production queue. | `ProductionJob` | Update assigned production. |
| `/vendor/production/:id` | Production detail. | `ProductionJob` | Update assigned production. |
| `/vendor/shipments` | Assigned shipment batches. | `ShipmentBatch` | Read/update assigned batches. |
| `/vendor/shipments/:id` | Shipment detail. | `ShipmentBatch` | Draft/edit/dispatch/POD for assigned batch. |
| `/vendor/shipments/:id/delivery-note` | Batch DN print. | `DeliveryNote` | Read/print assigned batch DN. |
| `/vendor/shipments/:id/labels` | Batch labels print. | Shipping Label | Read/print assigned batch labels. |
| `/vendor/shipments/:id/pod` | POD upload for batch. | `DeliveryConfirmation` | Create/update assigned POD. |
| `/vendor/delivery-notes` | Assigned DN register. | `DeliveryNote` | Read/print assigned DNs. |
| `/vendor/pod` | POD upload/correction queue. | `DeliveryConfirmation` | Submit/correct assigned POD. |
| `/vendor/profile` | Vendor profile. | Vendor/User | Existing scope. |
| `/vendor/inbox` | Vendor inbox. | Message | Existing scope. |

## Navigation Changes

### Sidebar updates

Admin:

- Keep Dashboard.
- Keep Orders group:
  - All Orders
  - Order Tracking
  - Create OR
  - Imports
- Add Logistics group:
  - Shipment Batches -> `/admin/shipments`
  - Delivery Notes -> `/admin/delivery-notes`
  - POD Verification -> `/admin/pod`
- Keep Sales Points as primary route.
- Keep Suppliers, Products, Brands, Clients, Users, Inbox.

Vendor:

- Keep Dashboard.
- Keep Orders group:
  - My Orders -> `/vendor/orders`
  - Production -> `/vendor/production`
- Add Logistics group:
  - Shipment Batches -> `/vendor/shipments`
  - Delivery Notes -> `/vendor/delivery-notes`
  - POD Uploads -> `/vendor/pod`
- Keep Inbox and My Profile.

Operator:

- Add logistics routes only where delegated:
  - `/operator/shipments`
  - `/operator/delivery-notes`

Analyst:

- Add read-only logistics/reporting routes only if screens are available.

Client:

- Add `/client/orders` route to match existing sidebar.
- Expose verified delivery notes/POD only where permitted.

## Breadcrumb Strategy

Use `Header` breadcrumbs with explicit overrides for dynamic V2 detail pages. The current segment-based helper does not recognize batch IDs and DN IDs reliably.

Rules:

- Order detail: `All Orders -> OR-2026-000418`
- Order tab deep links if added later: `All Orders -> OR-2026-000418 -> Shipment Batches`
- Admin shipment detail: `Shipment Batches -> BATCH-20260318-0077`
- Admin DN print: `Shipment Batches -> BATCH-20260318-0077 -> Delivery Note`
- Admin POD detail: `POD Verification -> DEL202603180161`
- Sales Point detail: `Sales Points -> WH020`
- Vendor shipment detail: `Shipment Batches -> BATCH-20260318-0077`

Implementation requirements:

- Add route label constants for `shipments`, `delivery-notes`, `pod`, `production`, and `sales-points`.
- Treat dynamic IDs with prefixes `OR-`, `BATCH-`, `SHP-`, `DEL`, `DN-`, `sp_`, `batch_`, `dn_`, and route params as terminal breadcrumb labels.
- Detail pages should pass explicit `breadcrumbs` to `Header` once data is loaded.

## Route Guards

Route guards must enforce both route-level access and action-level permissions. UI hiding is not sufficient.

### Guard layers

1. Role prefix guard:
   - `/admin/*` requires Admin.
   - `/operator/*` requires Operator.
   - `/analyst/*` requires Analyst.
   - `/client/*` requires Client.
   - `/vendor/*` requires Vendor.

2. Entity scope guard:
   - Vendor routes must verify `vendorId` matches assigned vendor on the order, batch, DN, or POD record.
   - Client routes must verify `clientId` is within client scope.
   - Analyst is read-only.
   - Operator requires delegated action permissions.

3. Action guard:
   - Verify POD: Admin only unless explicit delegation exists.
   - Upload POD: Vendor assigned batch only.
   - Edit allocation: Admin/Operator only.
   - Create batch: Admin/Operator/Vendor, but Vendor assigned only.
   - Print DN/labels: requires access to owning batch.
   - Close/reopen batch: Admin only.

### Unauthorized behavior

- For no route access: render Not Found or Unauthorized without leaking entity details.
- For no entity scope: render Not Found-style message.
- For no action permission: disable action with concise reason.
- For direct mutation URL attempts: block command and show permission error.

## Permission Matrix

| Entity/action | Admin | Operator | Analyst | Vendor | Client |
| --- | --- | --- | --- | --- | --- |
| Order Request read | All | Delegated/all ops | Read all/report | Assigned | Own client scope |
| Order Request create | Yes | Yes | No | No | Yes where exposed |
| Order metadata update | Yes | Yes | No | No | Limited draft only if exposed |
| Cancel order | Yes | No by default | No | No | No |
| Production update | Yes | Delegated | No | Assigned | No |
| Sales Point read | Yes | Yes | Yes | Shipment context | Exposed own scope |
| Sales Point update | Yes | Import/delegated | No | No | No |
| Allocation create/update | Yes | Yes | No | Select outstanding only | Create in own order flow where exposed |
| Shipment Batch create | Yes | Yes | No | Assigned orders only | No |
| Shipment Batch update draft | Yes | Yes | No | Assigned draft only | No |
| Dispatch batch | Yes | Yes | No | Assigned ready batch | No |
| Close/reopen batch | Yes | No by default | No | No | No |
| Generate/print DN | Yes | Yes | Read/print if allowed | Assigned batch | Verified exposed only |
| Upload signed DN/POD | Correction only | No default | No | Assigned batch | No |
| Verify POD | Yes | Delegated only | No | No | No |
| Export | Yes | Delegated | Yes | Assigned only if allowed | Own scope if exposed |

## Migration Plan

### Route migration table

| Old route | New route or behavior |
| --- | --- |
| `/admin` | Keep. |
| `/admin/orders` | Keep. |
| `/admin/orders/:id` | Keep; refactor page. |
| `/admin/orders/:id/delivery-note` | Compatibility selector: if one batch, redirect to `/admin/shipments/:batchId/delivery-note`; if many, show batch selector; if none and legacy DN exists, Admin can create compatibility batch. |
| `/admin/orders/:id/packaging-labels` | Compatibility selector: if one batch, redirect to `/admin/shipments/:batchId/labels`; if many, show batch selector. |
| `/admin/logistics` | Redirect to `/admin/shipments`. |
| `/admin/logistics/shipments` | Redirect to `/admin/shipments`. |
| `/admin/logistics/shipments/:batchId` | Redirect to `/admin/shipments/:batchId`. |
| `/admin/logistics/delivery-notes` | Redirect to `/admin/delivery-notes`. |
| `/admin/logistics/pod` | Redirect to `/admin/pod`. |
| New | `/admin/production`, `/admin/production/:id`. |
| New | `/admin/shipments`, `/admin/shipments/:id`. |
| New | `/admin/delivery-notes`, `/admin/delivery-notes/:id`. |
| New | `/admin/pod`, `/admin/pod/:id`. |
| New | `/admin/sales-points/:id`. |
| `/vendor/orders` | Keep; add V2 columns/actions. |
| `/vendor/orders/:id` | Keep as Vendor Order Workbench. |
| `/vendor/update/:id` | Redirect to `/vendor/orders/:id`. |
| `/vendor/orders/:id/delivery-note` | Compatibility selector/default batch DN with vendor scope. |
| `/vendor/orders/:id/packaging-labels` | Compatibility selector/default batch labels with vendor scope. |
| New | `/vendor/production`, `/vendor/production/:id`. |
| New | `/vendor/shipments`, `/vendor/shipments/:id`. |
| New | `/vendor/shipments/:id/delivery-note`. |
| New | `/vendor/shipments/:id/labels`. |
| New | `/vendor/shipments/:id/pod`. |
| New | `/vendor/delivery-notes`. |
| New | `/vendor/pod`. |
| `/client/orders` | Add client order list or redirect intentionally to `/client/progress` until implemented. |

### Execution sequence

1. Add route constants and route metadata.
2. Add route guards and permission selector shape.
3. Add redirects for old logistics route variants.
4. Add Admin shipment, DN, POD, production, and Sales Point detail placeholder routes using existing shell.
5. Add Vendor production, shipment, DN, and POD routes.
6. Convert old order document routes to batch selector behavior.
7. Update sidebar and mobile sheet navigation.
8. Refactor `Header` breadcrumb labels for V2 segments.
9. Move route-specific action buttons behind permission view models.
10. Remove or hide legacy order-scoped document actions after batch-scoped equivalents are validated.

## Rollback Strategy

- Route additions are non-destructive; rollback by removing sidebar links while routes remain accessible for testing.
- Keep old order routes live throughout migration.
- If batch-scoped print fails, route compatibility pages can fall back to existing `DeliveryNotePrint`/`PackagingLabelsPrint` for single legacy orders only.
- Redirects should be implemented after target pages exist; if target pages fail, remove redirect and keep `/admin/logistics`.
- Route guards should initially log/disable actions before blocking full routes, then enforce once permissions are validated.

## Testing Requirements

- Route smoke tests for every Admin and Vendor target route.
- Redirect tests for `/vendor/update/:id` and `/admin/logistics/*`.
- Compatibility tests:
  - One order with one batch opens batch DN directly.
  - One order with multiple batches opens selector.
  - Vendor old print route only lists assigned batches.
- Permission tests for direct URL access by wrong role.
- Breadcrumb tests for Order, Batch, DN, POD, and Sales Point detail.
- Mobile sidebar tests to ensure new routes appear and fit in the Sheet.

## Acceptance Criteria

- All existing Admin/Vendor routes still load or redirect intentionally.
- New routes expose Shipment Batch, Delivery Note, POD, Production, and Sales Point detail surfaces.
- Old order print routes never silently merge multiple batches.
- Vendor cannot access other vendor batches through either new or compatibility routes.
- Admin and Vendor navigation remains recognizable and role-separated.
