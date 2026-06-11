# Order Management Functional Specification

## 1. Business Purpose

Order Management captures demand from PMG, Client, or Operator users and keeps that demand separate from production and physical shipment execution. An Order Request defines who requested the work, which project it belongs to, which vendor is responsible, which POSM items are required, and which Sales Points should receive each item.

The order is the command center for fulfillment visibility, but it is not the source of truth for shipped or received quantities. Distribution quantities are derived from Sales Point Allocations, Shipment Batches, and verified POD records.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Admin | Create, edit, cancel, monitor, allocate, create batches, resolve exceptions, view audit. |
| Operator | Create orders, manage imports, prepare allocations and shipment documents within permitted scope. |
| Analyst | View orders, statuses, reports, and audit without mutating fulfillment records. |
| Client | Create order requests, import requests, and track fulfillment when exposed. |
| Vendor | Accept assigned orders, update production, create shipment batches, print documents, upload POD. |

## 3. Preconditions

- Client exists and is active.
- Project exists or can be created during order creation where permitted.
- Vendor exists and is eligible for assignment.
- Product master contains every POSM item on the request.
- Sales Points exist as reusable master records; free-text destinations are not valid for V2 allocation.
- Required Sales Point address and contact completeness warnings are available before submission.

## 4. Workflow

1. User starts a new Order Request from Create OR, Client Create Order, or Import Workspace.
2. User enters metadata: client PO, project, client, vendor, deadline, requester, remarks, and supporting references.
3. User adds product lines with SKU/material code, description/specification, ordered quantity, unit, and optional line notes.
4. User adds Sales Point Allocations by selecting Sales Points manually or from import matching.
5. User allocates item quantities to Sales Points.
6. System validates that allocation totals do not exceed ordered quantities.
7. User saves draft or submits the request.
8. On submit, production jobs are initialized for vendor execution.
9. Vendor accepts and updates production status independently from distribution status.
10. Admin or Vendor creates Shipment Batches only from eligible outstanding allocations.
11. Delivery Notes, labels, POD, and received quantities are displayed on Order Detail but remain batch-scoped.
12. Order completion is derived only when production is completed and all allocated quantities are fully received.

## 5. Status Lifecycle

Production status:

| Status | Meaning | Entry Rule |
| --- | --- | --- |
| `NEW` | Draft or newly created request not yet submitted to vendor execution. | Created as draft. |
| `SUBMITTED` | Request is submitted and awaiting vendor acceptance. | User submits a valid order. |
| `ACCEPTED` | Vendor has acknowledged responsibility. | Vendor accepts assignment. |
| `PRINTING` | Manufacturing has started. | Vendor starts print or production work. |
| `FINISHING` | Finishing/assembly is underway. | Vendor marks printing complete and finishing started. |
| `QUALITY_CONTROL` | Items are under QC. | Vendor marks finishing complete and QC started. |
| `READY_FOR_DISTRIBUTION` | Produced quantity is ready to ship. | Vendor marks ready quantity available. |
| `COMPLETED` | Production is complete for all ordered items. | All production jobs/items complete. |
| `CANCELLED` | Demand has been cancelled. | Authorized user cancels before closure. |

Distribution status:

| Status | Meaning |
| --- | --- |
| `NOT_STARTED` | No allocation quantity has been shipped. |
| `PARTIALLY_DISTRIBUTED` | Some, but not all, allocated quantity has been shipped. |
| `FULLY_DISTRIBUTED` | All allocated quantity has been shipped, but receipt may still be pending. |
| `PARTIALLY_RECEIVED` | Some verified received quantity exists but not all allocation quantity is fully received. |
| `FULLY_RECEIVED` | All allocated quantity has been verified as received. |
| `EXCEPTION` | A blocking delivery, quantity, address, POD, or cancellation issue exists. |

Completion rule:

- Order may show business completion only when production status is `COMPLETED` and distribution status is `FULLY_RECEIVED`.
- Legacy blended order status may be displayed as compatibility text only and must not drive V2 calculations.

## 6. Validation Rules

- Client PO is required unless configured as optional for the client.
- Client, project, vendor, and deadline are required before submission.
- At least one product line is required.
- Product line quantity must be greater than zero.
- Product line SKU/material code must resolve to product master or be explicitly mapped during import.
- At least one Sales Point Allocation is required before submission.
- Allocated quantity for each product must not exceed ordered quantity.
- Allocated quantity may be less than ordered quantity only when saved as draft or submitted with an approved under-allocation reason.
- Sales Point must belong to or be valid for the selected client/project context.
- Cancelled orders cannot create new shipment batches or documents.
- Orders with V2 shipment batches cannot create new order-scoped Delivery Notes.
- Vendor can update production for assigned orders only.
- Vendor cannot change original allocation quantities without Admin/Operator approval.

## 7. UI Components

- Page shell: Sidebar, Header, ContentArea.
- Order list card with shadcn Table.
- FilterSection for advanced search.
- Order Detail tabs: Overview, Allocations, Production, Shipment Batches, Delivery Notes, POD, Audit.
- Right rail Quantity Progress Summary.
- StatusBadge variants for production, distribution, POD, document, and exception states.
- Create/Edit Order form with metadata, product lines, allocation step, and review step.
- Batch creation dialog launched from Order Detail or allocation rows.
- Batch selector dialog for legacy document routes.
- Audit timeline panel.

## 8. Table Columns

All Orders:

| Column | Notes |
| --- | --- |
| Client PO | Searchable external reference. |
| Order Request | Internal order ID. |
| Client | Client name. |
| Project | Campaign/activity. |
| Vendor | Assigned execution partner. |
| Created date | Request creation timestamp. |
| Deadline | Required delivery target. |
| Production status | Manufacturing lifecycle. |
| Distribution status | Derived allocation movement and receipt. |
| Delivery progress | Received quantity over allocated quantity. |
| Action | Open, batch, documents, POD, export options. |

Order Detail allocation table:

| Column | Notes |
| --- | --- |
| Sales Point code/name | Destination identity. |
| Zone/Region/Area/Sub Area | Geography hierarchy. |
| Product code/name | Allocated product. |
| Allocated | Planned quantity. |
| Shipped | Sum of batch shipment items. |
| Received | Sum of verified POD quantities. |
| Outstanding | Allocated minus shipped. |
| POD status | Pending, verified, rejected, variance. |
| Action | Add to batch, view Sales Point, view history. |

## 9. Filters

- Text search by order ID, client PO, project, vendor, Sales Point code/name.
- Client.
- Project.
- Vendor.
- Production status.
- Distribution status.
- Deadline state: upcoming, due soon, overdue, no deadline.
- Delivery progress range.
- POD exception state.
- Sales Point geography on allocation-focused views.
- Product on allocation-focused views.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Save draft | Admin, Operator, Client | Stores incomplete order without starting vendor execution. |
| Submit order | Admin, Operator, Client | Validates and initializes production workflow. |
| Edit order metadata | Admin, Operator | Updates demand fields before closure. |
| Add/remove product line | Admin, Operator | Changes demand before shipment-dependent lock rules apply. |
| Add/remove allocation | Admin, Operator | Changes planned distribution before shipped quantity exists. |
| Accept order | Vendor | Moves production status to `ACCEPTED`. |
| Update production | Vendor | Updates production job/item status and ready quantity. |
| Create shipment batch | Admin, Operator, Vendor | Converts outstanding allocations into draft or ready batch. |
| Print documents | Admin, Operator, Vendor | Opens batch selector or batch-scoped print view. |
| Raise exception | Admin, Operator, Vendor | Records operational issue and may set distribution exception. |
| Cancel order | Admin | Prevents new fulfillment activity and records reason. |
| Export orders | Admin, Operator, Analyst | Exports visible demand and derived status fields. |

## 11. Calculations

- Ordered quantity = sum of order item quantities.
- Allocated quantity = sum of Sales Point Allocation quantities.
- Shipped quantity = sum of Shipment Item quantities for all batches under the order.
- Received quantity = sum of Admin-verified Delivery Confirmation quantities.
- Outstanding allocation quantity = allocated quantity minus shipped quantity.
- Delivery progress percentage = verified received quantity divided by allocated quantity.
- Production completion percentage = completed production quantity divided by ordered quantity.
- Sales Points allocated = count of distinct Sales Points with allocation quantity greater than zero.
- Sales Points fully received = count of Sales Points where every allocated line has received quantity equal to allocated quantity.
- Open POD issues = count of pending, rejected, correction requested, or variance POD records.

## 12. Edge Cases

- One order may have one Sales Point and one full shipment.
- One order may have one Sales Point split across multiple partial shipments.
- One order may have multiple Sales Points in one shipment batch.
- One order may have multiple Sales Points across multiple shipment batches.
- One allocation may appear in multiple batches until fully shipped.
- One order may have multiple Delivery Notes because every batch can generate one DN.
- Legacy order-level delivered quantity may exist without explicit batches; Admin must be able to create a compatibility default batch.
- Sales Point address or contact may be incomplete; order can be drafted but shipment should warn or block according to logistics policy.
- Ordered quantity may exceed allocated quantity during draft/import cleanup.
- Vendor production readiness may be lower than outstanding allocation quantity; batch creation should limit by ready quantity when readiness is enforced.

## 13. Error Handling

- Show inline validation for missing required metadata, missing product data, invalid quantities, and missing allocations.
- Block submission when allocation quantity exceeds ordered quantity.
- Block shipment creation for cancelled, closed, or unauthorized orders.
- Block document generation when no batch exists.
- For legacy print routes with multiple batches, show a batch selector instead of silently merging documents.
- When imported Sales Point or product cannot be matched, route user to validation issues with exportable errors.
- If saving fails, preserve entered data and show retry action.
- If concurrent updates change outstanding quantity, recalculate before commit and require user confirmation.

## 14. Audit Trail Requirements

Audit must record:

- Order created, drafted, submitted, edited, cancelled.
- Client/project/vendor changes.
- Product line additions, edits, removals.
- Allocation additions, edits, removals.
- Production status changes and ready quantity changes.
- Batch creation from the order.
- Document generation/print actions launched from the order.
- POD verification outcomes affecting the order.
- Exception raised/resolved.
- Compatibility batch creation from legacy delivery data.

Each event must include timestamp, actor, role, previous value, new value where applicable, reason/comment when required, and source screen.

## 15. Future Extension Points

- Client approval workflow before vendor submission.
- SLA policy engine for production and distribution deadlines.
- Coupa/SAP order import and status sync.
- Vendor performance scoring by order.
- Order amendment workflow after partial shipment.
- Geotagged delivery checkpoints.
- Sales Point portal for receiver confirmation.
- Automated notifications for due, overdue, and exception states.
