# 04 - UI Consistency Review

## Executive Assessment

The UI architecture is directionally consistent with the V2 domain model. It preserves the existing role-based shell and adds the right logistics surfaces: Shipment Batches, Delivery Notes, POD Verification, Sales Points, and Vendor execution screens.

The main readiness risks are route inconsistency, missing foundational screens, incomplete action ownership, and high-volume table performance. The UI documents describe the screens well, but they defer several required capabilities to later phases even though they are prerequisites for safe implementation.

## Screen Coverage Summary

| Area | Coverage | Readiness |
| --- | --- | --- |
| Admin dashboard | Covered | Needs projection/API strategy. |
| Admin orders | Covered | Strong. |
| Admin order detail tabs | Covered | Strong structure, needs tab-level permissions and data loading plan. |
| Create order/import | Covered | Needs import issue resolution details. |
| Shipment batches | Covered | Strong. |
| Delivery notes | Covered | Strong, pending DN business validation. |
| Shipping labels | Covered visually | Missing label entity/API. |
| POD verification | Covered | Needs POD attempt/version UI. |
| Sales Points | Covered | Detail/history must move earlier for scale. |
| Vendor dashboard/orders/workbench | Covered | Needs clearer production vs shipment task queues. |
| Client order list/tracking | Under-covered | `/client/orders` is known missing/redirected. |
| Operator/Analyst logistics routes | Under-covered | Matrix describes permissions, but screens/routes are not fully inventoried. |
| Exceptions | Under-covered | No dedicated exception queue/detail screen despite dashboard references. |
| Installation/invoice/integration | Not covered | Acceptable only if explicitly out of current build scope. |

## Route Consistency Findings

| Severity | Issue | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | Admin logistics routes conflict between `/admin/logistics/*` and `/admin/shipments`, `/admin/delivery-notes`, `/admin/pod`. | `ui-architecture-v2.md` uses `/admin/logistics/shipments`; routing refactor prefers `/admin/shipments`. | Freeze canonical route constants and redirects before implementation. |
| High | Client `/client/orders` is referenced but missing. | Routing refactor explicitly notes sidebar points to missing route. | Add a real client order list or intentional redirect with acceptance criteria. |
| Medium | Operator and Analyst V2 logistics routes are only partially defined. | Page matrix includes read/create capabilities, route plan focuses Admin/Vendor. | Define target routes and nav visibility for Operator/Analyst before sidebar changes. |
| Medium | Delivery note detail route exists in routing plan but not screen inventory. | `/admin/delivery-notes/:id` appears in target route map. | Decide whether DN detail is print view, register detail drawer, or standalone detail screen. |
| Medium | `/admin/production` and `/vendor/production` are introduced in routing plan but absent from main screen inventory. | Production work queue routes are listed only in routing refactor. | Add production queue screen inventory or defer and remove nav route. |

## Navigation Consistency

### Admin

The Admin navigation is mostly coherent:

- Dashboard
- Orders
- Logistics
- Sales Points
- Master Data
- Users
- Inbox

Gap: "Order Tracking" remains from legacy routes while V2 order detail and dashboards already handle tracking. Decide whether it is a reporting view, redirect, or deprecated route.

### Vendor

Vendor navigation is coherent but needs task clarity:

- My Orders
- Production
- Shipment Batches
- POD Uploads
- Inbox
- My Profile

Gap: Vendor "POD Uploads" can mean upload queue, correction queue, or POD history. Define sub-states and columns.

### Client

Client surface is under-specified relative to the rest:

- Create Order
- Imports
- Tracking
- Inbox
- Missing or ambiguous: Order list, Sales Point progress, verified DN/POD visibility.

### Operator/Analyst

Operator and Analyst reuse Admin-like pages, but the UI docs need explicit nav rules:

- Which Logistics links are visible?
- Which actions are disabled vs hidden?
- Can Analyst print documents?
- Can Operator verify POD if delegated?

## Missing Screens

| Severity | Screen | Why It Is Needed | Recommendation |
| --- | --- | --- | --- |
| Critical | Exception queue/detail | Exceptions are dashboard-critical and closure-blocking. | Add Admin/Operator exception queue and source-linked detail drawer. |
| High | Shipping label register/detail or label section contract | Label print/reprint/void is an operational workflow. | Add label table in batch detail and optional global label register if needed. |
| High | Production queue/detail | Routing plan includes production, specs require production monitoring. | Add Admin and Vendor production queue screens or keep production inside order workbench only. |
| High | POD correction queue for Vendor | Rejected/correction POD must be actionable. | Add Vendor POD Uploads queue with rejected/correction/pending states. |
| High | Client order list | Client tracking needs an entry point besides dashboard/progress. | Add `/client/orders` with scoped order list. |
| Medium | Import validation issue detail | Bulk imports will generate row-level match/validation issues. | Add issue drawer/workspace detail with export and confirm match actions. |
| Medium | Master data duplicate/merge screen | Sales Point scale makes duplicate resolution likely. | Add to future backlog before mass imports. |
| Medium | Audit timeline shared detail | Audit is listed as tab but no UI detail model exists. | Add shared AuditTimeline view model and table columns. |

## Duplicate Or Ambiguous Screens

| Issue | Recommendation |
| --- | --- |
| `OrderProgress` legacy route overlaps with All Orders, Dashboard, and Order Detail V2. | Decide whether it becomes reporting/progress dashboard or redirects. |
| Delivery Note print can be accessed through order compatibility route, batch route, and DN register. | Centralize route resolution in `BatchSelector`/document resolver. |
| Vendor Order Workbench and Vendor Shipment Detail both expose DN/label/POD actions. | Keep both, but define primary action location and state-specific disabled reasons. |
| Admin Shipment Detail and Admin POD Verification both can verify POD. | Use shared `PODVerificationDrawer`; ensure same command and validations. |

## Missing Actions

| Severity | Context | Missing Action |
| --- | --- | --- |
| Critical | Exceptions | Assign, resolve, reopen, escalate, waive. |
| Critical | Labels | Generate, reprint, void, regenerate, print selected labels. |
| High | Delivery Note | Regenerate with reason, void/supersede, download/export PDF. |
| High | POD | View attempt history, resubmit correction, withdraw draft, partial item decision. |
| High | Shipment Batch | Cancel draft, reopen closed, record failed delivery/return, resolve variance. |
| High | Allocation | Correct after shipment with reason, view adjustment history. |
| Medium | Import | Confirm duplicate match, bulk exclude rows, export unresolved issues. |
| Medium | Sales Point | Deactivate/reactivate, merge/remap, view linked active dependencies. |

## Missing Filters

Most core filters are covered. Missing or under-specified filters:

- Exception severity, owner, age, source type.
- POD correction/rejected aging.
- Missing labels / label not printed.
- Document regenerated/voided status.
- Batch closure state and closure blocker.
- Production ready quantity greater than zero.
- Production SLA breach.
- Sales Point repeated issue count and duplicate candidate.
- Integration sync status for future external records.
- Invoice reconciliation status for future billing.

## Missing Tables Or Columns

| Screen | Missing Table/Column | Recommendation |
| --- | --- | --- |
| Shipment Batch Detail | Label register | Show label code, package count, Sales Point, product, qty, print count, status. |
| Order Detail Audit | Event table | Show event type, actor, role, source entity, previous/new values, reason. |
| POD Verification | Attempt/history table | Show submissions, evidence, decisions, reasons, reviewer. |
| Sales Point Detail | Exception history | Show recent failed deliveries/POD issues by source. |
| Vendor POD Uploads | Correction queue table | Show rejected/correction requested PODs with reason and due age. |
| Dashboard | Exception queue | Must link to exception detail, not only batch/order. |
| Delivery Note Register | Document version/void state | Needed if regeneration is allowed. |

## User Journey Validation

### Admin Creates And Tracks Order

Status: Mostly valid.

Gaps:

- Import validation and low-confidence matching require deeper UI.
- Exception resolution is missing.
- Completion blockers need explicit display.

### Vendor Produces And Ships

Status: Partially valid.

Gaps:

- Production queue/detail is not fully designed.
- Batch eligibility under partial ready quantities is not clear.
- Vendor correction queue needs explicit screen.

### Admin Verifies POD

Status: Partially valid.

Gaps:

- POD attempt history missing.
- Partial item verification missing.
- Verification side effects and idempotency not represented in UI.

### Client Tracks Fulfillment

Status: Weak.

Gaps:

- Client order list is missing.
- Client-visible fields are policy-based but no exposure policy exists.
- Verified DN/POD visibility needs specific UI scope.

### Analyst Reviews Reports

Status: Weak.

Gaps:

- Analyst has read/export ability in matrix but no reporting screens beyond inherited dashboards/order lists.
- BI/export-ready aggregates are not designed.

## UI Architecture Risks

| Severity | Risk | Recommendation |
| --- | --- | --- |
| High | High-volume tables are treated as later optimization. | Make TanStack Table + virtualization + server-style pagination foundational for Sales Points and allocations. |
| High | Page components may compose raw stores directly. | Enforce view-model selectors matching API response models. |
| High | Permissions may be inferred in UI components. | Pass permission view models and disabled reasons to shared components. |
| Medium | Too many tabs in Order Detail may overload mobile. | Keep horizontal tab list but prioritize Overview, Allocations, Batches, POD; use overflow if needed. |
| Medium | Print views may regress with batch selector complexity. | Add print screenshot tests and strict route resolver tests. |
| Medium | Status badges can become inconsistent across statuses. | Centralize status family config and labels. |

## Consistency Recommendations

1. Freeze canonical route constants and redirect table.
2. Add missing screens: Exception queue, Vendor POD correction queue, Client order list, Production queue, label register/section.
3. Move high-volume table requirements to Phase 1.
4. Add screen-level permission/action matrices for every route.
5. Add UI state models for loading, empty, error, permission denied, stale data conflict, and disabled action reasons.
6. Define shared components around API view models, not raw entity shapes.
7. Add journey acceptance criteria for Client and Analyst, not only Admin/Vendor.
8. Validate DN-per-batch vs DN-per-Sales Point before print implementation.
