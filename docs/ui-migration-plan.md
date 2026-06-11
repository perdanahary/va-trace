# UI Migration Plan V2

## Objective

Migrate VA Trace from blended order fulfillment screens to a V2 UI architecture where:

- Sales Point Allocations drive distribution planning.
- Shipment Batches drive physical delivery execution.
- Delivery Notes and shipping labels are generated from Shipment Batches.
- Orders can have multiple Delivery Notes through multiple Shipment Batches.
- Partial shipment and partial delivery are first-class workflows.
- POD verification is an Admin workflow.
- Existing Admin and Vendor role structures remain recognizable.
- Existing shadcn/ui and Tailwind architecture remains the implementation foundation.

## Guardrails

- Do not replace the app shell.
- Do not introduce a new component library.
- Do not make Delivery Notes order-scoped in new screens.
- Do not collapse production and distribution into one status.
- Do not remove legacy order print routes until compatibility behavior exists.
- Keep Admin as verification owner and Vendor as execution owner.

## Phase 0: Documentation and Vocabulary Freeze

Status: current planning phase.

Deliverables:

- UI architecture.
- Screen inventory.
- Page-entity matrix.
- Low-fidelity wireframes.
- Migration plan.

Decisions to freeze:

- Order Request means demand.
- Sales Point Allocation means planned destination quantity.
- Shipment Batch means physical shipment event.
- Delivery Note belongs to Shipment Batch.
- POD belongs to Shipment Batch and Sales Point.
- Order completion is derived from production completion and full received allocation quantity.

## Phase 1: Navigation and Information Architecture

Goal:

- Add V2 logistics concepts to the IA without disrupting existing users.

Admin IA changes:

- Keep current Orders group.
- Add or rename Logistics area to expose:
  - Shipment Batches.
  - Delivery Notes.
  - POD Verification.
- Keep Sales Points as a primary Admin route.

Vendor IA changes:

- Keep My Orders.
- Add Shipment Batches.
- Add POD Uploads.
- Keep My Profile and Inbox.

Compatibility:

- Existing routes remain live.
- Existing order-level Delivery Note and packaging label routes redirect to a batch selector or compatible default.

Acceptance criteria:

- Admin can find orders, Sales Points, shipment batches, DNs, and POD queue from sidebar.
- Vendor can find orders, shipment batches, and POD uploads from sidebar.
- Breadcrumbs reflect the V2 hierarchy.

## Phase 2: Order List and Order Detail Refactor

Goal:

- Make Order screens demand-centered while exposing derived production and distribution state.

All Orders changes:

- Add columns for production status, distribution status, and delivery progress.
- Add filters for production status, distribution status, delivery progress, Sales Point, and POD exception.
- Keep legacy status only as secondary compatibility text where needed.

Order Detail changes:

- Convert content into tabs:
  - Overview.
  - Allocations.
  - Production.
  - Shipment Batches.
  - Delivery Notes.
  - POD.
  - Audit.
- Add right rail quantity summary:
  - Ordered.
  - Allocated.
  - Shipped.
  - Received.
  - Outstanding.
  - POD issues.

Allocation tab:

- Show Sales Point Allocation rows.
- Display allocated, shipped, received, outstanding.
- Allow batch creation from selected outstanding allocations.

Acceptance criteria:

- A user can distinguish manufacturing status from delivery status.
- A user can see which Sales Points are unshipped, partially shipped, partially received, or fully received.
- An order with multiple batches shows multiple Delivery Notes.

## Phase 3: Shipment Batch Workflow

Goal:

- Move logistics execution from order-level controls to batch-level screens.

New or upgraded screens:

- Admin Shipment Batches list.
- Admin Shipment Batch Detail.
- Vendor Shipment Batches list.
- Vendor Shipment Batch Detail.
- Create Shipment Batch dialog or page.

Batch creation requirements:

- Source from eligible Sales Point allocations.
- Support multiple Sales Points in one batch.
- Support partial allocation quantity.
- Validate batch quantity does not exceed allocation outstanding quantity.
- Generate batch number and batch ID.
- Allow draft before dispatch.

Batch detail requirements:

- Show item lines by Sales Point and product.
- Show shipped and received quantity.
- Show Delivery Note status.
- Show label state.
- Show POD state.
- Show audit timeline.

Acceptance criteria:

- A vendor can create a batch for only part of an order.
- A vendor can create multiple batches for the same order.
- A Sales Point allocation can be split across multiple batches.
- Admin can inspect all batches across vendors.

## Phase 4: Delivery Note and Shipping Label Migration

Goal:

- Make print documents batch-scoped.

Delivery Note changes:

- Generate DN from Shipment Batch.
- Include Shipment Batch ID.
- Include Sales Point destination snapshot.
- Include shipped quantity from the batch.
- Include outstanding quantity relative to the order allocation.
- Track DN status:
  - Generated.
  - Printed.
  - Signed.
  - Uploaded.
  - Verified.
  - Closed.

Shipping Label changes:

- Generate labels from Shipment Batch items.
- Include:
  - Label code.
  - QR payload.
  - Batch ID.
  - DN number.
  - Order ID.
  - Product code.
  - Quantity.
  - Sales Point code.
  - Destination.

Compatibility behavior:

- `/admin/orders/:id/delivery-note` opens a batch selector when more than one batch exists.
- `/admin/orders/:id/packaging-labels` opens a batch selector when more than one batch exists.
- Vendor routes follow the same rule with vendor access checks.

Acceptance criteria:

- An order with three shipment batches produces three separate Delivery Notes.
- Printing labels for a batch prints only that batch's shipped items.
- Legacy order print routes do not silently merge multiple batches into one document.

## Phase 5: POD Upload and Verification

Goal:

- Introduce Vendor upload and Admin verification of proof of delivery.

Vendor POD Upload:

- Attach POD to Shipment Batch.
- Capture receiver name.
- Capture received date.
- Upload signed Delivery Note.
- Upload POD photos.
- Enter received quantity per shipment item.
- Submit for Admin verification.

Admin POD Verification:

- Queue pending POD records.
- Preview signed DN and photos.
- Compare shipped quantity against claimed received quantity.
- Verify, reject, or request correction.
- Require reason when rejecting.

Quantity update rules:

- Verified POD updates shipment item received quantity.
- Sales Point Allocation received quantity is derived from verified shipment items.
- Partial delivery is represented when verified received quantity is lower than shipped quantity.
- Rejected POD does not update received quantity.

Acceptance criteria:

- Vendor can submit POD for each batch.
- Admin can verify or reject evidence.
- Partial delivery creates visible variance.
- Distribution status updates from verified received quantities.

## Phase 6: Sales Point-Centric Enhancements

Goal:

- Make Sales Point a first-class operational destination across screens.

Sales Points list changes:

- Add filters for missing address, missing contact, delivery issue, recent POD exception.
- Keep geography filters: Zone, Region, Area, Sub Area.

Sales Point Detail:

- Add tabs:
  - Profile.
  - Contacts.
  - Allocations.
  - Shipment History.
  - POD History.
  - Notes.

Operational history:

- Show orders and batches involving the Sales Point.
- Show allocation, shipped, received, and variance by product.
- Show repeated delivery issues.

Acceptance criteria:

- Admin can answer what a Sales Point should receive, what has shipped, what was received, and which PODs are outstanding.
- Sales Point contact and delivery instruction issues are visible before shipment.

## Phase 7: Reporting and Dashboard Updates

Goal:

- Reflect V2 status separation and logistics metrics.

Dashboard updates:

- Production metrics:
  - In production.
  - In QC.
  - Ready for distribution.
  - Production completion rate.

- Distribution metrics:
  - Allocated quantity.
  - Shipped quantity.
  - Received quantity.
  - Delivery progress percentage.
  - Exception count.

- Sales Point metrics:
  - Total Sales Points.
  - Allocated Sales Points.
  - Dispatched Sales Points.
  - Fully received Sales Points.
  - Pending Sales Points.

- Vendor metrics:
  - Production SLA.
  - Distribution SLA.
  - POD compliance.
  - Shipment batch closure rate.

Acceptance criteria:

- Dashboard no longer relies only on blended legacy order status.
- Exceptions and POD backlog are visible without opening each order.

## Data Migration UI Considerations

Existing order data may contain item-level delivered quantity and generated labels without explicit batch records. The UI should support a compatibility migration:

1. For each legacy order with delivered quantities, create a default Shipment Batch.
2. Assign existing delivered line quantities to that default batch.
3. Create one default Delivery Note record for the batch when legacy DN data exists.
4. Bind existing labels to the default batch when label records exist.
5. Mark the default batch with a compatibility flag in Admin-only detail or audit.

UI behavior during migration:

- Show a warning when an order has legacy delivery data without explicit batches.
- Let Admin generate a default compatibility batch.
- Prevent creating new Delivery Notes directly from the order once any V2 batch exists.

## Component Migration Plan

Existing components to preserve:

- `Sidebar`.
- `Header`.
- `ContentArea`.
- `FilterSection`.
- shadcn `Button`, `Card`, `Table`, `Dialog`, `Sheet`, `Tabs`, `Select`, `Badge`, `Progress`, `Alert`.
- `StatusBadge`, extended for V2 statuses.

Recommended new domain components:

- Quantity progress summary.
- Allocation table.
- Shipment batch table.
- Batch creation dialog.
- Batch selector dialog.
- Delivery Note register table.
- POD evidence drawer.
- POD verification decision form.
- Shipping label card.

Styling constraints:

- Use Tailwind utilities.
- Use existing color tokens.
- Use status tokens for success, warning, processing, destructive.
- Use lucide-react icons.
- Avoid inline arbitrary colors unless already documented.
- Keep cards as containers for tables, detail panels, and repeated items.

## Route Migration Plan

| Current Route | V2 Route or Behavior |
| --- | --- |
| `/admin/orders` | Keep. Add V2 status and progress columns. |
| `/admin/orders/:id` | Keep. Convert to tabbed command center. |
| `/admin/orders/:id/delivery-note` | Compatibility route to batch selector or default batch DN. |
| `/admin/orders/:id/packaging-labels` | Compatibility route to batch selector or default batch labels. |
| `/admin/logistics` | Replace or redirect to `/admin/logistics/shipments`. |
| New | `/admin/logistics/shipments`. |
| New | `/admin/logistics/shipments/:batchId`. |
| New | `/admin/logistics/shipments/:batchId/delivery-note`. |
| New | `/admin/logistics/shipments/:batchId/labels`. |
| New | `/admin/logistics/delivery-notes`. |
| New | `/admin/logistics/pod`. |
| `/vendor/orders` | Keep. Add V2 columns and actions. |
| `/vendor/orders/:id` | Keep as Vendor Order Workbench. |
| `/vendor/update/:id` | Redirect to `/vendor/orders/:id` when workbench is ready. |
| New | `/vendor/shipments`. |
| New | `/vendor/shipments/:batchId`. |
| New | `/vendor/shipments/:batchId/delivery-note`. |
| New | `/vendor/shipments/:batchId/labels`. |
| New | `/vendor/shipments/:batchId/pod`. |

## Workflow Migration Checklist

### Order Creation

- Add Sales Point allocation step.
- Validate total allocation against ordered quantity.
- Show Sales Point contact and address completeness.
- Preserve current Create OR layout conventions.

### Production Updates

- Split production actions from distribution actions.
- Let Vendor update manufacturing readiness.
- Avoid using production actions to imply delivered state.

### Batch Creation

- Create from outstanding Sales Point allocations.
- Allow partial batch quantity.
- Generate batch summary before save.
- Save as draft or generate DN immediately.

### Dispatch

- Require batch items.
- Require Delivery Note generated.
- Require labels generated when label workflow is configured.
- Change batch status to dispatched or in transit.

### POD

- Vendor uploads evidence.
- Admin verifies.
- Verified received quantities update distribution.
- Rejected POD returns to Vendor with reason.

### Closure

- Close batch when POD is verified and exceptions are resolved.
- Close order only when production completed and all allocation quantities are fully received.

## Testing and QA Plan

Functional scenarios:

- One order, one Sales Point, one full shipment, full delivery.
- One order, one Sales Point, two partial shipments.
- One order, multiple Sales Points, one shipment batch.
- One order, multiple Sales Points, multiple shipment batches.
- One shipment batch, partial delivery on one item.
- One order with multiple Delivery Notes.
- Vendor POD upload rejected by Admin and resubmitted.
- Legacy order-level print route with one batch.
- Legacy order-level print route with multiple batches.

Screen QA:

- Admin All Orders filters and progress columns.
- Order Detail tabs and right rail.
- Shipment Batch list filters.
- Shipment Batch Detail document actions.
- Delivery Note print A4 layout.
- Shipping labels print layout.
- POD verification drawer.
- Vendor Order Workbench.
- Vendor POD Upload.
- Sales Point Detail history.

Regression checks:

- Existing Admin routes still load.
- Existing Vendor routes still load or redirect intentionally.
- Existing print CSS remains scoped.
- Existing sidebar and header behavior remains intact.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Users expect one Delivery Note per Order. | Add batch selector and clear Delivery Notes tab on Order Detail. |
| Partial shipment creates quantity confusion. | Always show allocated, shipped, received, and outstanding together. |
| POD verification updates wrong quantities. | Update received quantities only after Admin verification. |
| Sales Point matching errors during import. | Add import validation and Sales Point match confidence. |
| Legacy delivered quantities lack batch IDs. | Create compatibility default batches. |
| Tables become too dense on small screens. | Keep horizontal scrolling and use filters instead of oversized mobile cards. |
| Status labels regress to blended order status. | Display production and distribution statuses separately in list and detail screens. |

## Recommended Implementation Order

1. Extend status badge vocabulary and table columns for V2 status visibility.
2. Add Order Detail tabs and allocation table.
3. Add Shipment Batch list and detail.
4. Move Delivery Note and label print routes to batch-scoped routes.
5. Add batch selector for legacy order-scoped document routes.
6. Add Vendor batch creation workflow.
7. Add Vendor POD upload.
8. Add Admin POD verification.
9. Add Sales Point Detail operational history.
10. Update dashboards and reporting.

## Definition of Done

V2 UI migration is complete when:

- Every shipped quantity belongs to a Shipment Batch.
- Every Delivery Note belongs to a Shipment Batch.
- Every printed shipping label belongs to a Shipment Batch item or package.
- Every received quantity comes from verified POD or approved Admin correction.
- Orders can display multiple Delivery Notes.
- Partial shipment and partial delivery are visible in tables, filters, and detail screens.
- Admin can verify POD evidence.
- Vendor can execute production, shipment, labels, DN print, and POD upload without Admin-only screens.
- Existing Admin and Vendor role structures remain intact.
