# V2 Status Lifecycle

## Principle

Production and distribution are separate status models. Order completion is derived from both models and from received allocation quantities.

## Production Status

- `NEW`
- `SUBMITTED`
- `ACCEPTED`
- `PRINTING`
- `FINISHING`
- `QUALITY_CONTROL`
- `READY_FOR_DISTRIBUTION`
- `COMPLETED`
- `CANCELLED`
- `EXCEPTION`

Production status answers: "Where is the manufacturing work?"

## Distribution Status

- `NOT_STARTED`
- `PARTIALLY_DISTRIBUTED`
- `FULLY_DISTRIBUTED`
- `PARTIALLY_RECEIVED`
- `FULLY_RECEIVED`
- `CANCELLED`
- `EXCEPTION`

Distribution status answers: "Where is the allocated quantity in delivery?"

## Shipment Batch Status

- `DRAFT`
- `READY`
- `DISPATCHED`
- `IN_TRANSIT`
- `PARTIALLY_RECEIVED`
- `FULLY_RECEIVED`
- `FAILED_DELIVERY`
- `RETURNED`
- `EXCEPTION`
- `CLOSED`
- `CANCELLED`
- `VOIDED`

Shipment status answers: "Where is this physical shipment event?"

## Delivery Note Status

- `GENERATED`
- `PRINTED`
- `SIGNED`
- `UPLOADED`
- `VERIFIED`
- `CLOSED`
- `SUPERSEDED`
- `REGENERATED`
- `VOIDED`

Delivery note status answers: "Where is the logistics document?"

## Completion Rule

An Order Request can be considered completed only when:

- Production Status is `COMPLETED`.
- Distribution Status is `FULLY_RECEIVED`.
- All allocated quantities have been received.

The legacy blended order status remains only as a compatibility label for existing screens and routes.

## Allocation Status

Allocation status is derived from allocation facts, shipment batch items, verified POD, adjustments, cancellation, and exceptions.

- `NOT_SHIPPED`
- `PARTIALLY_SHIPPED`
- `FULLY_SHIPPED`
- `PARTIALLY_RECEIVED`
- `FULLY_RECEIVED`
- `SHORT_RECEIVED`
- `OVER_RECEIVED`
- `ADJUSTED`
- `CANCELLED`
- `EXCEPTION`

Allocation status answers: "What is the fulfillment state of this planned destination quantity?"

## Delivery Confirmation And POD Status

Delivery Confirmation status represents the submission/review lifecycle.

- `DRAFT`
- `SUBMITTED`
- `PENDING_VERIFICATION`
- `PARTIALLY_VERIFIED`
- `VERIFIED`
- `REJECTED`
- `CORRECTION_REQUESTED`
- `RESUBMITTED`
- `WITHDRAWN`
- `SUPERSEDED`
- `CLOSED`

`PodStatus` is a read projection for lists, dashboards, and badges:

- `NOT_REQUIRED`
- `NOT_STARTED`
- `DRAFT`
- `PENDING`
- `PARTIALLY_VERIFIED`
- `VERIFIED`
- `REJECTED`
- `CORRECTION_REQUESTED`
- `VARIANCE`
- `MISSING`

## Shipping Label Status

- `NOT_GENERATED`
- `GENERATED`
- `PRINTED`
- `REPRINTED`
- `VOIDED`
- `SUPERSEDED`

Shipping label status answers: "Can this package label be used for dispatch and reconciliation?"

## Operational Exception Status

- `OPEN`
- `ASSIGNED`
- `IN_REVIEW`
- `RESOLVED`
- `WAIVED`
- `REOPENED`
- `CANCELLED`

Exceptions answer: "What issue blocks or explains a workflow variance?"

## Transition Rules

### Shipment Batch

| From | To | Actor | Preconditions | Required side effects |
| --- | --- | --- | --- | --- |
| `DRAFT` | `READY` | Admin, Operator, Vendor | Items valid; production ready gate passes when policy requires. | Reserve ready quantity; emit audit/domain events. |
| `READY` | `DISPATCHED` | Admin, Operator, Vendor | Required DN and labels exist; no blocking missing address/contact exception. | Record dispatch; rebuild shipped projections. |
| `DISPATCHED` | `IN_TRANSIT` | System/User | Carrier handoff or explicit dispatch date. | Start POD aging clock. |
| `IN_TRANSIT` | `PARTIALLY_RECEIVED`, `FULLY_RECEIVED` | Admin via POD verification | Verified POD event applies received quantity. | Rebuild batch, allocation, order, Sales Point, dashboard projections. |
| Any non-terminal | `FAILED_DELIVERY` | Admin, Vendor | Failed delivery reason required. | Open exception; notify owner; block closure. |
| Any non-terminal | `RETURNED` | Admin, Vendor | Return reason and returned quantities required. | Open exception; rebuild outstanding/received projections. |
| Any non-terminal | `EXCEPTION` | System/Admin | Blocking unresolved exception exists. | Link exception and freeze close action. |
| `DRAFT`, `READY` | `CANCELLED` | Admin, Operator where permitted | Reason required; generated docs/labels must be voided or retained as cancelled history. | Release reservations; void active labels/DN when required. |
| Any non-terminal | `VOIDED` | Admin | Administrative invalidation with reason. | Mark all active documents/labels unusable; preserve audit. |
| `FULLY_RECEIVED`, `PARTIALLY_RECEIVED` | `CLOSED` | Admin | POD verified or variance waived; no open blocking exception; document state valid. | Emit close event; lock direct edits. |
| `CLOSED` | prior valid state | Admin | Reopen reason required. | Emit reopen event; rebuild projections. |

### Delivery Note

| From | To | Actor | Preconditions | Required side effects |
| --- | --- | --- | --- | --- |
| none | `GENERATED` | Admin, Operator, Vendor | Batch exists and policy allows generation. | Assign DN number and document version 1. |
| `GENERATED` | `PRINTED` | Admin, Operator, Vendor | Active DN. | Record print event. |
| `PRINTED` | `SIGNED` | Vendor/Admin | Offline signature captured but not uploaded. | Optional manual state only. |
| `PRINTED`, `SIGNED` | `UPLOADED` | Vendor/Admin | Signed DN `FileAsset` uploaded with access policy. | Link file to POD attempt. |
| `UPLOADED` | `VERIFIED` | Admin via POD review | Signed DN accepted on a POD attempt. | Rebuild POD/document projection. |
| Any active | `REGENERATED` | Admin, Vendor if policy allows | Reason required. | Create new active DN version; supersede previous active DN. |
| Any active | `SUPERSEDED` | System | Replacement DN generated. | Preserve historical print/upload records. |
| Any active | `VOIDED` | Admin | Void reason required. | Prevent print/use; require replacement before dispatch when policy requires DN. |
| `VERIFIED` | `CLOSED` | Admin/System | Batch closure succeeds. | Lock document state except reopen/correction path. |

### Delivery Confirmation

| From | To | Actor | Preconditions | Required side effects |
| --- | --- | --- | --- | --- |
| none | `DRAFT` | Vendor/Admin delegated upload | Eligible dispatched batch and Sales Point. | Create attempt 1. |
| `DRAFT` | `SUBMITTED`, `PENDING_VERIFICATION` | Vendor/Admin delegated upload | Required evidence and quantities present. | Queue Admin verification. |
| `PENDING_VERIFICATION` | `VERIFIED` | Admin | All submitted items accepted. | Apply immutable verification event once per idempotency key. |
| `PENDING_VERIFICATION` | `PARTIALLY_VERIFIED` | Admin | Some items accepted and others rejected/correction requested. | Apply accepted items; open exceptions for rejected lines. |
| `PENDING_VERIFICATION` | `REJECTED` | Admin | Reason required. | No received quantity is applied; create Vendor correction task. |
| `PENDING_VERIFICATION` | `CORRECTION_REQUESTED` | Admin | Correction reason and target items required. | Create Vendor correction task. |
| `REJECTED`, `CORRECTION_REQUESTED` | `RESUBMITTED` | Vendor | New immutable attempt created. | Preserve prior attempt and evidence. |
| `DRAFT` | `WITHDRAWN` | Vendor/Admin | Reason required after submission; optional before submission. | Attempt becomes inactive; no quantities apply. |
| Any replaced attempt | `SUPERSEDED` | System | New attempt submitted. | Preserve attempt history. |
| `VERIFIED`, `PARTIALLY_VERIFIED` | prior review state | Admin | Reversal reason and new event required. | Reverse original verification event; rebuild projections. |

## Completion And Closure Guards

- Order completion requires production `COMPLETED`, distribution `FULLY_RECEIVED`, no open blocking exception, and no stale projection marker.
- Batch closure requires valid document state, POD verified or approved variance, no open blocking exception, and all required labels/DNs not voided.
- Over-receipt and short-receipt never silently complete; they require item-level POD decision and exception resolution or waiver.
- Cancellation after shipment cannot erase shipped/received facts; it records a cancellation event and relies on exceptions/adjustments to explain remaining variance.
