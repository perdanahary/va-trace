# 03 - Phase 3: Workflow Implementation

Scope: Order Request, Production, Shipment Batch, Delivery Note, Sales Point Allocation, POD workflows.
Normative sources: `docs/specs/01-order-management-spec.md`, `02-production-management-spec.md`, `03-shipment-batch-spec.md`, `04-delivery-note-spec.md`, `05-sales-point-allocation-spec.md`, `06-pod-verification-spec.md`, `docs/v2-status-lifecycle.md`, `docs/api-contracts/*`.

Global command rules (every task below):

- Accept `CommandMetadata`; require `expectedVersion` on updates and `idempotencyKey` on retryable commands.
- Return `MutationResponse` with `auditEventIds`, `domainEventIds`, `sideEffects`.
- Reject invalid lifecycle transitions with contract `ApiError` shapes.
- Open/update `OperationalException` for: quantity variance, rejected POD, missing address/contact, failed delivery, return, duplicate Sales Point, document correction (CR-01).
- Consult `WorkflowPolicy` for: PO requirement, under-allocation approval, readiness gating, dispatch blockers, DN/label requirements, POD evidence rules, overage handling (CR-04).

## Exact Implementation Sequence

Workflows must land in this order; each consumes the previous one's outputs:

1. Order Request (demand exists)
2. Sales Point Allocation (destinations planned) - implemented immediately after Order Request because batches depend on allocations
3. Production (readiness pool feeds batch eligibility)
4. Shipment Batch (physical execution)
5. Delivery Note + Labels (documents generated from batches)
6. POD (verification closes the loop; derives received quantities, allocation/distribution status, completion)

---

## Workflow 1: Order Request (`docs/specs/01-order-management-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 1.1 | P3-01 | `createOrderRequestDraft` command: metadata, items; draft saves allowed with incomplete data per draft rules | `orderRequestStore` | P1-11 |
| 1.2 | P3-02 | `submitOrderRequest`: requires client, project, vendor, deadline, requester, source, >=1 item, >=1 allocation; client PO required per policy; field-level errors | `orderRequestStore` + `policyStore` | P3-01, P3-05 |
| 1.3 | P3-03 | `amendOrderRequest` + `cancelOrderRequest`: cancel blocks new batches/documents; amendment guards after shipment dependency | `orderRequestStore` | P3-02 |
| 1.4 | P3-04 | Wire creation wizard (P2-20) + order list/detail actions to commands; emit side effects to production job generation | `AdminCreateOrder`, `CreateOrder`, `OrderDetail` | P3-02, P2-13, P2-20 |

## Workflow 2: Sales Point Allocation (`docs/specs/05-sales-point-allocation-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 2.1 | P3-05 | `createAllocations` within order create/amend: allocation > 0; sum by product <= ordered; under-allocation requires reason + approval per policy | `allocationStore` | P1-12 |
| 2.2 | P3-06 | `adjustAllocation`, `approveAllocation`, `cancelAllocation`: cannot reduce below shipped; cannot delete after shipment dependency; `ADJUSTED` status + audit | `allocationStore` | P3-05 |
| 2.3 | P3-07 | Derived `AllocationStatus` selector wiring (NOT_SHIPPED..FULLY_RECEIVED, SHORT/OVER_RECEIVED, ADJUSTED, CANCELLED, EXCEPTION) from batch items + verified POD | `selectors/derivedStatus.ts` | P1-17, P3-06 |
| 2.4 | P3-08 | Wire Allocations tab in `OrderDetail` + allocation table actions; variance opens `OperationalException` | `OrderDetail`, `SalesPointAllocationTable` | P3-06, P2-13 |

## Workflow 3: Production (`docs/specs/02-production-management-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 3.1 | P3-09 | `generateProductionJobs` from submitted Order Request (side effect of P3-02) | `productionStore` | P3-02, P1-13 |
| 3.2 | P3-10 | `acceptJob` + transition commands enforcing `NEW -> SUBMITTED -> ACCEPTED -> PRINTING -> FINISHING -> QUALITY_CONTROL -> READY_FOR_DISTRIBUTION -> COMPLETED` (+ `CANCELLED`, `EXCEPTION`); invalid transitions rejected | `productionStore` | P3-09 |
| 3.3 | P3-11 | `updateReadyQuantity`: ready <= ordered; feeds readiness pool for batch eligibility (HI-01, HI-13); readiness gating per policy | `productionStore` | P3-10 |
| 3.4 | P3-12 | Wire `/admin/production` queue, `/admin/production/:id`, Vendor workbench production panel | `ProductionQueue`, `VendorOrderWorkbench` | P3-11, P2-17, P2-19 |

## Workflow 4: Shipment Batch (`docs/specs/03-shipment-batch-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 4.1 | P3-13 | `createShipmentBatch` (DRAFT): exactly one order; items from outstanding allocations; quantity <= allocation outstanding; reservation created (HI-13); destination snapshot captured with version (MED-02) | `shipmentBatchStore` | P3-07, P3-11 |
| 4.2 | P3-14 | `markBatchReady` + `dispatchBatch`: dispatch requires >=1 item, required DN/labels per policy, address/contact blockers checked (exception or waiver); `DISPATCHED -> IN_TRANSIT` | `shipmentBatchStore` + `policyStore` + `exceptionStore` | P3-13, P3-18 |
| 4.3 | P3-15 | Failure paths: `recordFailedDelivery`, `recordReturn`, `cancelBatch`, `voidBatch`; each opens/updates exceptions; partial shipment/delivery flags derived | `shipmentBatchStore` | P3-14 |
| 4.4 | P3-16 | `closeBatch` + `reopenBatch` (Admin reason required): close blocked by open blocking exceptions unless policy waiver recorded | `shipmentBatchStore` + `exceptionStore` | P3-15, P3-24 |
| 4.5 | P3-17 | Wire `BatchCreationDialog` (select outstanding allocations -> draft/ready), batch list/detail pages, vendor batch queue | `BatchCreationDialog`, `ShipmentBatchDetail`, `VendorOrderWorkbench` | P3-13, P2-14, P2-17 |

## Workflow 5: Delivery Note + Labels (`docs/specs/04-delivery-note-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 5.1 | P3-18 | `generateDeliveryNote` from batch: one active DN per batch; DN number, receiver snapshot, items; `FileAsset` for generated PDF (CR-05); `GENERATED -> PRINTED` print event | `deliveryNoteStore` + `fileAssetStore` | P3-13 |
| 5.2 | P3-19 | DN versioning: `regenerateDeliveryNote` (reason required, `documentVersion`++, `supersedesDeliveryNoteId`, old DN `SUPERSEDED`), `voidDeliveryNote` rules (HI-07) | `deliveryNoteStore` | P3-18 |
| 5.3 | P3-20 | Label/package lifecycle: `generatePackages`, `generateLabels`, print/reprint/void/supersede events (CR-03); QR payload from batch item + DN + Sales Point | `labelStore` | P3-18 |
| 5.4 | P3-21 | Wire batch-scoped print routes (P2-16), DN register, label register; legacy order print routes resolve via `BatchSelectorDialog` | `DeliveryNotePrint`, `PackagingLabelsPrint`, DN/label registers | P3-19, P3-20, P2-16 |

## Workflow 6: POD (`docs/specs/06-pod-verification-spec.md`)

| Seq | Task ID | Task | Store / UI | Depends On |
| --- | --- | --- | --- | --- |
| 6.1 | P3-22 | Vendor `submitPod`: draft -> submit with signed DN scan + photos as `FileAsset` (evidence count per policy), received quantities per item; creates `DeliveryConfirmationAttempt`; `idempotencyKey` dedupe (CR-06) | `podStore` + `fileAssetStore` | P3-14 |
| 6.2 | P3-23 | Admin verification: `verifyPod`, `partiallyVerifyPod`, `rejectPod`, `requestCorrection`, `withdrawPod`, `resubmitPod`; item-level decisions; immutable `VerificationEvent`; `reverseVerification` command | `podStore` | P3-22 |
| 6.3 | P3-24 | Apply verified quantities: update batch item received, derive allocation/distribution status, DN `UPLOADED -> VERIFIED -> CLOSED`, quantity variance opens `OperationalException` (SHORT/OVER_RECEIVED); overage handling per policy | `podStore` -> selectors + `exceptionStore` | P3-23, P3-07 |
| 6.4 | P3-25 | Wire `PODUploader` (vendor), `PODVerificationDrawer` + `PODDecisionForm` (admin), POD queue `/admin/pod`, vendor correction queue; order completion derivation live (production COMPLETED + distribution FULLY_RECEIVED + all allocations received) | POD pages/components, `OrderDetail` POD tab | P3-24, P2-13, P2-19 |

## Cross-Workflow Exit Demo (Phase 3 gate)

Single scripted scenario on seed data, executed manually then encoded as E2E in Phase 4:

1. Admin creates Order Request with 2 items, 3 Sales Point allocations; submits (policy: PO required).
2. Vendor accepts production, progresses to `READY_FOR_DISTRIBUTION` with partial ready quantity.
3. Vendor creates Batch 1 (partial: 2 of 3 Sales Points), generates DN + labels, dispatches.
4. Vendor submits POD for Sales Point A (full) and B (short quantity).
5. Admin verifies A; partially verifies B -> variance exception opens; requests correction.
6. Vendor resubmits B; Admin verifies; exception resolved.
7. Vendor creates Batch 2 for remaining allocation; full cycle; all received.
8. Order derives `COMPLETED`; batch close blocked until exception resolved was honored; audit trail shows every command.
