# Dashboard and Reporting Functional Specification

## 1. Business Purpose

Dashboard and Reporting provide operational visibility across demand, production, distribution, shipment batches, Sales Points, POD compliance, and exceptions. V2 reporting must separate production status from distribution status and must derive delivery metrics from allocations, shipment batches, and verified POD.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Admin | Monitor all operational metrics, exceptions, and POD backlog. |
| Operator | Track execution queues and prepare follow-up actions. |
| Analyst | Analyze performance, export reports, and review trends. |
| Vendor | Monitor assigned production, ready-to-ship, active shipment, and POD backlog. |
| Client | View order and delivery progress when exposed. |

## 3. Preconditions

- Orders, allocations, production jobs, shipment batches, DNs, and POD records exist or can be counted as zero.
- User role and data scope are known.
- Date range and filter defaults are defined.
- Derived metrics are calculated consistently from source entities.
- Legacy blended statuses are not used as the primary reporting source.

## 4. Workflow

1. User opens role-specific dashboard.
2. System loads metrics scoped by role, ownership, and default date range.
3. User scans production cards, distribution cards, POD backlog, exception queues, and recent activity.
4. User applies filters such as client, project, vendor, date range, and exception only.
5. User opens drill-down lists from cards or queue rows.
6. User exports permitted tables or report views.
7. Dashboard updates derived metrics after production updates, batch creation, dispatch, POD verification, and closure.

## 5. Status Lifecycle

Dashboards do not own statuses. They display:

- Production Status from Production Jobs and Order Items.
- Distribution Status from allocation shipped/received quantities.
- Shipment Batch Status from batch lifecycle.
- Delivery Note Status from batch document lifecycle.
- POD Status from Delivery Confirmation verification state.
- Exception State from unresolved operational issues.

Metric state categories:

| Category | Rule |
| --- | --- |
| Normal | No overdue or unresolved exception conditions. |
| Warning | Due soon, pending POD, partial delivery, missing contact/address, or aging threshold reached. |
| Critical | Overdue, rejected POD, unresolved variance, exception, or blocked workflow. |

## 6. Validation Rules

- Dashboard totals must respect user scope.
- Admin sees all clients/vendors/projects unless filtered.
- Vendor sees only assigned vendor data.
- Client sees only its own orders and exposed logistics/POD data.
- Analyst sees read-only data per configured scope.
- Delivery progress must use verified received quantities, not Vendor claims.
- Shipped quantities must come from Shipment Items only.
- Delivery Notes count must be batch-scoped.
- Filters must not produce totals inconsistent with drill-down rows.
- Exports must match current filters and permissions.

## 7. UI Components

- Role-specific dashboard page.
- Production status cards.
- Distribution status cards.
- Shipment batch status cards.
- POD queue table.
- Shipment exceptions table.
- Recent orders table.
- Recent shipment batches table.
- Date range selector.
- FilterSection.
- Export action.
- Drill-down links to All Orders, Shipment Batches, Delivery Notes, POD Verification, Sales Point Detail.
- Status and variance badges.

## 8. Table Columns

Recent orders:

| Column | Notes |
| --- | --- |
| Order ID | Internal request. |
| Client PO | External reference. |
| Client | Customer. |
| Project | Campaign/activity. |
| Vendor | Assigned partner. |
| Production status | Manufacturing state. |
| Distribution status | Fulfillment state. |
| Delivery progress | Received over allocated. |
| Deadline | Target date. |
| Action | Open order. |

Pending POD:

| Column | Notes |
| --- | --- |
| POD ID | Evidence record. |
| Batch ID | Owning shipment. |
| DN number | Document reference. |
| Vendor | Submitting vendor. |
| Sales Point | Destination. |
| Submitted at | Queue age source. |
| Age | Time pending. |
| Variance | Quantity mismatch if any. |
| Action | Open verification. |

Shipment exceptions:

| Column | Notes |
| --- | --- |
| Batch ID | Shipment reference. |
| Order ID | Demand reference. |
| Vendor | Execution partner. |
| Sales Point | Destination affected. |
| Reason | Exception category. |
| Age | Time unresolved. |
| Severity | Warning/critical. |
| Action | Open batch/order/POD. |

## 9. Filters

- Client.
- Project.
- Vendor.
- Date range.
- Production status.
- Distribution status.
- Batch status.
- POD status.
- Exception only.
- Deadline state.
- Sales Point geography.
- Partial shipment.
- Partial delivery.
- Missing POD.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Apply filters | All users | Refreshes scoped metrics and tables. |
| Open order | All permitted users | Navigates to Order Detail. |
| Open shipment batch | All permitted users | Navigates to Shipment Batch Detail. |
| Open POD verification/upload | Admin/Vendor | Navigates to appropriate POD action. |
| Open Delivery Notes | Admin, Operator, Analyst, Vendor | Navigates to DN register or batch DN. |
| Create order | Admin, Operator, Client | Starts Order Request. |
| Export report | Admin, Operator, Analyst | Exports current filtered data. |
| Resolve exception | Admin, Operator, Vendor where applicable | Opens source workflow for correction. |

## 11. Calculations

Production metrics:

- Orders in production = count of active orders in `PRINTING`, `FINISHING`, or equivalent active production states.
- Orders in QC = count of orders/items in `QUALITY_CONTROL`.
- Ready for distribution = count or quantity in `READY_FOR_DISTRIBUTION`.
- Production completion rate = completed production quantity divided by ordered quantity.
- Production lead time = acceptance-to-completion duration.

Distribution metrics:

- Allocated quantity = sum of allocation quantities.
- Shipped quantity = sum of shipment item quantities.
- Received quantity = sum of verified POD quantities.
- Delivery progress percentage = received quantity divided by allocated quantity.
- Delivery success rate = fully received Sales Points or allocations divided by allocated Sales Points or allocations.
- Exception count = unresolved logistics/POD/quantity/address issues.

Sales Point metrics:

- Total Sales Points = active Sales Points in scope.
- Allocated Sales Points = distinct Sales Points with allocations.
- Dispatched Sales Points = distinct Sales Points with shipped quantity.
- Fully received Sales Points = distinct Sales Points where allocated equals verified received.
- Pending Sales Points = allocated Sales Points not fully received.

Vendor metrics:

- Production SLA = orders/jobs completed within production target divided by eligible orders/jobs.
- Distribution SLA = batches delivered/verified within target divided by eligible batches.
- POD compliance = verified or submitted POD within deadline divided by dispatched batches.
- Batch closure rate = closed batches divided by dispatched/received batches.

## 12. Edge Cases

- No data exists for selected filters; show empty state with retained filters.
- Legacy orders have delivered quantity but no V2 batch; show compatibility warning or migrated default batch counts.
- One order has multiple batches and multiple DNs; document metrics count DNs by batch.
- Vendor has no assigned active orders.
- Partial received quantity creates distribution progress but also exception/variance.
- Rejected POD should count against backlog/compliance until corrected.
- Date range includes orders created before V2 migration.
- User scope changes after dashboard load; refresh should reapply permissions.

## 13. Error Handling

- Show recoverable error if dashboard metrics fail to load.
- Keep last loaded filters visible when refresh fails.
- Avoid displaying stale totals as confirmed data after calculation failure.
- Show permission error for unauthorized drill-down links.
- Handle division by zero by showing zero, not applicable, or empty according to metric.
- For export failure, keep user on page and allow retry.
- If metric and drill-down row counts differ due to refresh timing, show refreshed data after navigation.

## 14. Audit Trail Requirements

Dashboards are primarily read-only. Audit required for:

- Report export events with filters and actor.
- Exception resolution launched from dashboard.
- Admin overrides or corrections initiated from dashboard drill-down.
- Saved report/filter creation if implemented.

Operational events displayed on dashboard are audited by their owning workflows.

## 15. Future Extension Points

- Saved report views.
- Scheduled emailed reports.
- SLA trend charts.
- Vendor scorecards.
- Client-facing dashboards.
- Geographic heatmaps by Sales Point status.
- Predictive risk indicators for late POD or late delivery.
- Integration with BI tools.
