# 05 - Data Migration

## Purpose

This document defines the data migration strategy from current mock/localStorage data to V2 normalized data. It covers seed migration, localStorage migration, import/export changes, backward compatibility, validation, rollback, and mock API readiness.

The migration must support:

- Sales Point-centric distribution.
- Partial shipment.
- Partial delivery.
- Multiple shipment batches per order.
- Multiple Delivery Notes per order.
- Future POD verification.
- Future installation verification.

## Existing Mock Data Audit

### `mockData.ts`

Current role:

- Re-exports mock orders, products, Sales Points, suppliers, and types.
- Provides `generateSoNumber`, Sales Point binding helpers, and mock arrays.

Migration treatment:

- Keep as legacy compatibility export during migration.
- Add V2 seed exports from normalized fixture builders once ready.
- Avoid adding new V2 business logic to `mockData.ts`; use V2 seed modules.

### `mock/orders.ts`

Current structure:

- `mockOrderSeeds` are order-level records.
- Each order has:
  - `id` like `OR-2026-816972`.
  - `campaign`.
  - `createdDate`.
  - `deadline` as display text, not ISO deadline semantics.
  - `clientPO`.
  - `soNumber`.
  - `supplier`.
  - one `salesPointId`.
  - `clientId`, `clientName`, `clientEntityName`.
  - `picProject`.
  - `items` with `productCode`, `poLineNumber`, `quantity`, `deliveredQuantity`, legacy `status`, label state.
  - stored label/DN arrays.

Migration implications:

- Existing seeds are mostly one Sales Point per order.
- Delivered quantity may represent shipped or received depending on legacy status.
- `deadline` needs conversion or classification into `deadlineDate`/`DeadlineState`.
- `supplier` must map to Vendor reference.
- `campaign` must map to Project reference.

### `salesPointSeed.ts` and `mock/salesPoints.ts`

Current structure:

- WCode, Sales Point name, zone, region, area, subArea.
- Address/contact-like fields.
- Client binding for Sampoerna and seed data.

Migration implications:

- WCode should become a stable lookup key but not the only ID.
- Create `SalesPoint.id` separate from WCode if needed.
- Contacts become `SalesPointContact[]`.
- Address and delivery instructions must be normalized.
- Data quality flags should be derived at seed time.

### `orderStore.ts`

Current persisted data:

- localStorage key: `va-trace-orders`.
- Stores normalized legacy orders after `orderDomain.normalizeOrders`.
- May contain user-created manual orders, bulk imports, generated labels, generated DNs, embedded batches, POD uploads, and complaints.

Migration implications:

- Must never overwrite `va-trace-orders` during first migration.
- Must create V2 keys and migration manifest.
- Must support idempotent re-runs.

### Other stores

| Store | Existing key/data | Migration requirement |
| --- | --- | --- |
| `clientStore` | `va-trace-clients` | Preserve; add references to OrderRequest seeds. |
| `userStore` | `va-trace-users` | Preserve; add ownership scope migration later. |
| `supplierStore` | supplier/vendor data | Use as Vendor seed source. |
| `projectStore` | project names | Convert campaign names to Project references. |
| `importStore` | bulk PO import state | Migrate output shape, not necessarily historical transient state. |

## Target Data Structure

### Storage keys

Use versioned keys during migration:

| Key | Owns |
| --- | --- |
| `va-trace-v2-migration-manifest` | Migration version, run timestamp, source hash, rollback metadata. |
| `va-trace-v2-order-requests` | `OrderRequest` entity map and indexes. |
| `va-trace-v2-sales-points` | `SalesPoint` and `SalesPointContact` entity maps. |
| `va-trace-v2-sales-point-allocations` | `SalesPointAllocation` entity map and indexes. |
| `va-trace-v2-production` | `ProductionJob` entity map and indexes. |
| `va-trace-v2-shipment-batches` | `ShipmentBatch` and `ShipmentBatchItem` entity maps. |
| `va-trace-v2-delivery-notes` | `DeliveryNote`, labels, and indexes. |
| `va-trace-v2-delivery-confirmations` | `DeliveryConfirmation`, evidence, and item confirmations. |

### Old -> New mapping

| Old field/data | New field/data | Rule |
| --- | --- | --- |
| `Order.id` | `OrderRequest.orderRequestNumber`; internal `id` can be generated from order number. | Preserve display number. |
| `Order.campaign` | `ProjectReference.name`; `OrderRequest.project` | Match existing project or create deterministic project ID. |
| `Order.clientPO` | `OrderRequest.clientPoNumber` | Empty string -> `null`. |
| `Order.supplier` | `OrderRequest.vendor` | Match supplier/vendor by name; fallback `vendor_legacy_unknown`. |
| `Order.picProject` | `RequesterSnapshot` or remarks/external contact field | Preserve as requester snapshot where possible. |
| `Order.createdDate` | `audit.createdAt` | Convert date to ISO datetime at start of day if no time. |
| `Order.deadline` display text | `deadlineDate` and/or `DeadlineState` | If no absolute date exists, derive conservative date or mark `NO_DEADLINE` with source note. |
| `Order.salesPointId` | `SalesPointAllocation.salesPointId` and Sales Point reference | Resolve by WCode. |
| `Order.items[]` | `OrderItem[]` | One item per line. |
| `OrderLine.quantity` | `OrderItem.orderedQuantity` | Must be greater than zero. |
| `OrderLine.productCode` | `ProductReference.materialCode` and `sku` fallback | Resolve product master where possible. |
| `OrderLine.status` | `OrderItem.productionStatus` | Use legacy-to-production mapping. |
| `OrderLine.deliveredQuantity` | Compatibility `ShipmentBatchItem.shippedQuantity` and possibly verified received quantity | Create compatibility batch/POD only when legacy state implies delivery. |
| `Order.allocations[]` | `SalesPointAllocation[]` | Prefer existing allocation if present, otherwise create from order item + Sales Point. |
| `Order.shipmentBatches[]` | `ShipmentBatch[]` and `ShipmentBatchItem[]` | Preserve IDs when possible; normalize batch numbers. |
| `Order.storedDeliveryNotes[]` | `DeliveryNote[]` | Bind to batch; create compatibility batch if needed. |
| `Order.storedLabels[]` | Shipping Label records | Bind to batch item; create labels from batch items if needed. |
| `DeliveryConfirmation.status` | Contract `DeliveryConfirmationStatus`/`PodStatus` | Map legacy `UPLOADED` -> `SUBMITTED`, `PENDING` -> `PENDING_UPLOAD`. |
| `Order.complaint` | Exception/audit compatibility record | Preserve in audit/exception summary until dedicated exception model exists. |

## Transformation Rules

### Status transformation

| Legacy order/item status | Production status | Distribution status hint | Legacy label |
| --- | --- | --- | --- |
| `New` | `NEW` | `NOT_STARTED` | `New` |
| `Waiting` | `SUBMITTED` | `NOT_STARTED` | `Waiting` |
| `In Production` | `PRINTING` | Use quantity-derived distribution | `In Production` |
| `Ready to Ship` | `READY_FOR_DISTRIBUTION` | `PARTIALLY_DISTRIBUTED` or `NOT_STARTED` based on shipped qty | `Ready to Ship` |
| `On Delivery` | `READY_FOR_DISTRIBUTION` | `PARTIALLY_DISTRIBUTED` or `FULLY_DISTRIBUTED` based on shipped qty | `On Delivery` |
| `Delivered` | `COMPLETED` unless item incomplete | `FULLY_RECEIVED` if verified/compat received qty equals allocated | `Delivered` |
| `Completed` | `COMPLETED` | `FULLY_RECEIVED` if all allocations received | `Completed` |
| `Overdue` | Preserve production by item if possible; otherwise `SUBMITTED` | `EXCEPTION` if overdue blocks delivery | `Overdue` |
| `Partial X` | Map base `X`; derive partial from item/allocation spread | Quantity-derived | `Partial X` |

Contract rule:

- `OrderRequest.distributionStatus` is derived, not manually set.
- Legacy blended status is stored only as `legacyStatusLabel`.

### Allocation transformation

For each order item:

1. Resolve Sales Point from legacy `order.salesPointId` or existing allocation `salesPointId`.
2. Create one `SalesPointAllocation` per `(orderRequestId, orderItemId, salesPointId)`.
3. Set `allocatedQuantity = orderLine.quantity` unless existing allocation has a different planned quantity.
4. Derive `shippedQuantity` from shipment batch items after batch migration.
5. Derive `receivedQuantity` from verified Delivery Confirmations after POD migration.
6. Set `outstandingQuantity = allocatedQuantity - shippedQuantity`.
7. Set `remainingToReceiveQuantity = allocatedQuantity - receivedQuantity`.
8. Set `status` using allocation status rules.

### Compatibility batch transformation

Create a compatibility `ShipmentBatch` when:

- Legacy order has `deliveredQuantity > 0`.
- Legacy order has stored labels or DNs without `shipmentBatchId`.
- Legacy order has no explicit shipment batch but the UI previously showed delivered/on-delivery quantities.

Compatibility batch rules:

- `status = FULLY_RECEIVED` if all migrated items are treated as received.
- `status = PARTIALLY_RECEIVED` if some received quantity is lower than shipped quantity.
- `status = IN_TRANSIT` if shipped quantity exists but no received/verified quantity can be inferred.
- Mark with `extension.sapCoupaIntegration` or a local `compatibility` flag in audit metadata if no contract field is available.
- Admin-only UI should display compatibility origin in audit/detail.

### Delivery Note transformation

1. If `StoredDeliveryNoteRecord.shipmentBatchId` exists, bind directly to that batch.
2. If not, create/find compatibility batch, then bind DN to that batch.
3. Convert `doNumber` to `deliveryNoteNumber`.
4. Convert delivery snapshot to immutable `destinationSnapshots`.
5. Convert lines to `DeliveryNoteItem`.
6. Preserve `qrPayload`, file-less generated state, `printCount = 0` unless print timestamp exists.
7. Set status:
   - Missing status -> `GENERATED`.
   - Existing `GENERATED`, `PRINTED`, `SIGNED`, `UPLOADED`, `VERIFIED`, `CLOSED` -> same.

### POD transformation

1. Convert embedded batch `deliveryConfirmations` to `DeliveryConfirmation`.
2. If legacy confirmation has no item confirmations, create one confirmation item per batch item.
3. Map quantities:
   - `claimedReceivedQuantity = batchItem.receivedQuantity` when present.
   - `verifiedReceivedQuantity = batchItem.receivedQuantity` only when legacy status is verified or compatibility policy treats legacy delivered as verified.
4. Map status:
   - `PENDING` -> `DRAFT`/`PENDING_UPLOAD`.
   - `UPLOADED` -> `SUBMITTED`.
   - `VERIFIED` -> `VERIFIED`.
   - `REJECTED` -> `REJECTED`.
5. Preserve photo/scanned DN URLs as evidence metadata placeholders.

### Future extension transformation

Initialize extension objects as empty objects rather than omitting parent fields where contracts require `extension`.

Future-ready fields:

- `OrderExtensionFields.installationVerification.required = false` by default.
- `SalesPointExtensionFields.installationVerification` can carry delivery access instructions later.
- `ShipmentBatchExtensionFields.installationVerification` can later list Sales Points requiring installation.
- `DeliveryConfirmationExtensionFields.installationVerification` remains optional until installation verification is implemented.

## Backward Compatibility Strategy

### Read compatibility

- Legacy screens can keep reading `Order` aggregates through `orderStore`.
- V2 screens read normalized stores through selectors.
- During transition, a compatibility query layer can rebuild legacy `Order` shape from V2 stores when needed.

### Write compatibility

Write phases:

1. Legacy writes only.
2. Legacy writes with V2 read model derivation.
3. V2 writes with legacy aggregate write-through.
4. V2 writes only, with legacy aggregate built on demand.

Never allow two independent writers for the same field without parity checks.

### Route compatibility

- Old order DN/label routes select a batch.
- If exactly one batch exists, redirect to batch route.
- If multiple batches exist, show selector.
- If no batch exists but legacy data exists, Admin can create compatibility batch.
- If no batch and no legacy data exists, show no document available.

## Seed Data Generation Plan

### Seed builder modules

Create deterministic builders:

- `buildSalesPointSeeds()`
- `buildOrderRequestSeeds()`
- `buildSalesPointAllocationSeeds()`
- `buildProductionJobSeeds()`
- `buildShipmentBatchSeeds()`
- `buildDeliveryNoteSeeds()`
- `buildDeliveryConfirmationSeeds()`

Each builder should be idempotent and accept legacy seed arrays.

### ID conventions

| Entity | ID convention |
| --- | --- |
| Order Request | Preserve `OR-*` as number; internal ID can be `or_${slug}`. |
| Order Item | `${orderRequestId}:item:${lineNumber}` or migrated legacy item ID. |
| Sales Point | `sp_${wCode.toLowerCase()}` where WCode exists. |
| Sales Point Contact | `${salesPointId}:contact:${index}`. |
| Allocation | `${orderRequestId}:${orderItemId}:${salesPointId}` hashed or slugged. |
| Shipment Batch | Preserve old ID or generate `batch_${orderRequestNumber}_${n}`. |
| Shipment Batch Item | `${shipmentBatchId}:item:${allocationId}` with suffix for splits. |
| Delivery Note | Preserve `doNumber` or generate `dn_${deliveryNoteNumber}`. |
| Delivery Confirmation | Preserve old POD ID or `${shipmentBatchId}:pod:${salesPointId}:${n}`. |

### Seed scenarios required

Seed fixtures must include:

- One order, one Sales Point, full shipment, full delivery.
- One order, one Sales Point, two partial shipments.
- One order, multiple Sales Points, one shipment batch.
- One order, multiple Sales Points, multiple shipment batches.
- One shipment batch with partial delivery on one item.
- One order with multiple Delivery Notes.
- Vendor POD upload rejected and resubmitted.
- Legacy order-level print route with one batch.
- Legacy order-level print route with multiple batches.
- Sales Point with missing address/contact data.

## Mock API Migration

### Repository boundary

Local stores should expose API-like functions using DTO contracts:

- `CreateOrderRequestDto`
- `UpdateOrderRequestDto`
- `CreateShipmentBatchDto`
- `DispatchShipmentBatchDto`
- `GenerateDeliveryNoteDto`
- `CreateDeliveryConfirmationDto`
- `VerifyDeliveryConfirmationDto`
- `CreateSalesPointAllocationDto`

### Response boundary

Selectors should return API-like response/view models:

- `OrderRequestListResponse`
- `OrderRequestDetailResponse`
- `ShipmentBatchListResponse`
- `ShipmentBatchDetailResponse`
- `DeliveryNoteListResponse`
- `DeliveryNoteDetailResponse`
- `SalesPointListResponse`
- `SalesPointDetailResponse`

### Mock API parity

- Local repository functions should validate the same preconditions as the API contract.
- Use `expectedVersion` for mutation commands where contracts require it.
- Return permission objects with detail responses.

## Import/Export Migration

### Import changes

Bulk imports must output:

- Order Request metadata.
- Product/order item lines.
- Sales Point match candidates.
- Sales Point allocations.
- Validation errors by row.

Import validation must check:

- Product material code mapping.
- Sales Point WCode/code/name matching.
- Allocation quantity per product does not exceed ordered quantity.
- Required client/project/vendor fields.
- Missing address/contact warnings.
- Duplicate allocation rows.

Low-confidence Sales Point matches require confirmation through `ConfirmSalesPointImportMatchDto`.

### Export changes

Exports should be V2-specific:

- Order Request export includes production status, distribution status, delivery progress, allocation totals.
- Shipment Batch export includes batch status, shipped/received/variance, DN/POD status.
- Delivery Note export includes DN number, batch ID, order, Sales Points, shipped quantity, print/upload/verify status.
- POD export includes evidence/review state and variance.
- Sales Point export includes geography, contact/data quality, allocation/shipment/POD summaries.

## Data Validation Rules

### Required

- `OrderRequest`: client, project, vendor, requester, source, deadline before submit.
- `OrderItem`: product, description, ordered quantity > 0, unit of measure.
- `SalesPoint`: code, WCode, name, client, status, geography, address for active use.
- `SalesPointAllocation`: order, item/product, Sales Point, allocated quantity > 0.
- `ShipmentBatch`: order, vendor, at least one item before `READY`.
- `ShipmentBatchItem`: allocation, order item, product, Sales Point, shipped quantity > 0.
- `DeliveryNote`: shipment batch, order, DN number, destination snapshots, at least one item.
- `DeliveryConfirmation`: batch, DN, Sales Point, receiver name, received date, evidence, item confirmations.

### Quantity rules

- Allocation sum per product must not exceed ordered quantity.
- Under-allocation requires `underAllocationReason`.
- Batch quantity must not exceed allocation outstanding quantity.
- Batch quantity must not exceed production-ready quantity when readiness gating is enabled.
- Verified received quantity cannot exceed shipped quantity without Admin overage reason.
- Allocation cannot be deleted or reduced below shipped quantity.

### Relationship rules

- Batch belongs to exactly one order.
- Batch item references one allocation and one order item.
- One active DN per batch.
- DN item lines come from batch items.
- Delivery Confirmation belongs to batch and may reference DN.
- Vendor mutations require assigned vendor scope.

## Rollback Strategy

### Before V2 writes

- Delete V2 localStorage keys.
- Keep `va-trace-orders` untouched.
- Disable V2 feature flags.

### During dual-write

- Use migration manifest to identify last successful command.
- Rebuild V2 stores from `va-trace-orders` if V2 stores are corrupt.
- Rebuild legacy order aggregates from V2 only when V2 is known valid.

### After V2 write cutover

1. Export normalized V2 snapshot.
2. Run reverse adapter to generate compatibility `Order[]`.
3. Write compatibility data to a separate key first, for example `va-trace-orders-rollback-preview`.
4. Validate counts and summaries.
5. Only then restore `va-trace-orders` if rollback is confirmed.

### Rollback blockers

Rollback requires manual decision if:

- V2 created multiple batches for a legacy order and old UI cannot represent them without data loss.
- V2 verified item-level partial delivery that old `deliveredQuantity` cannot represent accurately.
- V2 changed allocation quantities after shipment.

In these cases, preserve V2 snapshot and downgrade UI to read-only compatibility mode instead of destructive rollback.

## Migration Acceptance Criteria

- Running migration twice produces the same V2 entity IDs and counts.
- Every `OrderRequest` has at least one `OrderItem`.
- Submitted orders have at least one `SalesPointAllocation`.
- Every shipped quantity belongs to a `ShipmentBatchItem`.
- Every Delivery Note has `shipmentBatchId`.
- No Delivery Note merges multiple batches.
- Allocation totals match order item quantities or carry `underAllocationReason`.
- Legacy route behavior works for migrated one-batch and multi-batch orders.
- V1 aggregate remains available until final cutover.
