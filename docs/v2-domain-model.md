# V2 Domain Model

## Scope

VA Trace V2 separates demand, production execution, and logistics execution.

Order Requests represent client demand. Production Jobs represent vendor manufacturing work. Sales Point Allocations represent where ordered quantities must go. Shipment Batches represent physical distribution events. Delivery Notes and POD records are generated from shipment batches, not directly from orders.

## Core Entities

### Client

Represents a PMG customer such as HM Sampoerna, Coca-Cola, or Nestle.

Relationships:

- Client has many Projects.
- Client has many Sales Points.
- Client has many Order Requests through Projects.

### Project

Represents a campaign or activity such as VEEV Launch 2026 or Retail Branding Q3.

Relationships:

- Project belongs to a Client.
- Project has many Order Requests.

### Sales Point

Represents the delivery destination. A Sales Point belongs to a client and sits in the hierarchy Zone, Region, Area, Sub Area, Sales Point.

Required logistics data:

- Address
- Delivery contacts
- Delivery instructions
- Client receiver contacts

### Vendor

Represents the production and distribution partner responsible for manufacturing, shipment batches, delivery notes, and POD upload.

### Order Request

Represents demand from PMG. It contains client/project references, vendor assignment, order items, and sales point allocations.

An Order Request does not represent a shipment.

### Order Item

Represents a POSM material line with SKU/material code, specifications, ordered quantity, and production tracking.

### Production Job

Represents manufacturing execution generated from an Order Request. It tracks printing, finishing, quality control, readiness, and completion.

### Sales Point Allocation

Represents the quantity planned for a Sales Point. It is the bridge between order demand and physical shipments.

This layer supports:

- Partial shipping
- Partial receiving
- Multiple batches to one Sales Point
- Future installation verification

### Shipment Batch

Represents a physical shipment event. A batch contains sales points, items, quantities, and lifecycle state.

One Shipment Batch can generate one Delivery Note.

### Delivery Note

Represents the official logistics document generated from a Shipment Batch. It contains DN number, receiver snapshot, shipped items, quantities, and signature fields.

### Delivery Confirmation

Represents proof that a shipment was received. It contains receiver name, date, signature, stamp/scanned DN reference, POD photos, and verification state.

## Development Readiness Remediation Baseline

The following entities and ownership rules are now part of the V2 domain model and must be treated as implementation prerequisites, not future embellishments.

### OperationalException

Represents a source-linked operational issue that can block shipment dispatch, POD verification, batch closure, order completion, or master-data use.

Required ownership:

- Every exception has a source entity, affected entity references, owner role, severity, status, due date when SLA applies, and resolution record.
- Quantity variance, rejected POD, missing address/contact, failed delivery, return, duplicate Sales Point, document correction, and integration conflict must create or update an `OperationalException`.
- A batch or order cannot be closed while it has an open blocking exception unless a `WorkflowPolicy` permits a waiver and the waiver is recorded in the exception resolution.

### AuditEvent And DomainEvent

`AuditStamp` is metadata only. Every mutating command must append one or more `AuditEvent` records and emit a `DomainEvent` when projections, notifications, integrations, or derived statuses must update.

Required event sources:

- Order submit, amend, cancel, and compatibility migration.
- Production status and ready quantity changes.
- Allocation adjustment, approval, cancellation, and variance.
- Shipment batch create, ready, dispatch, failed delivery, return, close, reopen, cancel, and void.
- Delivery Note generate, print, regenerate, supersede, void, upload, verify, and close.
- Shipping label/package generate, print, reprint, void, and supersede.
- POD draft, submit, resubmit, verify, partially verify, reject, request correction, withdraw, and reverse verification.
- Exception assign, resolve, waive, reopen, and escalate.

### WorkflowPolicy

Policy-driven rules must be data, not hardcoded UI logic. Policies are scoped by global default, client, project, vendor, or client/vendor combination.

Policies govern:

- Client PO requirement.
- Under-allocation approval.
- Production readiness gating before shipment.
- Address/contact blockers before dispatch.
- Required Delivery Note and shipping labels before dispatch.
- Required signed DN, photo count, overage handling, missing POD escalation, and file evidence.
- Client-visible Delivery Notes, POD evidence, vendor names, and reporting fields.
- SLA thresholds for production, dispatch, POD, and exception resolution.

### FileAsset

All generated documents and uploaded evidence must use `FileAsset` rather than unstructured upload metadata.

File assets cover:

- Generated Delivery Note PDF.
- Signed Delivery Note scan/photo.
- POD photo evidence.
- Shipping label PDF/image.
- Production/QC attachments when used.

Each file asset must carry lifecycle status, scan/quality status, checksum when available, preview/download access, retention policy, and role/client/vendor visibility.

### ShippingPackage And ShippingLabel

Shipping labels are first-class records generated from shipment packages. A package can group one or more shipment batch items for a Sales Point.

Required label lifecycle:

- `GENERATED`
- `PRINTED`
- `REPRINTED`
- `VOIDED`
- `SUPERSEDED`

Every print, reprint, void, and regenerate action emits an event. Labels include a QR payload with label number, batch, package, Sales Point, and checksum.

### DeliveryConfirmationAttempt And Verification Event

POD evidence must preserve every submission attempt. Verification applies received quantities through an immutable verification event with an idempotency key.

Rules:

- Rejected evidence is never overwritten by a later resubmission.
- Partial verification is item-level: accepted lines can apply received quantity while rejected lines open or retain exceptions.
- Reversal requires a new event that points to the original verification event and rebuilds projections.

### ProductionJob

`ProductionJob` is the manufacturing source of truth. `OrderItem.productionStatus`, ready quantity, and order production summaries are projections from Production Jobs.

Shipment Batch creation must validate against unreserved ready quantity when the active policy enforces readiness gating.

### SalesPointAlias And SalesPointMerge

Sales Point duplicate handling is required for 10,000+ Sales Point operation.

Rules:

- Imports can create aliases and low-confidence candidate matches.
- Merges must preserve historical snapshots on batches, Delivery Notes, labels, and POD.
- Active allocations may be remapped only through audited merge/remap commands.

### IntegrationSyncRecord

External system interaction must be idempotent and traceable.

Each integration sync record links an internal entity to source system, external ID, direction, idempotency key, attempt status, retry state, conflict type, and payload checksum.

### InstallationJob And InstallationConfirmation

Installation is not Phase 1 execution scope, but the model now reserves first-class records so delivery completion is not conflated with installation completion.

Installation records attach to order, Sales Point, and allocation references and carry evidence through `FileAsset`.

### Invoice, InvoiceLine, And ReconciliationRun

Invoice reconciliation is not Phase 1 execution scope, but billable quantities must be linkable to verified delivery, accepted variance, exception resolution, and future invoice lines.

## Source Of Truth And Projection Rules

Canonical write entities:

- `OrderRequest`: demand facts only.
- `OrderItem`: ordered product facts and product snapshot.
- `ProductionJob`: manufacturing facts.
- `SalesPointAllocation`: planned destination quantity and approved adjustments.
- `ShipmentBatch` and `ShipmentBatchItem`: shipped quantity facts.
- `DeliveryConfirmationAttempt` and `PodVerificationEvent`: claimed and verified receipt facts.
- `OperationalException`: issue state and resolution.
- `AuditEvent`/`DomainEvent`: immutable change history.

Projection-only fields:

- Order production and distribution statuses.
- Order, item, allocation, Sales Point, batch, dashboard, and report quantity summaries.
- POD summary status on order, batch, DN, Sales Point, and allocation rows.
- Exception summary booleans and counts.

Projection rebuild triggers:

- Any domain event that changes production quantity/status, allocation quantity, shipment quantity/status, POD verification, exception state, document/label state, policy, or master-data relationship.
- Migration commands that create compatibility batches or compatibility Delivery Notes.

Projection responses must include projection version and stale marker where the UI can take action on outdated data.

## Multi-Tenant Scope Rules

- Client ownership is canonical on Project, Sales Point, Order Request, and client-facing projections.
- Vendor ownership is canonical on Production Job, assigned Shipment Batch, and vendor-facing queues.
- User authorization is evaluated against role plus client/vendor/project scope before every query and command.
- Client users cannot infer other clients' Sales Points, vendors, documents, POD evidence, or exceptions through search, counts, exports, or route IDs.
- Vendor users cannot access unassigned orders, batches, PODs, or Sales Points except through explicitly assigned work.
