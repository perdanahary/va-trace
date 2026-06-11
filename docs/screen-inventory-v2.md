# Screen Inventory V2

## Scope

This inventory maps the current VA Trace role structure to V2 screens for a Sales Point-centric distribution model. It preserves the existing Admin and Vendor surfaces while adding Shipment Batch, multiple Delivery Note, partial shipment, partial delivery, shipping label, and POD verification workflows.

## Admin Screens

### Admin Dashboard

Route: `/admin`

Purpose:

- Provide operational overview across demand, production, distribution, and POD.

Primary sections:

- Production status cards.
- Distribution status cards.
- Shipment batch status cards.
- POD verification backlog.
- Exception queue.
- Recent orders.
- Recent shipment batches.

Tables:

- Recent orders table.
- Shipment exceptions table.
- Pending POD table.

Filters:

- Client.
- Project.
- Vendor.
- Date range.
- Exception only.

Actions:

- Open order.
- Open shipment batch.
- Open POD verification.
- Create order.

### All Orders

Route: `/admin/orders`

Purpose:

- Demand-level order request list.
- Do not treat this as the shipment source of truth.

Table columns:

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

- Search: order ID, client PO, project, vendor, Sales Point code.
- Client.
- Project.
- Vendor.
- Production status.
- Distribution status.
- Deadline state.
- Delivery progress.
- POD exception.

Actions:

- Open details.
- Create shipment batch.
- View shipment batches.
- View delivery notes.
- View labels.
- Export CSV.

### Order Detail

Route: `/admin/orders/:id`

Purpose:

- Order command center across demand, production, allocations, shipments, documents, and POD.

Header actions:

- Create Shipment Batch.
- Print Documents.
- Raise Exception.
- Edit.
- Cancel.

Tabs:

- Overview.
- Allocations.
- Production.
- Shipment Batches.
- Delivery Notes.
- POD.
- Audit.

Overview content:

- Order summary.
- Client and project.
- Vendor.
- Deadline.
- Production status.
- Distribution status.
- Quantity summary.
- Missing document data warnings.

Allocation table:

- Sales Point code.
- Sales Point name.
- Zone.
- Region.
- Area.
- Sub Area.
- Product code.
- Product name.
- Allocated.
- Shipped.
- Received.
- Outstanding.
- POD status.
- Action.

Shipment table:

- Batch ID.
- Batch number.
- Sales Point count.
- Shipped quantity.
- Received quantity.
- Dispatch date.
- Batch status.
- Delivery Note status.
- POD status.
- Action.

Delivery Notes table:

- DN number.
- Batch ID.
- Sales Points.
- Shipped quantity.
- Generated at.
- Printed at.
- Status.
- Action.

POD table:

- POD ID.
- Batch ID.
- Sales Point.
- Receiver.
- Received date.
- Expected quantity.
- Actual received.
- Variance.
- Status.
- Action.

Filters:

- Product.
- Sales Point geography.
- Allocation status.
- Batch status.
- DN status.
- POD status.
- Exception state.

Actions:

- Add allocation to batch.
- Open Sales Point.
- Open Shipment Batch.
- Print DN.
- Print labels.
- Verify POD.
- View evidence.

### Create Order Request

Route: `/admin/create`

Purpose:

- Create order demand with item lines and Sales Point allocations.

Screen hierarchy:

- Order metadata.
- Client and project.
- Vendor assignment.
- Product lines.
- Sales Point allocations.
- Review and submit.

Allocation controls:

- Search Sales Point by code, name, region, area.
- Add single Sales Point.
- Bulk add from import.
- Allocate quantity by item and Sales Point.
- Validate allocated quantity against ordered quantity.

Tables:

- Product line table.
- Sales Point allocation table.

Filters:

- Sales Point geography.
- Client.
- Product.

Actions:

- Save draft.
- Submit.
- Import allocations.
- Remove allocation.

### Import Dispatch Workspace

Route: `/admin/imports`

Purpose:

- Bulk import PO lines, product mapping, vendor assignment, Sales Point matching, and allocation readiness.

V2 additions:

- Normalize imported rows into Order Requests and Sales Point Allocations.
- Show Sales Point matching confidence.
- Group by PO, client, project, vendor, Sales Point.
- Validate required logistics fields before dispatch.

Tables:

- Raw import rows.
- Grouped order requests.
- Allocation preview.
- Validation issues.

Filters:

- Import status.
- Vendor.
- Client.
- Sales Point match status.
- Product match status.
- Error only.

Actions:

- Upload file.
- Map columns.
- Assign vendor.
- Confirm Sales Point match.
- Create order requests.
- Export errors.

### Shipment Batches

Route: `/admin/logistics/shipments`

Purpose:

- Batch-level logistics list across all orders and vendors.

Table columns:

- Batch ID.
- Batch number.
- Order ID.
- Client PO.
- Vendor.
- Client.
- Project.
- Sales Point count.
- Shipped quantity.
- Received quantity.
- Dispatch date.
- Batch status.
- DN status.
- POD status.
- Action.

Filters:

- Search by batch ID, order ID, DN number, Sales Point code.
- Vendor.
- Client.
- Project.
- Batch status.
- DN status.
- POD status.
- Dispatch date range.
- Partial shipment.
- Partial delivery.
- Exception only.

Actions:

- Open batch.
- Print DN.
- Print labels.
- Verify POD.
- Close batch.

### Shipment Batch Detail

Route: `/admin/logistics/shipments/:batchId`

Purpose:

- Inspect and administer one physical shipment event.

Header actions:

- Print Delivery Note.
- Print Labels.
- Verify POD.
- Mark closed.
- Open source order.

Sections:

- Batch summary.
- Destination Sales Points.
- Shipment item lines.
- Delivery Note.
- Shipping labels.
- POD evidence.
- Audit timeline.

Tables:

- Shipment item lines by Sales Point and product.
- Delivery confirmations by Sales Point.
- Label register.

Filters:

- Sales Point.
- Product.
- POD status.
- Variance only.

Actions:

- Print DN.
- Print labels.
- Verify POD.
- Reject POD.
- Update received quantity.
- Request correction.

### Delivery Notes Register

Route: `/admin/logistics/delivery-notes`

Purpose:

- Search and audit all Delivery Notes independent of Order Detail.

Table columns:

- DN number.
- Shipment Batch ID.
- Order ID.
- Client PO.
- Vendor.
- Sales Point count.
- Shipped quantity.
- Generated at.
- Printed at.
- Uploaded at.
- DN status.
- POD status.
- Action.

Filters:

- DN number.
- Batch ID.
- Order ID.
- Vendor.
- Client.
- DN status.
- POD status.
- Printed date.
- Uploaded date.

Actions:

- Open print view.
- Open batch.
- Open POD evidence.
- Export register.

### Delivery Note Print

Route: `/admin/logistics/shipments/:batchId/delivery-note`

Compatibility route: `/admin/orders/:id/delivery-note`

Purpose:

- Print a single batch-scoped Delivery Note.

Content:

- QR code.
- Barcode.
- DN number.
- Shipment Batch ID.
- Sender snapshot.
- Destination snapshot.
- PO and SO numbers.
- Project.
- PIC project.
- Item lines.
- Ordered, shipped, outstanding quantities.
- Signature and stamp fields.

Actions:

- Print Delivery Note.
- Back to shipment batch.

### Shipping Labels Print

Route: `/admin/logistics/shipments/:batchId/labels`

Compatibility route: `/admin/orders/:id/packaging-labels`

Purpose:

- Print labels for all shipment batch lines.

Content per label:

- Label code.
- QR payload.
- Shipment Batch ID.
- DN number.
- Order ID.
- Product code.
- Product name.
- Quantity.
- Sales Point code.
- Destination.
- Project.

Actions:

- Print Labels.
- Back to shipment batch.

### POD Verification

Route: `/admin/logistics/pod`

Purpose:

- Verify or reject uploaded proof of delivery.

Queue columns:

- POD ID.
- Batch ID.
- DN number.
- Order ID.
- Vendor.
- Sales Point.
- Receiver.
- Received date.
- Expected shipped quantity.
- Claimed received quantity.
- Variance.
- Evidence count.
- Status.
- Action.

Detail drawer:

- Signed DN preview.
- POD photo gallery.
- Receiver name.
- Receiver phone if available.
- Submitted notes.
- Quantity comparison.
- Admin decision form.

Filters:

- Pending.
- Verified.
- Rejected.
- Vendor.
- Client.
- Project.
- Variance type.
- Submitted date.
- Missing signed DN.
- Missing photo.

Actions:

- Verify.
- Reject.
- Request correction.
- Update received quantity.
- Open batch.
- Open order.

### Sales Points

Route: `/admin/sales-points`

Purpose:

- Master data list for delivery destinations and Sales Point hierarchy.

Table columns:

- Zone.
- Region.
- Area.
- Sub Area.
- WCode.
- Sales Point.
- Client.
- Entity.
- PIC.
- Phone.
- Delivery instruction state.
- Action.

Filters:

- Search by Sales Point, WCode, PIC, note.
- Zone.
- Region.
- Area.
- Sub Area.
- Client.
- Missing contact.
- Missing address.

Actions:

- Open detail.
- Add mapping.
- Export CSV.

### Sales Point Detail

Route: `/admin/sales-points/:salesPointId`

Purpose:

- Show destination master data and its operational history.

Tabs:

- Profile.
- Contacts.
- Allocations.
- Shipment History.
- POD History.
- Notes.

Tables:

- Allocation history.
- Shipment history.
- POD history.

Actions:

- Edit profile.
- Add contact.
- Open order.
- Open batch.
- Open POD.

## Vendor Screens

### Vendor Dashboard

Route: `/vendor`

Purpose:

- Show vendor work queue across production, shipment, and POD.

Sections:

- Assigned orders.
- Production in progress.
- Ready for distribution.
- Shipment batches in draft or dispatched.
- POD upload required.
- Rejected POD.

Actions:

- Start production.
- Open order workbench.
- Create shipment batch.
- Upload POD.

### Vendor My Orders

Route: `/vendor/orders`

Purpose:

- Vendor-owned order list.

Columns:

- Client PO.
- Order Request.
- Project.
- Created date.
- Deadline.
- Production status.
- Distribution status.
- Ready quantity.
- Shipped quantity.
- POD status.
- Action.

Filters:

- Search by order ID, client PO, project.
- Production status.
- Distribution status.
- Ready for distribution.
- Pending POD.
- Rejected POD.

Actions:

- Start production.
- Update progress.
- Create shipment batch.
- View shipment batches.

### Vendor Order Workbench

Route: `/vendor/orders/:id`

Purpose:

- Vendor execution surface for production and shipment creation.

Tabs:

- Overview.
- Production.
- Eligible Allocations.
- Shipment Batches.
- Delivery Notes.
- POD Uploads.
- Complaint or exception responses.

Eligible allocation table:

- Sales Point.
- Product.
- Allocated.
- Already shipped.
- Outstanding.
- Ready quantity.
- Batch draft quantity.
- Action.

Actions:

- Update production status.
- Create shipment batch.
- Add allocation quantity to batch.
- Generate labels.
- Print Delivery Note.
- Upload POD.

### Vendor Shipment Batches

Route: `/vendor/shipments`

Purpose:

- Vendor batch queue.

Columns:

- Batch ID.
- Order ID.
- Client PO.
- Sales Point count.
- Shipped quantity.
- Dispatch date.
- Batch status.
- DN status.
- POD status.
- Action.

Filters:

- Search.
- Batch status.
- DN status.
- POD status.
- Dispatch date.
- Rejected POD.

Actions:

- Open batch.
- Print DN.
- Print labels.
- Upload POD.

### Vendor Shipment Detail

Route: `/vendor/shipments/:batchId`

Purpose:

- Batch execution and document handling.

Sections:

- Batch summary.
- Shipment items.
- Delivery Note.
- Labels.
- POD upload.
- Admin verification feedback.

Actions:

- Print Delivery Note.
- Print Labels.
- Mark dispatched.
- Upload signed DN.
- Upload POD photos.
- Resubmit corrected POD.

### Vendor POD Upload

Route: `/vendor/shipments/:batchId/pod`

Purpose:

- Upload proof of delivery for one batch.

Fields:

- Receiver name.
- Received date.
- Sales Point.
- Signed Delivery Note upload.
- POD photo upload.
- Received quantity per shipment item.
- Remarks.

Validation:

- Require signed DN.
- Require at least one POD photo when configured.
- Require received quantity per shipment item.
- Flag quantities above shipped quantity.

Actions:

- Save draft.
- Submit POD.
- Resubmit after rejection.

## Compatibility Screens

Existing print and progress screens can remain during migration:

| Existing Screen | V2 Behavior |
| --- | --- |
| `/admin/orders/:id/delivery-note` | Select or resolve a Shipment Batch before print. |
| `/admin/orders/:id/packaging-labels` | Select or resolve a Shipment Batch before label print. |
| `/vendor/orders/:id/delivery-note` | Same as Admin, constrained to vendor ownership. |
| `/vendor/orders/:id/packaging-labels` | Same as Admin, constrained to vendor ownership. |
| `/admin/progress` | Show production and distribution status as separate dimensions. |
| `/vendor/progress` | Show vendor progress by order and shipment batch. |

## Screen Priority

### Phase 1: Foundation

- All Orders V2 columns and filters.
- Order Detail tabs.
- Allocation table.
- Shipment Batch list and detail.
- Batch-scoped Delivery Note print.
- Batch-scoped label print.

### Phase 2: Execution

- Vendor Order Workbench.
- Vendor Shipment Detail.
- Vendor POD Upload.
- Admin POD Verification.
- Delivery Notes register.

### Phase 3: Optimization

- Sales Point Detail operational history.
- High-volume allocation table virtualization.
- Advanced reporting filters.
- Exception dashboards.
- Batch close workflow.
