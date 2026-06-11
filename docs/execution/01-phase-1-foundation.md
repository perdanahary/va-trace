# 01 - Phase 1: Foundation

Scope: domain model, types, enums, contracts, stores, mock data.
Normative sources: `docs/api-contracts/*` (contract-exact), `docs/implementation/01-domain-model-refactor.md`, `docs/implementation/02-state-management-refactor.md`, `docs/implementation/05-data-migration.md`, `docs/v2-status-lifecycle.md`, `docs/remediation/00-master-gap-register.md`.

Complexity scale: S (< half day), M (half-1 day), L (1-2 days), XL (2+ days) for an autonomous agent.

Parallel groups: tasks sharing a Parallel Group letter can run concurrently. Tasks in later groups depend on earlier groups as listed.

---

## Batch A1 - Contract Types & Enums (Parallel Group A)

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P1-01 | Shared foundation primitives | Implement `ID`, `ISODateString`, `Quantity`, `EntityReference`, `VersionedEntity`, `CommandMetadata`, `MutationResponse`, `MutationSideEffect(Type)`, `ApiError`, `ApiErrorCode`, `FieldError`, `ConflictError`, `ApiWarning` exactly per `docs/api-contracts/shared-foundation-api.md` sections 2-3. | `src/lib/types/v2/foundation.ts` (new) | None | M | Yes (A) |
| P1-02 | Status enum module | Implement all V2 enums per `docs/v2-status-lifecycle.md`: `ProductionStatus`, `DistributionStatus`, `ShipmentBatchStatus` (incl. `FAILED_DELIVERY`, `RETURNED`, `EXCEPTION`, `VOIDED`), `DeliveryNoteStatus` (incl. `SUPERSEDED`, `REGENERATED`, `VOIDED`), `AllocationStatus` (incl. `SHORT_RECEIVED`, `OVER_RECEIVED`, `ADJUSTED`), `DeliveryConfirmationStatus`, `PodStatus` projection enum, `ExceptionState`, label lifecycle. | `src/lib/types/v2/status.ts` (new) | None | M | Yes (A) |
| P1-03 | OrderRequest + OrderItem types | Contract-shaped `OrderRequest`, `OrderItem`, `OrderListRow`, allocation summary DTOs per `docs/api-contracts/order-request-api.md`. Includes `legacyStatusLabel` compatibility field, `clientPoNumber: string \| null`. | `src/lib/types/v2/orderRequest.ts` (new) | P1-01, P1-02 | M | Yes (A2 sub-wave) |
| P1-04 | SalesPoint + Allocation types | `SalesPoint`, `SalesPointContact`, `SalesPointAllocation`, `SalesPointAlias`, `SalesPointMerge` (HI-12), data quality flags, hierarchy (Zone/Region/Area/SubArea), per `docs/api-contracts/sales-point-api.md`. | `src/lib/types/v2/salesPoint.ts` (new) | P1-01, P1-02 | M | Yes (A2 sub-wave) |
| P1-05 | ProductionJob types | `ProductionJob`, readiness quantities, transition metadata per `docs/api-contracts/production-job-api.md` (HI-01). | `src/lib/types/v2/production.ts` (new) | P1-01, P1-02 | S | Yes (A2 sub-wave) |
| P1-06 | ShipmentBatch + Label/Package types | `ShipmentBatch`, `ShipmentBatchItem`, `ShipmentReservation` (HI-13), `ShippingPackage`, `ShippingLabel` lifecycle (CR-03), destination snapshot with version (MED-02), per `docs/api-contracts/shipment-batch-api.md`. | `src/lib/types/v2/shipment.ts` (new) | P1-01, P1-02 | L | Yes (A2 sub-wave) |
| P1-07 | DeliveryNote + POD types | `DeliveryNote` with `documentVersion`, `isActive`, `supersedesDeliveryNoteId` (HI-07); `DeliveryConfirmation`, `DeliveryConfirmationAttempt`, `VerificationEvent` with idempotency keys (CR-06), per `docs/api-contracts/delivery-note-api.md`. | `src/lib/types/v2/deliveryNote.ts` (new) | P1-01, P1-02 | L | Yes (A2 sub-wave) |
| P1-08 | Cross-cutting aggregates | `OperationalException` (CR-01), `AuditEvent`/`DomainEvent` (CR-02), `WorkflowPolicy` + `SlaPolicy` (CR-04, MED-04), `FileAsset` (CR-05), `AuthorizationScope` (CR-08), `IntegrationSyncRecord`/`ExternalReference` (HI-02, types only), future `Invoice`/`InstallationJob` attachment-point types (HI-03/HI-04, types only). | `src/lib/types/v2/exception.ts`, `src/lib/types/v2/events.ts`, `src/lib/types/v2/policy.ts`, `src/lib/types/v2/fileAsset.ts`, `src/lib/types/v2/scope.ts` (new) | P1-01, P1-02 | XL | Yes (A2 sub-wave) |

Gate A1: `npm run build` passes; every enum member in `docs/v2-status-lifecycle.md` exists; no type imports from legacy `src/lib/types/*` into `types/v2`.

---

## Batch B1 - Stores & Repositories (Parallel Group B; requires A1)

All stores follow the existing pattern: one localStorage key per aggregate group, `useSyncExternalStore` hooks, command functions for writes, repository adapter so localStorage can later swap to API (per `docs/implementation/02-state-management-refactor.md`).

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P1-09 | Repository adapter base | Generic repository interface: snapshot read, subscribe, command dispatch wrapping `CommandMetadata`, `expectedVersion` checks, `idempotencyKey` dedupe, `MutationResponse` return shape, audit/domain event append hook. | `src/lib/v2/repository.ts` (new) | P1-01 | L | No (blocks P1-10..P1-16) |
| P1-10 | `auditEventStore` + event bus | Append-only `AuditEvent`/`DomainEvent` storage (CR-02); emit hook consumed by projection rebuilds; key `va-trace-v2-events`. | `src/lib/v2/auditEventStore.ts` (new) | P1-08, P1-09 | M | No (blocks all command-emitting stores) |
| P1-11 | `orderRequestStore` | Owns `OrderRequest`/`OrderItem`. Commands: create draft, submit, amend, cancel, compatibility migrate. Does NOT own shipped/received truth. Key `va-trace-v2-orders`. | `src/lib/v2/orderRequestStore.ts` (new) | P1-03, P1-09, P1-10 | L | Yes (B) |
| P1-12 | `salesPointStore` + allocation ownership | Owns `SalesPoint`, `SalesPointContact`, `SalesPointAllocation`. Commands: CRUD, alias/merge/remap (HI-12), allocation adjust/approve/cancel. Keys `va-trace-v2-salespoints`, `va-trace-v2-allocations`. | `src/lib/v2/salesPointStore.ts`, `src/lib/v2/allocationStore.ts` (new) | P1-04, P1-09, P1-10 | XL | Yes (B) |
| P1-13 | `productionStore` | Owns `ProductionJob`. Commands: accept, progress transitions, QC, ready-quantity updates (HI-01). Key `va-trace-v2-production`. | `src/lib/v2/productionStore.ts` (new) | P1-05, P1-09, P1-10 | M | Yes (B) |
| P1-14 | `shipmentBatchStore` + `labelStore` | Owns `ShipmentBatch`, `ShipmentBatchItem`, `ShipmentReservation`, `ShippingPackage`, `ShippingLabel`. Reservation semantics with conflict errors (HI-13). Keys `va-trace-v2-shipments`, `va-trace-v2-labels`. | `src/lib/v2/shipmentBatchStore.ts`, `src/lib/v2/labelStore.ts` (new) | P1-06, P1-09, P1-10 | XL | Yes (B) |
| P1-15 | `deliveryNoteStore` + `podStore` | Owns `DeliveryNote` (one active per batch, versioning per HI-07) and `DeliveryConfirmation` with attempt history (CR-06). Keys `va-trace-v2-dns`, `va-trace-v2-pod`. | `src/lib/v2/deliveryNoteStore.ts`, `src/lib/v2/podStore.ts` (new) | P1-07, P1-09, P1-10 | L | Yes (B) |
| P1-16 | `exceptionStore`, `policyStore`, `fileAssetStore` | `OperationalException` lifecycle + closure-blocker queries (CR-01); scoped `WorkflowPolicy` resolution (global/client/project/vendor) (CR-04); `FileAsset` upload lifecycle + visibility (CR-05). Keys `va-trace-v2-exceptions`, `va-trace-v2-policies`, `va-trace-v2-files`. | `src/lib/v2/exceptionStore.ts`, `src/lib/v2/policyStore.ts`, `src/lib/v2/fileAssetStore.ts` (new) | P1-08, P1-09, P1-10 | XL | Yes (B) |

Gate B1: each store round-trips persistence; commands reject bad `expectedVersion`; every mutation appends >= 1 audit event.

---

## Batch A2 - Selectors, Seeds, Migration (Parallel Group C; requires B1)

| Task ID | Title | Description | Files Impacted | Dependencies | Complexity | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| P1-17 | Derived status selectors | Pure functions deriving `DistributionStatus`, `AllocationStatus`, `PodStatus` projection, `DeliveryProgress`, and the completion rule (production `COMPLETED` + distribution `FULLY_RECEIVED` + all allocations verified received). Marked as read projections with rebuild triggers (CR-07). | `src/lib/v2/selectors/derivedStatus.ts` (new) | P1-11..P1-15 | L | Yes (C) |
| P1-18 | Quantity math module | Single source for ordered/allocated/shipped/received/outstanding math; allocation sum <= ordered; shipped <= allocated; reservation-aware outstanding. | `src/lib/v2/selectors/quantities.ts` (new) | P1-12, P1-14 | M | Yes (C) |
| P1-19 | Legacy compatibility adapters | Split `orderStatus.ts` responsibilities: V2->legacy label adapter (`legacyStatusLabel`), legacy `PodStatus` value mapping (`PENDING`->`PENDING_UPLOAD`, `UPLOADED`->`SUBMITTED`). Freeze `orderDomain.ts` as migration-only adapter. | `src/lib/v2/compat/legacyLabels.ts` (new); `src/lib/orderStatus.ts`, `src/lib/orderDomain.ts` (annotate frozen) | P1-17 | M | Yes (C) |
| P1-20 | Normalized seed builders | Build V2 seeds from `src/lib/mock/orders.ts` (-> OrderRequest/OrderItem + compatibility allocations/batches), `salesPointSeed.ts`/`mock/salesPoints.ts` (-> SalesPoint + contacts + data quality flags), `mock/products.ts` (-> ProductReference), `mock/suppliers.ts` (-> VendorReference), `projectStore` campaigns (-> Project references). `mockData.ts` stays append-only legacy export. | `src/lib/v2/seed/*.ts` (new) | P1-11..P1-16 | XL | Yes (C) |
| P1-21 | localStorage migration + manifest | Idempotent migration: read `va-trace-orders` (never overwrite), write V2 keys, compatibility batch semantics for `deliveredQuantity` (CR-09), legacy-verification flags, migration manifest with run history, read-only reverse migration. | `src/lib/v2/seed/migrate.ts` (new) | P1-19, P1-20 | XL | No (after P1-20) |
| P1-22 | `importStore` output migration | Bulk PO import emits `OrderRequest` + `OrderItem` + `SalesPointAllocation` DTOs instead of legacy order drafts; row-level Sales Point candidate matching hooks (MED-07). | `src/lib/importStore.ts` (modify output layer only) | P1-11, P1-12, P1-20 | L | Yes (C, after P1-20) |

Gate A2 (Phase 1 exit): migration idempotent (run twice = identical state); legacy keys untouched; seeds load on fresh profile; `npm run build` + `npm run lint` green.

---

## Parallelization Summary

- Group A (P1-01, P1-02) -> sub-wave (P1-03..P1-08 all parallel).
- P1-09 then P1-10 are serial chokepoints; afterwards P1-11..P1-16 all parallel.
- P1-17, P1-18, P1-20 parallel; P1-19 after P1-17; P1-21 strictly after P1-20; P1-22 after P1-20.
