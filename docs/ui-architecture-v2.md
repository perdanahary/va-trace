# UI Architecture V2

## Purpose

VA Trace V2 separates demand, production, and logistics execution while preserving the existing Admin and Vendor role structure. The UI remains a React 18, Vite, Tailwind CSS v4, and shadcn/ui single-page app using the current shell:

- `Sidebar` for role navigation.
- `Header` for page title, breadcrumbs, and page actions.
- `ContentArea` for responsive page layout.
- shadcn/ui primitives for buttons, cards, tables, dialogs, sheets, badges, selects, tabs, progress, and alerts.
- Tailwind utility classes and existing CSS custom properties from `src/index.css`.

The V2 IA makes Sales Point Allocation the distribution planning layer and Shipment Batch the logistics execution layer. Delivery Notes, shipping labels, and POD verification are generated from or attached to Shipment Batches, not directly from Orders.

## Architecture Principles

1. Order Request is demand.
   - It owns client, project, vendor assignment, ordered POSM items, and Sales Point allocations.
   - It does not represent a shipment.

2. Sales Point Allocation is the operational unit of distribution.
   - It answers what each Sales Point should receive.
   - It tracks allocated, shipped, received, and outstanding quantities.
   - It supports thousands of Sales Points and partial fulfillment.

3. Shipment Batch is the physical shipment event.
   - It groups one or more Sales Points and item quantities.
   - It can cover part of an order, part of a Sales Point allocation, or multiple Sales Points.
   - It owns dispatch status and delivery confirmations.

4. Delivery Note is generated from a Shipment Batch.
   - An Order can have multiple Shipment Batches.
   - Each Shipment Batch can have one Delivery Note.
   - Therefore an Order can have multiple Delivery Notes.

5. Shipping labels are generated from Shipment Batch items.
   - Labels should include shipment batch ID, delivery note number, order ID, product code, quantity, Sales Point code, destination, and QR payload.

6. POD verification is Admin-controlled.
   - Vendors upload scanned signed Delivery Notes and POD photos.
   - Admin verifies, rejects, or requests correction.
   - Verified received quantities update Sales Point allocations and derived distribution status.

## Role Surfaces

### Admin

Admin remains the control and verification surface.

Primary responsibilities:

- Monitor all order requests.
- Review production and distribution status separately.
- Manage Sales Point master data.
- Create, review, and adjust Sales Point allocations.
- Create or review Shipment Batches.
- Print Delivery Notes and shipping labels.
- Verify POD uploads.
- Resolve delivery exceptions and partial delivery discrepancies.

V2 navigation additions:

- Orders
  - All Orders
  - Order Tracking
  - Create OR
  - Imports
- Logistics
  - Shipment Batches
  - Delivery Notes
  - POD Verification
- Sales Points
- Suppliers
- Products
- Brands
- Clients
- Users
- Inbox

### Vendor

Vendor remains the execution surface.

Primary responsibilities:

- Accept assigned orders.
- Update production progress.
- Create shipment batches when goods are ready.
- Select Sales Points and quantities for each batch.
- Generate and print Delivery Notes.
- Print shipping labels.
- Upload POD evidence.
- Respond to rejected POD or quantity discrepancy cases.

V2 navigation additions:

- My Orders
- Production
- Shipment Batches
- POD Uploads
- Inbox
- My Profile

### Operator and Analyst

Operator and Analyst keep the existing Admin-derived structure with constrained actions.

- Operator can create orders, manage imports, view logistics, and prepare shipment documents.
- Analyst can view orders, progress, reports, and users, but should not mutate shipment or POD verification records.

### Client

Client remains a requester and visibility surface.

- Create orders.
- Upload/import order requests.
- Track production and distribution progress.
- View delivery progress by Sales Point.
- View verified delivery notes and POD status when exposed.

## Information Architecture

### Admin Route Hierarchy

| Area | Route Pattern | Purpose |
| --- | --- | --- |
| Dashboard | `/admin` | Operational overview with production, distribution, POD, and exception metrics. |
| All Orders | `/admin/orders` | Demand-level order request list. |
| Order Detail | `/admin/orders/:id` | Order command center with tabs for overview, allocations, production, shipment batches, delivery notes, POD, and audit. |
| Create OR | `/admin/create` | Order creation with Sales Point allocation step. |
| Imports | `/admin/imports` | Bulk PO and allocation import workspace. |
| Shipment Batches | `/admin/logistics/shipments` | Batch-level logistics tracker. |
| Shipment Detail | `/admin/logistics/shipments/:batchId` | Batch contents, documents, labels, and POD state. |
| Delivery Notes | `/admin/logistics/delivery-notes` | DN register across orders and batches. |
| Delivery Note Print | `/admin/logistics/shipments/:batchId/delivery-note` | Print view for a single batch delivery note. |
| Shipping Labels Print | `/admin/logistics/shipments/:batchId/labels` | Print view for labels generated from a batch. |
| POD Verification | `/admin/logistics/pod` | Queue for uploaded POD evidence and verification decisions. |
| Sales Points | `/admin/sales-points` | Master Sales Point table with geography, contacts, and client bindings. |
| Sales Point Detail | `/admin/sales-points/:salesPointId` | Allocation history, shipment history, POD history, contacts, and delivery instructions. |

### Vendor Route Hierarchy

| Area | Route Pattern | Purpose |
| --- | --- | --- |
| Dashboard | `/vendor` | Assigned work, production readiness, shipment queue, POD backlog. |
| My Orders | `/vendor/orders` | Vendor order list with production and distribution progress. |
| Order Workbench | `/vendor/orders/:id` | Production updates plus shipment batch creation for that order. |
| Shipment Batches | `/vendor/shipments` | Vendor batch queue. |
| Shipment Detail | `/vendor/shipments/:batchId` | Batch contents, label printing, DN printing, dispatch, POD upload. |
| Delivery Note Print | `/vendor/shipments/:batchId/delivery-note` | Print view for batch DN. |
| Shipping Labels Print | `/vendor/shipments/:batchId/labels` | Print labels for batch lines. |
| POD Upload | `/vendor/shipments/:batchId/pod` | Upload signed DN and POD photos with received quantities. |

Compatibility routes may remain for existing bookmarks:

- `/admin/orders/:id/delivery-note` resolves to the first or selected Shipment Batch delivery note.
- `/admin/orders/:id/packaging-labels` resolves to batch-scoped labels or asks the user to choose a batch.
- `/vendor/orders/:id/delivery-note` behaves the same.
- `/vendor/orders/:id/packaging-labels` behaves the same.

## Order Detail Screen Model

Order Detail becomes a command center with tabs. The header retains the current pattern:

- Title: Order ID.
- Breadcrumbs: All Orders > Order ID.
- Primary actions: Create Shipment Batch, Print Documents, Raise Exception, Edit, Cancel.

Recommended tabs:

| Tab | Purpose | Primary Data |
| --- | --- | --- |
| Overview | Demand, project, client, vendor, deadline, derived status. | Order Request, Project, Client, Vendor. |
| Allocations | Sales Point allocation table and progress. | Sales Point Allocations. |
| Production | Production job and item readiness. | Production Jobs, Order Items. |
| Shipment Batches | Physical shipment events. | Shipment Batches, Shipment Items. |
| Delivery Notes | Delivery note register for all batches in the order. | Delivery Notes. |
| POD | POD upload and verification status by batch and Sales Point. | Delivery Confirmations. |
| Audit | Timeline and status changes. | Order events and document events. |

Right rail summary:

- Ordered quantity.
- Allocated quantity.
- Shipped quantity.
- Received quantity.
- Outstanding quantity.
- Sales Points allocated.
- Sales Points fully received.
- Open POD issues.

## Tables and Filters

### All Orders

The All Orders table remains demand-oriented.

Columns:

- Client PO.
- Order Request.
- Client.
- Project.
- Vendor.
- Created date.
- Deadline.
- Production status.
- Distribution status.
- Delivery progress.
- Action.

Filters:

- Search by order ID, client PO, project, vendor, Sales Point code.
- Client.
- Project.
- Vendor.
- Production status.
- Distribution status.
- Delivery progress range.
- Deadline state.
- POD exception state.

Actions:

- Open details.
- Create shipment batch.
- View delivery notes.
- View labels.
- View POD.

### Sales Point Allocations

Allocation table is the primary V2 distribution table inside Order Detail and Sales Point Detail.

Columns:

- Sales Point code.
- Sales Point name.
- Zone.
- Region.
- Area.
- Sub Area.
- Product code.
- Product name.
- Allocated quantity.
- Shipped quantity.
- Received quantity.
- Outstanding quantity.
- Shipment batches.
- POD status.
- Exception.

Filters:

- Sales Point search.
- Zone, Region, Area, Sub Area.
- Product.
- Allocation status: not shipped, partially shipped, fully shipped, partially received, fully received.
- POD status.
- Exception only.

Actions:

- Add to shipment batch.
- View Sales Point.
- View batch history.
- Adjust allocation when permitted.

### Shipment Batches

Shipment Batch tables appear in Admin Logistics, Vendor Shipments, and Order Detail.

Columns:

- Batch ID.
- Batch number.
- Order ID.
- Client PO.
- Vendor.
- Sales Point count.
- Item count.
- Shipped quantity.
- Received quantity.
- Dispatch date.
- Batch status.
- Delivery Note status.
- POD status.
- Action.

Filters:

- Search by batch ID, order ID, DN number, Sales Point code.
- Vendor.
- Client.
- Project.
- Batch status.
- Delivery Note status.
- POD status.
- Dispatch date range.
- Partial only.
- Exceptions only.

Actions:

- Open batch.
- Print Delivery Note.
- Print labels.
- Dispatch.
- Upload POD.
- Verify POD.
- Close batch.

### Delivery Notes

Delivery Note register is document-oriented.

Columns:

- DN number.
- Shipment Batch ID.
- Order ID.
- Client PO.
- Sales Point count.
- Shipped quantity.
- Printed at.
- Uploaded at.
- Status.
- POD verification.
- Action.

Filters:

- Search by DN number, batch ID, order ID, Sales Point code.
- Status.
- Vendor.
- Client.
- Printed date.
- Uploaded date.
- Missing POD.

Actions:

- Open print view.
- Download or print.
- View batch.
- View POD.

### POD Verification

POD Verification is an Admin queue.

Columns:

- POD ID.
- Batch ID.
- DN number.
- Order ID.
- Sales Point.
- Receiver name.
- Received date.
- Submitted by.
- Submitted at.
- Claimed received quantity.
- Expected shipped quantity.
- Variance.
- Evidence count.
- Verification status.
- Action.

Filters:

- Search by POD ID, batch ID, DN number, order ID, Sales Point.
- Vendor.
- Client.
- Project.
- Status: pending, verified, rejected.
- Variance: none, shortage, overage.
- Evidence type: signed DN, photo.
- Submitted date range.

Actions:

- Open evidence.
- Verify.
- Reject with reason.
- Request correction.
- Update received quantities.

## Workflow Architecture

### Order to Shipment

1. Admin or Client creates Order Request.
2. Order captures project, vendor, item lines, and Sales Point allocations.
3. Vendor accepts and updates Production Job status.
4. Items become ready for distribution.
5. Vendor or Admin creates Shipment Batch from eligible Sales Point allocations.
6. Batch quantities may be less than allocated quantities to support partial shipment.
7. Delivery Note and shipping labels are generated from the batch.
8. Vendor dispatches batch.
9. Vendor uploads signed DN and POD photos.
10. Admin verifies received quantities.
11. Allocation shipped and received quantities update derived distribution status.
12. Order completes only when production is completed and all allocated quantities are fully received.

### Partial Shipment

Partial shipment is represented when:

- `shippedQuantity < allocatedQuantity` for one or more Sales Point allocations.
- One allocation may appear across multiple Shipment Batches.
- The UI shows outstanding quantity as `allocated - shipped`.

UI handling:

- Allocation rows display allocated, shipped, received, and outstanding.
- Batch creation defaults to outstanding quantity but permits lower quantity.
- Shipment Batch detail flags any line that only partially covers allocation.
- Order distribution status becomes `PARTIALLY_DISTRIBUTED`.

### Partial Delivery

Partial delivery is represented when:

- `receivedQuantity < shippedQuantity` for one or more shipment items after POD.
- POD evidence can claim lower actual received quantity.
- Admin verification updates received quantity.

UI handling:

- POD verification highlights variance.
- Shipment Batch status becomes `PARTIALLY_RECEIVED`.
- Allocation status becomes partially received.
- Order distribution status becomes `PARTIALLY_RECEIVED` until remaining quantities are resolved.

### Multiple Delivery Notes per Order

Because each Shipment Batch can generate one Delivery Note, an Order-level Delivery Notes tab lists all DNs:

- DN number.
- Batch ID.
- Sales Points.
- Shipped quantity.
- Status.
- POD verification status.
- Print action.

Order-level print actions must not silently merge DNs. They should either:

- Ask the user to select a batch.
- Print selected Delivery Notes as separate documents.
- Provide a compatibility default only where legacy routes require it.

## Screen Hierarchy Patterns

### List Screens

Use:

- Header with title and top-level actions.
- Search input on the left.
- Filter toggle, export, and create action on the right.
- `FilterSection` for advanced filters.
- `Card` containing a shadcn `Table`.
- Pagination or virtualized rows for high-volume Sales Point and allocation lists.

### Detail Screens

Use:

- Header with breadcrumbs and contextual actions.
- Main content in a responsive grid.
- Primary content column with tabs or section stack.
- Right rail summary for operational metrics.
- Tables for allocations, batches, documents, and POD.
- Dialogs or sheets for focused actions like create batch, verify POD, or upload evidence.

### Print Screens

Use:

- Existing print CSS approach in `src/index.css`.
- Dedicated page chrome class to hide app shell in print.
- A4 portrait for Delivery Notes.
- Label grid for shipping labels.
- Clear batch and DN identifiers in every printed artifact.

## Component Architecture

No new component system is required. Extend current primitives:

- `StatusBadge` should support production, distribution, shipment batch, delivery note, and POD statuses.
- `FilterSection` should remain the standard advanced filter layout.
- shadcn `Tabs` should organize Order Detail and Shipment Detail sections.
- shadcn `Dialog` or `Sheet` should handle create shipment batch, POD upload, and POD verification.
- shadcn `Table` should handle normal lists; use TanStack Table and virtualization only for high-volume allocation or Sales Point tables.
- lucide-react icons should be used for route and action icons.

Recommended shared domain components:

- `QuantityProgressSummary`: allocated, shipped, received, outstanding.
- `AllocationStatusBadge`: allocation-derived state.
- `ShipmentBatchStatusBadge`: wrapper around `StatusBadge`.
- `DocumentStatusBadge`: Delivery Note and label state.
- `PodStatusBadge`: pending, verified, rejected.
- `BatchSelector`: choose one or more shipment batches for printing.

These should follow the existing shadcn-style pattern, Tailwind utilities, `cn()`, and variant-based styling.

## Status Display

Status should be split in the UI:

| Status Type | Answers | Example Display |
| --- | --- | --- |
| Production Status | Where is manufacturing? | `QUALITY_CONTROL`, `READY_FOR_DISTRIBUTION`. |
| Distribution Status | How much allocation has moved and arrived? | `PARTIALLY_DISTRIBUTED`, `FULLY_RECEIVED`. |
| Shipment Batch Status | Where is this physical shipment event? | `DISPATCHED`, `PARTIALLY_RECEIVED`, `CLOSED`. |
| Delivery Note Status | Where is this logistics document? | `GENERATED`, `PRINTED`, `UPLOADED`, `VERIFIED`. |
| POD Status | Has evidence been verified? | pending, verified, rejected. |

The legacy blended order status remains as a compatibility label only.

## Data Ownership by Screen

| Screen | Source of Truth |
| --- | --- |
| All Orders | Order Request plus derived production and distribution fields. |
| Order Detail Overview | Order Request, Client, Project, Vendor. |
| Order Detail Allocations | Sales Point Allocations. |
| Order Detail Shipments | Shipment Batches. |
| Delivery Note Print | Shipment Batch and Delivery Note. |
| Shipping Labels Print | Shipment Batch items and labels. |
| POD Verification | Delivery Confirmations. |
| Sales Point Detail | Sales Point, allocations, shipment items, delivery confirmations. |
| Vendor Order Workbench | Order Request, Production Jobs, eligible allocations, Shipment Batches. |

## Responsive Behavior

Desktop:

- Sidebar visible.
- Detail pages use 2-column layout: main content plus right rail.
- Tables support horizontal overflow when needed.

Tablet:

- Main content remains single column when table density requires it.
- Right rail moves below main content.

Mobile:

- Sidebar uses current Sheet navigation.
- Filters collapse behind the filter button.
- Tables may use horizontal scroll for operational density.
- Critical actions remain in header or sticky bottom action group where needed.

## Non-Goals

- Do not replace the existing shadcn/ui component foundation.
- Do not introduce a separate design system.
- Do not merge Delivery Notes at the Order level as the default behavior.
- Do not make POD verification a Vendor approval action.
- Do not make Sales Point only a text field on an order; it must remain a first-class distribution entity.
