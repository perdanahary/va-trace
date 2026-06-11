# Shipment Batch Functional Specification

## 1. Business Purpose

Shipment Batch Management represents the physical shipment event. It converts outstanding Sales Point Allocation quantities into concrete shipment lines, creates the source data for Delivery Notes and shipping labels, tracks dispatch and receipt progress, and supports partial shipment across multiple batches.

Shipment Batch is the logistics source of truth. Every shipped quantity, Delivery Note, label, and POD record must belong to a batch.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Vendor | Create draft batches, select allocation quantities, print documents, dispatch, upload POD. |
| Admin | Create/review batches, verify POD, correct received quantities, close batches, resolve exceptions. |
| Operator | Prepare batches and documents when delegated. |
| Analyst | View shipment metrics and history. |
| Client | View shipment progress when exposed. |

## 3. Preconditions

- Source Order Request exists and is not cancelled.
- Order has Sales Point Allocations with outstanding quantity.
- Vendor is assigned and eligible to ship the order.
- Required Sales Point delivery address exists or warning/exception policy is satisfied.
- Ready production quantity exists if shipment creation is gated by production readiness.
- User has permission to create or update shipment batches.

## 4. Workflow

1. User opens Order Detail Allocations, Vendor Order Workbench, or Shipment Batches list.
2. User starts Create Shipment Batch.
3. System lists eligible allocations with allocated, shipped, received, outstanding, ready quantity, Sales Point, geography, and product.
4. User selects one or more allocation lines.
5. User enters batch quantity per selected line; defaults to outstanding quantity.
6. System validates that batch quantity is positive and does not exceed outstanding quantity or ready quantity when enforced.
7. User saves draft or creates batch and generates Delivery Note.
8. System creates Shipment Batch, Shipment Items, batch number, and audit events.
9. User prints Delivery Note and labels.
10. User marks batch ready/dispatched/in transit.
11. Vendor uploads POD after delivery.
12. Admin verifies POD and received quantities.
13. Batch becomes partially received, fully received, or exception depending on verified quantities.
14. Admin closes batch once POD is verified and exceptions are resolved.

## 5. Status Lifecycle

| Status | Meaning | Entry Rule |
| --- | --- | --- |
| `DRAFT` | Batch is being prepared and may not have generated documents. | Saved from selected allocation lines. |
| `READY` | Batch has valid items and required documents can be printed. | Batch validated and DN generated or ready to generate. |
| `DISPATCHED` | Batch has left vendor/sender. | User marks dispatched with dispatch date. |
| `IN_TRANSIT` | Shipment is moving to Sales Point destinations. | Optional state after dispatch. |
| `PARTIALLY_RECEIVED` | Verified received quantity is greater than zero but lower than shipped quantity. | Admin verifies partial POD. |
| `FULLY_RECEIVED` | Verified received quantity equals shipped quantity for all batch lines. | Admin verifies full POD. |
| `CLOSED` | Batch is administratively complete. | Admin closes after POD and exceptions resolved. |

Terminal or controlled states:

- Cancel/delete draft: allowed only before dispatch and document policy permitting.
- Reopen closed batch: Admin-only correction with reason.

## 6. Validation Rules

- Batch must reference exactly one source Order Request.
- Batch may include multiple Sales Points and multiple products.
- Batch quantity must be greater than zero for each selected line.
- Batch quantity cannot exceed allocation outstanding quantity.
- Batch quantity cannot exceed production ready quantity when readiness gating is enabled.
- Same allocation may appear in multiple batches until fully shipped.
- Dispatched batch quantities cannot be edited without Admin correction.
- Delivery Note must be generated before print and before dispatch when DN is required.
- Labels must be generated before dispatch when label workflow is configured.
- Dispatch requires at least one shipment item.
- Close requires verified POD or approved exception resolution.
- Vendor can update only its own batches.

## 7. UI Components

- Shipment Batches list.
- Shipment Batch Detail with tabs: Items, Delivery Note, Labels, POD, Audit.
- Create Shipment Batch dialog or page.
- Allocation picker table.
- Batch summary panel.
- Batch status badge.
- Document status badge.
- POD status badge.
- Quantity progress summary.
- Print action buttons for DN and labels.
- POD evidence drawer.
- Close batch confirmation dialog.

## 8. Table Columns

Shipment Batches list:

| Column | Notes |
| --- | --- |
| Batch ID | Unique system ID. |
| Batch number | Human-readable sequence. |
| Order ID | Source Order Request. |
| Client PO | External reference. |
| Vendor | Execution partner. |
| Client | PMG customer. |
| Project | Campaign/activity. |
| Sales Point count | Distinct destinations. |
| Item count | Distinct shipment lines. |
| Shipped quantity | Sum of batch item quantities. |
| Received quantity | Sum of verified received quantities. |
| Dispatch date | Actual or planned dispatch date. |
| Batch status | Shipment lifecycle. |
| DN status | Delivery Note lifecycle. |
| POD status | Evidence verification state. |
| Action | Open, print, upload, verify, close. |

Shipment item table:

| Column | Notes |
| --- | --- |
| Sales Point code/name | Destination. |
| Product code/name | Material. |
| Allocated quantity | Planned allocation context. |
| Previously shipped | Quantity already shipped before this batch. |
| Shipped quantity | Quantity in this batch. |
| Received quantity | Verified received for this batch line. |
| Variance | Received minus shipped. |
| POD status | Pending, verified, rejected, correction. |
| Remarks | Operational note. |

## 9. Filters

- Search by batch ID, batch number, order ID, DN number, client PO, Sales Point code/name.
- Vendor.
- Client.
- Project.
- Batch status.
- Delivery Note status.
- POD status.
- Dispatch date range.
- Partial shipment.
- Partial delivery.
- Exception only.
- Sales Point geography.
- Product.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Create batch | Vendor, Admin, Operator | Creates shipment event from outstanding allocations. |
| Save draft | Vendor, Admin, Operator | Stores batch without dispatch. |
| Generate DN | Vendor, Admin, Operator | Creates batch-scoped Delivery Note. |
| Print DN | Vendor, Admin, Operator | Opens batch print view. |
| Print labels | Vendor, Admin, Operator | Opens label print view for batch items. |
| Mark dispatched | Vendor, Admin, Operator | Sets dispatch date/status. |
| Update draft quantity | Vendor, Admin, Operator | Changes batch lines before dispatch. |
| Upload POD | Vendor | Creates or updates Delivery Confirmation draft/submission. |
| Verify POD | Admin | Updates verified received quantities. |
| Reject/request correction | Admin | Sends POD back to Vendor without received quantity update. |
| Close batch | Admin | Finalizes batch after verification/resolution. |

## 11. Calculations

- Batch shipped quantity = sum of shipment item quantities.
- Batch received quantity = sum of verified received quantities.
- Batch variance = received quantity minus shipped quantity.
- Sales Point count = count of distinct Sales Points in batch lines.
- Item count = count of shipment item lines.
- Allocation outstanding before batch = allocated quantity minus shipped quantity from other batches.
- Allocation outstanding after batch = allocated quantity minus total shipped quantity including this batch.
- Partial shipment flag = at least one selected allocation is shipped below outstanding allocation.
- Partial delivery flag = verified received quantity is lower than shipped quantity for any line.
- Batch receipt progress = batch received quantity divided by batch shipped quantity.

## 12. Edge Cases

- Batch contains one Sales Point and one product.
- Batch contains multiple Sales Points and multiple products.
- Batch covers only part of one allocation.
- Batch contains all remaining outstanding allocation for an order.
- Same Sales Point allocation is split across several batches.
- Batch is drafted but never dispatched.
- Batch is dispatched with no POD uploaded.
- POD is uploaded for only some Sales Points in a batch.
- Verified POD shows shortage, overage, or damaged/missing items.
- Batch is created from legacy order delivery data as a compatibility batch.
- Address/contact data changes after batch creation; batch documents should use a captured snapshot.

## 13. Error Handling

- Block creation when no eligible outstanding allocations exist.
- Block quantity above outstanding allocation.
- Block negative or zero shipment quantity.
- Warn when Sales Point address/contact is incomplete.
- Block dispatch when required DN or labels are missing.
- Prevent editing dispatched quantities without Admin correction.
- Show conflict when outstanding quantity changed after user opened dialog.
- Preserve draft if document generation fails and allow retry.
- Reject unauthorized access to batches outside Vendor ownership.
- Require close failure reason when unresolved POD exceptions remain.

## 14. Audit Trail Requirements

Audit must record:

- Batch created, drafted, updated, dispatched, closed, reopened.
- Shipment item line additions, removals, and quantity changes.
- Allocation sources selected for batch.
- DN generated, printed, uploaded, verified, closed.
- Labels generated and printed.
- POD submitted, verified, rejected, correction requested.
- Received quantity corrections.
- Exception creation/resolution.
- Compatibility batch creation flag and source legacy data.

Each event must include actor, role, timestamp, previous value, new value, source screen, and reason where required.

## 15. Future Extension Points

- Multi-order shipment consolidation with explicit business approval.
- Courier/carrier integration.
- Route planning and delivery sequence.
- Geotagged dispatch and arrival events.
- Package-level barcode scanning.
- Split batch by Sales Point route.
- Shipment cost tracking.
- Automated exception rules for aging in transit or missing POD.
