# Notification Functional Specification

## 1. Business Purpose

Notifications alert users to operational work, exceptions, approvals, rejected evidence, due dates, and status changes. They reduce manual follow-up across Admin, Vendor, Operator, Analyst, and Client surfaces while preserving Inbox as the primary in-app collaboration channel.

Notifications must reflect V2 ownership: Vendors execute production/shipment/POD; Admin verifies POD and resolves exceptions; Clients receive visibility where exposed.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Admin | Receive verification queues, exceptions, overdue items, and system alerts. |
| Operator | Receive import validation, allocation, document, and exception tasks. |
| Analyst | Receive report/export completion or read-only alert subscriptions. |
| Vendor | Receive assigned order, production, shipment, POD rejection/correction, and due reminders. |
| Client | Receive order submission, progress, delivery, or exception updates where enabled. |

## 3. Preconditions

- User exists and has active role/scope.
- Notification preferences or defaults are defined.
- Triggering operational event occurs.
- Related entity has stable ID and route target.
- Message/Inbox infrastructure is available.

## 4. Workflow

1. Operational workflow emits an event, such as order submitted, batch dispatched, POD rejected, or exception raised.
2. System determines recipients based on role, ownership, client/vendor scope, and event type.
3. System creates in-app notification or Inbox message with title, summary, severity, entity links, timestamp, and action target.
4. User opens notification from Inbox, dashboard queue, or header indicator.
5. User navigates to the relevant order, batch, POD, Sales Point, import issue, or document.
6. System marks notification as read when opened or manually acknowledged.
7. For task notifications, system marks resolved when the underlying workflow reaches a resolved state.

## 5. Status Lifecycle

| Status | Meaning |
| --- | --- |
| Unread | Created and not yet opened/acknowledged. |
| Read | User has opened or marked as read. |
| Action required | Notification represents an unresolved task. |
| Resolved | Underlying task or exception is resolved. |
| Dismissed | User dismissed non-required notification. |
| Expired | Time-sensitive notification is no longer actionable. |

Severity:

| Severity | Examples |
| --- | --- |
| Info | Order submitted, DN printed, report ready. |
| Warning | Due soon, missing POD, missing Sales Point contact. |
| Critical | Overdue delivery, rejected POD, unresolved quantity variance. |

## 6. Validation Rules

- Notification must reference a valid recipient or recipient group.
- Notification must reference a valid entity when it has an action target.
- Vendor notifications must be scoped to assigned vendor records only.
- Client notifications must be scoped to that client only.
- Task notifications should not be dismissible if the underlying action is required, unless user has permission to suppress.
- Duplicate notifications for the same unresolved task should be consolidated where possible.
- Resolution state must derive from underlying workflow state, not manual read status.
- Rejection/correction notifications require reason text from Admin decision.

## 7. UI Components

- Inbox page.
- Header notification indicator if present.
- Notification list/table.
- Notification detail view or message panel.
- Status/severity badges.
- Entity link chips: Order, Batch, DN, POD, Sales Point.
- Read/unread controls.
- FilterSection for Inbox filters.
- Empty state for no notifications.
- Optional toast for real-time foreground events.

## 8. Table Columns

Inbox/Notification list:

| Column | Notes |
| --- | --- |
| Status | Unread, read, action required, resolved. |
| Severity | Info, warning, critical. |
| Type | Order, production, shipment, POD, import, exception, report. |
| Subject | Human-readable title. |
| Related entity | Order ID, Batch ID, DN number, POD ID, Sales Point. |
| From/source | System, Admin, Vendor, Operator. |
| Created at | Notification timestamp. |
| Due by | Optional deadline. |
| Action | Open, mark read, resolve through workflow. |

## 9. Filters

- Search by subject, entity ID, client PO, Sales Point, vendor.
- Status: unread, read, action required, resolved.
- Severity.
- Type.
- Client.
- Vendor.
- Project.
- Created date range.
- Due/overdue.
- Assigned to me.
- Exception only.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Open notification | Recipient | Marks read and opens detail/action route. |
| Mark as read/unread | Recipient | Updates read state. |
| Dismiss | Recipient | Hides non-required notification. |
| Open related entity | Recipient | Navigates to order, batch, POD, DN, or Sales Point. |
| Reply/comment | Permitted users | Adds message context if Inbox supports collaboration. |
| Resolve task | Workflow actor | Completes underlying task, marking notification resolved. |
| Export messages | Admin, Analyst where permitted | Exports filtered notification/message data. |

## 11. Calculations

- Unread count = notifications with unread status for user.
- Action required count = unresolved task notifications for user.
- Overdue count = action-required notifications past due timestamp.
- Notification age = current time minus created timestamp.
- Resolution time = resolved timestamp minus created timestamp.
- POD backlog notifications = pending/rejected/correction POD notifications by user scope.
- Exception notification count = unresolved critical/warning workflow events.

## 12. Edge Cases

- Same event affects multiple roles; each recipient gets scoped notification.
- User belongs to Vendor and also has Admin-like permission; recipient rules must avoid duplicate confusion.
- Notification target entity is deleted/deactivated; link should open historical/read-only view or show unavailable state.
- Underlying task is resolved before user opens notification; show resolved state.
- Multiple POD rejections for the same batch; consolidate thread or show latest with history.
- Import errors generate many row-level issues; group into a single summary with drill-down.
- User loses permission after notification is created; target must enforce current access.

## 13. Error Handling

- If notification creation fails, operational workflow should not fail unless notification is mandatory by business rule.
- If action route is unavailable, show clear message and keep notification readable.
- If mark-as-read fails, allow retry without blocking navigation.
- If duplicate event is received, update existing unresolved notification instead of creating spam where supported.
- If recipient cannot be resolved, log system issue for Admin review.
- Do not expose entity names/details to users who lack current permission.

## 14. Audit Trail Requirements

Audit must record:

- Notification created with event type and recipients.
- Notification opened/read where required for compliance.
- Notification dismissed.
- Action-required notification resolved.
- Message replies/comments when Inbox collaboration is used.
- Delivery failures for external notification channels when implemented.

Each event must include actor or system source, timestamp, notification ID, related entity ID, status change, and source workflow event.

## 15. Future Extension Points

- Email notifications.
- WhatsApp notifications.
- Push notifications.
- User notification preferences.
- SLA escalation chains.
- Digest summaries.
- Notification templates by client/vendor.
- Webhook delivery to external systems.
