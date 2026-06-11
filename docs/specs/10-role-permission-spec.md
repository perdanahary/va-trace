# Role and Permission Functional Specification

## 1. Business Purpose

Role and Permission Management governs who can view, create, update, verify, print, export, and administer each V2 entity. It preserves the existing Admin and Vendor surfaces while adding clear boundaries for Sales Point Allocation, Shipment Batch, Delivery Note, shipping label, POD verification, master data, and reporting workflows.

The permission model must enforce ownership: Admin controls verification and master data, Vendor controls assigned execution, Operator prepares operational work, Analyst views/report, and Client requests/tracks within scope.

## 2. Actors

| Role | Primary Purpose |
| --- | --- |
| Admin | Full operational control, verification, master data, users, exceptions, exports. |
| Operator | Create orders/imports, manage allocations, prepare logistics, limited corrections. |
| Analyst | Read-only operational visibility, reporting, user visibility where configured. |
| Vendor | Execute assigned production, batches, document printing, POD upload. |
| Client | Create/track own requests and view permitted fulfillment status. |

## 3. Preconditions

- User account exists and is active.
- User has exactly one primary role or a deterministic multi-role resolution policy.
- Vendor users are bound to a Vendor.
- Client users are bound to a Client.
- Route guard and action-level permissions are both enforced.
- Data scope is available for filtering accessible records.

## 4. Workflow

1. User signs in or app loads existing user context.
2. System resolves role, ownership scope, and permissions.
3. Sidebar and routes show permitted surfaces.
4. Lists and dashboards load only scoped data.
5. Detail screens render actions according to permission and entity state.
6. Mutating actions validate permission again at submission.
7. Unauthorized navigation shows denied/redirect state without leaking restricted data.
8. Permission-affecting user changes are audited.

## 5. Status Lifecycle

User account status:

| Status | Meaning |
| --- | --- |
| Active | User can access permitted surfaces. |
| Inactive | User cannot sign in or perform actions. |
| Suspended | Temporarily blocked, preserved for audit. |
| Pending setup | Created but missing required scope or invitation completion. |

Permission state per action:

| State | Meaning |
| --- | --- |
| Allowed | User may perform action in current entity state. |
| Hidden | Action is not shown because user lacks permission. |
| Disabled | Action is visible but unavailable due to entity state/precondition. |
| Denied | User attempted unauthorized action; system blocks. |

## 6. Validation Rules

- Admin can access all operational entities unless system-level restrictions apply.
- Vendor can access only orders, batches, DNs, labels, POD, and messages assigned to its Vendor.
- Client can access only its own client data and exposed workflow fields.
- Analyst cannot mutate shipment or POD verification records.
- Operator cannot perform Admin-only POD verification unless explicitly delegated.
- Vendor cannot verify POD.
- Vendor cannot edit original Sales Point Allocation quantities.
- Vendor cannot access other vendors' batches or POD.
- Delivery Note and label print actions require access to the owning batch.
- Export actions require explicit export permission.
- User management actions require Admin permission.
- Route compatibility must still enforce role ownership checks.

## 7. UI Components

- Role-aware Sidebar.
- Header user account menu.
- Role switcher where development/demo behavior exists.
- Route guards.
- Permission-aware action buttons.
- Disabled action tooltips or validation messages.
- User management table and edit form.
- Access denied state.
- Audit timeline for user/permission changes.

## 8. Table Columns

User management:

| Column | Notes |
| --- | --- |
| Name | User display name. |
| Email | Login/contact identity. |
| Role | Admin, Operator, Analyst, Client, Vendor. |
| Ownership scope | Client/vendor binding if applicable. |
| Status | Active, inactive, suspended, pending. |
| Last activity | Optional. |
| Created at | Account creation timestamp. |
| Action | Edit, deactivate, reactivate, reset/invite if supported. |

Permission matrix summary:

| Entity | Admin | Operator | Analyst | Vendor | Client |
| --- | --- | --- | --- | --- | --- |
| Order Request | Create/read/update/cancel/export | Create/read/update/export | Read/export | Read assigned | Create/read own |
| Order Item | Create/read/update | Create/read/update | Read | Read/update production assigned | Create/read own |
| Production Job | Read/correct | Read/coordinate | Read | Update assigned | Read exposed |
| Sales Point | Create/read/update/export | Read/update for imports | Read | Read shipment context | Read exposed |
| Allocation | Create/read/update | Create/read/update | Read | Read/select outstanding | Create/read own where exposed |
| Shipment Batch | Create/read/update/close/export | Create/read/update | Read | Create/read/update assigned | Read exposed |
| Delivery Note | Read/print/export/verify through POD | Read/print | Read | Read/print assigned/upload signed DN | Read verified exposed |
| Shipping Label | Read/print | Read/print | Read | Read/print assigned | No default print |
| Delivery Confirmation/POD | Read/verify/update/export | Read/coordinate | Read | Create/read/update assigned | Read verified exposed |
| Master Data | Create/read/update/export | Limited read/update | Read/export | Read own/vendor context | Read own context |
| Users | Create/read/update/export | No default | Read if configured | Read own profile | Read own profile |

## 9. Filters

Permission-aware screens must scope available filters:

- Admin: Client, project, vendor, status, date, geography, exception.
- Operator: Same as Admin where delegated, with action restrictions.
- Analyst: Same as Admin for read/report scope.
- Vendor: Assigned orders/batches only; vendor filter may be hidden or fixed.
- Client: Own client/project/order/Sales Point scope only.
- User management: role, status, ownership scope, search.

## 10. User Actions

| Action | Admin | Operator | Analyst | Vendor | Client |
| --- | --- | --- | --- | --- | --- |
| Create order | Yes | Yes | No | No | Yes, own scope |
| Edit order | Yes | Yes, limited | No | No | Limited before submission |
| Cancel order | Yes | Limited if delegated | No | No | Request only if supported |
| Update production | Correct/override | Limited | No | Yes, assigned | No |
| Create shipment batch | Yes | Yes if delegated | No | Yes, assigned eligible allocations | No |
| Dispatch batch | Yes | Yes if delegated | No | Yes, assigned | No |
| Print DN/labels | Yes | Yes | Read/print if permitted | Yes, assigned | View only if exposed |
| Upload POD | No default except correction | No default | No | Yes, assigned | No |
| Verify POD | Yes | Only if explicitly delegated | No | No | No |
| Export reports | Yes | Yes if permitted | Yes | Limited assigned | Limited own if enabled |
| Manage users | Yes | No | No | Own profile only | Own profile only |

## 11. Calculations

- Accessible record set = all records matching role scope and entity-specific ownership rules.
- Vendor accessible orders = orders assigned to vendor or batches owned by vendor.
- Client accessible orders = orders belonging to client.
- Action availability = permission grant plus entity state plus preconditions.
- Notification count = scoped notifications matching user role and ownership.
- Export row count = current filtered accessible record count.

## 12. Edge Cases

- User has multiple possible scopes; system must apply deterministic union or primary-scope policy.
- Vendor user tries legacy order-level print route; route must resolve only assigned batches.
- Analyst opens a mutating URL directly; screen must block action.
- Operator can create order but not verify POD.
- Client can see delivery progress but not internal vendor notes if not exposed.
- User role changes while session is active; next refresh/action must enforce new permissions.
- Vendor is deactivated while user remains active; user should lose vendor operational access.
- Admin creates compatibility batch for legacy data; action must remain Admin-only.
- Print actions may be allowed even when update actions are not.

## 13. Error Handling

- Unauthorized route access shows access denied or redirects to permitted dashboard.
- Unauthorized action submission returns permission error and must not mutate data.
- Hidden actions should not be relied on as security; validate on submit.
- Disabled actions should explain missing precondition, such as no batch, missing DN, or pending POD.
- Scope mismatch must avoid exposing restricted entity details.
- Inactive/suspended users cannot perform actions.
- User save errors should preserve form state.
- Role changes that would orphan ownership scope must be blocked or require completing required binding.

## 14. Audit Trail Requirements

Audit must record:

- User created, edited, deactivated, reactivated, suspended.
- Role changes.
- Ownership scope changes.
- Permission delegation changes.
- Unauthorized access attempts where security policy requires logging.
- Admin impersonation/role switch if available in demo or support mode.
- Export actions with filters and row counts.
- Admin-only override actions.

Each event must include actor, target user where applicable, timestamp, previous value, new value, source screen, and reason where required.

## 15. Future Extension Points

- Fine-grained permission policies beyond role defaults.
- Team-based ownership scopes.
- Approval workflow for permission changes.
- External identity provider integration.
- Client/vendor multi-tenant administration.
- Temporary delegation with expiry.
- Field-level permissions.
- API token/service account permissions for integrations.
