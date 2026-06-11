# Sales Point Allocation Functional Specification

## 1. Business Purpose

Sales Point Allocation defines what each delivery destination should receive for each Order Item. It is the planning layer between demand and shipment execution and enables thousands of Sales Points, partial shipment, partial delivery, and destination-centric reporting.

Allocations answer: which Sales Point should receive which product, in what quantity, and how much has been shipped, received, or remains outstanding.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Admin | Create, edit, approve, monitor, and correct allocations. |
| Operator | Create allocations manually or through import; prepare batches from allocations. |
| Vendor | Select eligible outstanding allocations into shipment batches; view allocation readiness. |
| Analyst | View allocation progress and reports. |
| Client | Create/view allocations when exposed through client order workflow. |

## 3. Preconditions

- Order Request exists or is being created.
- Order Item exists for each allocated product.
- Sales Point exists in master data.
- Sales Point is valid for the client/project context.
- Ordered quantity is known.
- User has permission to create or modify allocations.

## 4. Workflow

1. User creates or imports an Order Request.
2. User searches and selects Sales Points by code, name, region, area, or import match.
3. User assigns product quantities to selected Sales Points.
4. System validates allocation totals by product against order item quantities.
5. User reviews allocation table with address/contact completeness warnings.
6. On submit, allocations become eligible for production and shipment planning.
7. Vendor/Admin creates shipment batches from outstanding allocation quantities.
8. System updates shipped quantity from Shipment Items.
9. Admin-verified POD updates received quantity from Delivery Confirmations.
10. Allocation status is derived from allocated, shipped, received, and exception data.

## 5. Status Lifecycle

Allocation status is derived, not manually selected:

| Status | Rule |
| --- | --- |
| Not shipped | Shipped quantity equals zero. |
| Partially shipped | Shipped quantity greater than zero and lower than allocated quantity. |
| Fully shipped | Shipped quantity equals allocated quantity and received quantity is lower than allocated quantity. |
| Partially received | Received quantity greater than zero and lower than allocated quantity. |
| Fully received | Received quantity equals allocated quantity. |
| Exception | Allocation has unresolved delivery, POD, quantity, address, or cancellation issue. |

Distribution status at order level is derived from all allocation rows.

## 6. Validation Rules

- Allocation must reference one Order Request, one Order Item/Product, and one Sales Point.
- Allocation quantity must be greater than zero.
- Sum of allocation quantities per product must not exceed ordered quantity.
- Allocation may be under the ordered quantity only in draft or with approved under-allocation reason.
- Allocation quantity cannot be reduced below already shipped quantity.
- Allocation cannot be deleted after shipped quantity exists; it may only be corrected with audit/exception handling.
- Vendor can select outstanding allocation quantity into a batch but cannot change original allocation quantity.
- Sales Point must not be a free-text destination.
- Imported Sales Point rows require match confirmation when confidence is below threshold.
- Address/contact missing state should warn before batch creation and may block dispatch by policy.

## 7. UI Components

- Allocation step in Create Order Request.
- Allocation preview in Import Dispatch Workspace.
- Order Detail Allocations tab.
- Sales Point Detail Allocation History tab.
- Vendor Order Workbench Eligible Allocations tab.
- Allocation table with horizontal scroll for high-volume datasets.
- Geography filters.
- Batch creation dialog launched from selected allocation rows.
- Allocation status badge.
- Quantity progress summary.
- Missing data warning alert.

## 8. Table Columns

Allocation table:

| Column | Notes |
| --- | --- |
| Sales Point code | WCode or internal destination code. |
| Sales Point name | Destination name. |
| Zone | Geography level. |
| Region | Geography level. |
| Area | Geography level. |
| Sub Area | Geography level. |
| Product code | SKU/material code. |
| Product name | POSM material name. |
| Allocated quantity | Planned quantity. |
| Shipped quantity | Sum from shipment items. |
| Received quantity | Sum from verified POD. |
| Outstanding quantity | Allocated minus shipped. |
| Shipment batches | Count/list of related batches. |
| POD status | Pending, verified, rejected, variance. |
| Exception | Current issue marker. |
| Action | Add to batch, view Sales Point, view batch history, adjust if permitted. |

Import allocation preview:

| Column | Notes |
| --- | --- |
| Source row | Import row identifier. |
| PO/client/project/vendor | Grouping context. |
| Sales Point input | Imported text/code. |
| Matched Sales Point | Master data match. |
| Match confidence | High/medium/low/manual. |
| Product input | Imported product field. |
| Matched product | Product master match. |
| Quantity | Proposed allocation. |
| Validation issue | Missing/invalid data. |
| Action | Confirm match, edit, exclude. |

## 9. Filters

- Search by Sales Point code/name, WCode, product code/name.
- Zone.
- Region.
- Area.
- Sub Area.
- Client.
- Product.
- Allocation status.
- POD status.
- Exception only.
- Missing address.
- Missing contact.
- Shipment batch involvement.
- Outstanding quantity greater than zero.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Add allocation | Admin, Operator, Client where exposed | Creates planned destination quantity. |
| Bulk add allocations | Admin, Operator, Client where exposed | Creates allocations from import. |
| Edit allocation quantity | Admin, Operator | Updates planned quantity within lock rules. |
| Remove allocation | Admin, Operator | Deletes only when no shipment dependency exists. |
| Confirm Sales Point match | Admin, Operator | Resolves imported destination row. |
| Add to shipment batch | Vendor, Admin, Operator | Creates or updates draft batch line from outstanding quantity. |
| View Sales Point | All permitted users | Opens master/detail context. |
| View batch history | All permitted users | Shows shipment history for allocation. |
| Raise allocation exception | Admin, Operator, Vendor | Flags issue requiring resolution. |

## 11. Calculations

- Allocated quantity = planned quantity on allocation line.
- Shipped quantity = sum of all Shipment Items linked to the allocation.
- Received quantity = sum of verified Delivery Confirmation quantities linked through shipment items.
- Outstanding quantity = allocated quantity minus shipped quantity.
- Remaining to receive = allocated quantity minus received quantity.
- Shipment variance = shipped quantity minus received quantity.
- Allocation delivery progress = received quantity divided by allocated quantity.
- Sales Point completion = all allocation lines for Sales Point under order are fully received.
- Order allocation completeness = allocated quantity divided by ordered quantity by product.

## 12. Edge Cases

- Same Sales Point receives multiple products for one order.
- Same product is allocated to many Sales Points.
- Allocation quantity is split across multiple shipment batches.
- Shipment quantity reaches allocation quantity but receipt remains partial.
- Received quantity is lower than shipped quantity after verified POD.
- Admin needs to increase allocation after partial shipment.
- Imported Sales Point text matches multiple master records.
- Sales Point exists but lacks valid address/contact.
- Sales Point belongs to a different client but is operationally reused.
- Legacy order has delivered quantity but no allocation; Admin must create compatibility allocation/batch mapping.

## 13. Error Handling

- Block allocation quantity above ordered quantity.
- Block edit that would make allocation lower than shipped quantity.
- Block batch add when outstanding quantity is zero.
- Warn when received quantity exceeds allocation and require Admin resolution.
- Show match errors for unknown Sales Point or product during import.
- Preserve import rows and validation issues until resolved or intentionally excluded.
- Show stale quantity conflict if another batch updated shipped quantity.
- Prevent Vendor from editing original allocation values.
- Require reason for Admin correction after shipment exists.

## 14. Audit Trail Requirements

Audit must record:

- Allocation created, edited, removed.
- Quantity changes with previous/new values.
- Sales Point or product remapping.
- Import source row and match decision.
- Batch creation from allocation.
- Shipped quantity derivation events by batch.
- Received quantity updates after POD verification.
- Allocation exception raised/resolved.
- Admin corrections after shipment exists.

Each event must include actor, role, timestamp, order ID, allocation ID, source screen, and reason where required.

## 15. Future Extension Points

- Allocation approval workflow.
- Rule-based allocation by geography, sales volume, or store type.
- Sales Point capacity or eligibility constraints.
- Installation allocation after delivery.
- Geospatial routing and clustering.
- Client-specific allocation templates.
- Forecast-based replenishment.
- Bulk allocation adjustment with preview and rollback.
