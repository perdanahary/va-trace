# Production Management Functional Specification

## 1. Business Purpose

Production Management tracks manufacturing execution separately from logistics execution. It allows Vendors to communicate print, finishing, QC, and ready-for-distribution progress without implying that goods have shipped or been received.

The production workflow determines which quantities are eligible for shipment batch creation, supports partial readiness, and feeds dashboards, order details, and vendor work queues.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Vendor | Accept order, update production jobs, report ready quantities, add production notes. |
| Admin | Monitor production, correct or override status with reason, resolve escalations. |
| Operator | View and coordinate production updates; may update status if operationally delegated. |
| Analyst | View production metrics and status history. |
| Client | View production progress when exposed. |

## 3. Preconditions

- Order Request has been submitted and assigned to a Vendor.
- Order contains at least one valid Order Item.
- Production jobs are initialized from Order Items.
- Vendor user is associated with the assigned Vendor.
- Order is not cancelled.

## 4. Workflow

1. Submitted order appears in Vendor My Orders and Vendor Dashboard.
2. Vendor opens Order Workbench and accepts the order.
3. Vendor starts production and moves job/item status through printing, finishing, QC, and ready-for-distribution.
4. Vendor records ready quantity per item when partial readiness is allowed.
5. System updates production status at order level from job/item statuses.
6. Ready quantity becomes eligible for shipment batch creation, subject to outstanding allocation constraints.
7. Admin monitors production delays, QC status, and ready-for-distribution counts from dashboard and order detail.
8. Production is marked complete only when all production jobs/items are complete.
9. Production completion alone does not complete the order; all allocated quantities must also be received.

## 5. Status Lifecycle

| Status | Meaning | Allowed Next Status |
| --- | --- | --- |
| `NEW` | Order created but not submitted or not yet ready for vendor execution. | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | Sent to Vendor and awaiting acceptance. | `ACCEPTED`, `CANCELLED` |
| `ACCEPTED` | Vendor has acknowledged the order. | `PRINTING`, `CANCELLED` |
| `PRINTING` | Production/printing has started. | `FINISHING`, `QUALITY_CONTROL`, `CANCELLED` |
| `FINISHING` | Finishing, packing, or assembly is underway. | `QUALITY_CONTROL`, `CANCELLED` |
| `QUALITY_CONTROL` | Produced goods are being inspected. | `READY_FOR_DISTRIBUTION`, `PRINTING`, `FINISHING`, `CANCELLED` |
| `READY_FOR_DISTRIBUTION` | Some or all goods are ready to ship. | `COMPLETED`, `QUALITY_CONTROL`, `CANCELLED` |
| `COMPLETED` | Production is complete for all items. | none except Admin correction |
| `CANCELLED` | Production will not proceed. | none except Admin reopen policy |

Backward movement requires Admin or authorized correction with a reason.

## 6. Validation Rules

- Vendor can update only assigned orders.
- Production quantity cannot exceed ordered quantity.
- Ready quantity cannot exceed completed/QC-approved quantity when item-level QC is tracked.
- Ready quantity cannot be negative.
- Order-level `COMPLETED` requires all item production jobs to be complete.
- Production cannot move to `READY_FOR_DISTRIBUTION` without at least one ready quantity.
- Shipment batch creation should not exceed ready quantity when ready quantity gating is enabled.
- Cancelled orders cannot receive production updates.
- Admin overrides require a reason.

## 7. UI Components

- Vendor Dashboard work queue cards: pending acceptance, in production, ready for distribution, POD due.
- Vendor My Orders table with production status and ready quantity.
- Vendor Order Workbench Production tab.
- Production update dialog or sheet.
- Item-level progress table.
- StatusBadge for production lifecycle.
- Quantity progress summary showing ordered, ready, shipped, received.
- Admin Order Detail Production tab.
- Audit timeline for status and quantity changes.

## 8. Table Columns

Production item table:

| Column | Notes |
| --- | --- |
| Product code | SKU/material code. |
| Product name | POSM material name. |
| Ordered quantity | Demand quantity. |
| Produced quantity | Quantity reported produced. |
| QC quantity | Quantity passed QC when tracked. |
| Ready quantity | Quantity eligible for shipment. |
| Shipped quantity | Derived from shipment batches. |
| Outstanding ready | Ready quantity minus shipped quantity. |
| Production status | Item/job status. |
| Last update | Timestamp and actor summary. |
| Action | Update progress, notes, view audit. |

Vendor My Orders production columns:

| Column | Notes |
| --- | --- |
| Client PO | External reference. |
| Order Request | Internal order ID. |
| Project | Campaign/activity. |
| Deadline | Required delivery target. |
| Production status | Current manufacturing state. |
| Ready quantity | Quantity available for batch creation. |
| Shipped quantity | Derived logistics progress. |
| POD status | Indicates downstream blockers. |
| Action | Start/update/create batch. |

## 9. Filters

- Search by order ID, client PO, project, product code.
- Production status.
- Ready for distribution.
- Deadline state.
- Client.
- Project.
- Vendor for Admin views.
- Production delay or SLA breach.
- QC pending.
- Partial ready quantity.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Accept order | Vendor | Moves order from `SUBMITTED` to `ACCEPTED`. |
| Start production | Vendor | Moves job/order to `PRINTING`. |
| Update item progress | Vendor | Changes item/job status and quantities. |
| Mark ready | Vendor | Records quantity eligible for distribution. |
| Add production note | Vendor, Admin, Operator | Adds operational context to audit. |
| Request correction | Admin | Sends issue back to Vendor with reason. |
| Override status | Admin | Corrects production status with audit reason. |
| Export production list | Admin, Analyst | Exports visible production metrics. |

## 11. Calculations

- Produced percentage = produced quantity divided by ordered quantity.
- Ready percentage = ready quantity divided by ordered quantity.
- Outstanding ready quantity = ready quantity minus shipped quantity.
- Production lead time = time from vendor acceptance to production completion.
- QC aging = time spent in `QUALITY_CONTROL`.
- Ready aging = time since ready quantity was first reported and not fully shipped.
- Order production status is derived from the least advanced active item/job unless a terminal cancellation applies.

## 12. Edge Cases

- Vendor accepts an order but has not started production.
- Some items are ready while other items remain in printing or QC.
- Ready quantity exists for one product but not another.
- An item fails QC and must move backward to printing or finishing.
- Production is complete but no shipment batch has been created.
- Shipment has started before all production is complete because partial shipment is allowed.
- Admin corrects an erroneous Vendor update after batch creation; shipped quantities must remain batch-owned.
- Production is cancelled after partial shipment; distribution status must continue to reflect already shipped/received quantities.

## 13. Error Handling

- Block updates from unauthorized vendor users.
- Block status transitions that skip required acceptance unless Admin override is used.
- Block ready quantity above ordered quantity.
- Warn when ready quantity is below selected batch quantity.
- Preserve pending form values when update submission fails.
- Show conflict message when another user updated the same item before save.
- Require reason for rollback, cancellation, or Admin override.
- Show read-only state for cancelled and completed orders unless correction permissions apply.

## 14. Audit Trail Requirements

Audit must record:

- Vendor acceptance timestamp.
- Every production status transition.
- Produced, QC, and ready quantity changes.
- Production notes and attachments if introduced.
- Admin override and correction reasons.
- Item-level status changes.
- Reopen or rollback events.
- Production completion event.

Each audit event must identify actor, role, vendor, source screen, previous value, new value, timestamp, and optional remarks.

## 15. Future Extension Points

- Item-level production task breakdown by printing, cutting, finishing, packing, and QC.
- QC defect reason codes and rework tracking.
- Production attachments or sample approval photos.
- Production SLA alerts and escalation rules.
- Vendor capacity planning.
- Barcode scan confirmation from production floor.
- Integration with ERP/manufacturing systems.
- Automated batch eligibility based on ready quantity and packing completion.
