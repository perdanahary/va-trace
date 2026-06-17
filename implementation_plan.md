# Implementation Plan — Vendor UX Overhaul + V2 Clean Migration

**Date:** 2026-06-15  
**Scope:** Vendor order surfaces + full removal of legacy `OrderComplaint` and `generateDeliveryNote()`  
**Files touched:** 7 pages/components + 3 lib files  
**Strategy:** Iterative-first — maximize V2 stores, delete legacy bridges, no backwards compat shims

---

## Background

The codebase is mid-migration between a legacy flat `Order` store (`va-trace-orders`) and a
normalized V2 domain (`va-trace-v2-*`). The vendor surfaces are the last significant consumers
of two legacy concepts that already have V2 equivalents:

| Legacy | V2 Equivalent | Status |
|---|---|---|
| `OrderComplaint` + `raiseQuantityComplaint` + `resolveQuantityComplaint` | `OperationalException` (type `QUANTITY_VARIANCE`) + `openException` + `resolveException` | ✅ Fully implemented in `exceptionStore.ts` |
| `generateDeliveryNote(order)` from `@/lib/deliveryNote` | `DeliveryNote` aggregate in `deliveryNoteStore.ts`, scoped to `ShipmentBatch` | ✅ Fully implemented |
| `deliverySnapshot` (address from legacy `salesPointSeed`) | `getSalesPointById()` in `salesPointStore.ts` + `allocationStore` | ✅ Accessible |

This plan removes both legacy concepts completely and fixes all 14 UX issues identified in the
vendor review.

---

## Guiding Decisions (from Grill-Me session)

| Decision | Choice |
|---|---|
| CTA for `SUBMITTED` state | **"Confirm Order"** |
| Where Confirm action lives | **Inline on list row** (VendorOrders + VendorDashboard) |
| `NEW` state (no job assigned) | **Passive badge: "Awaiting Job"** — no button |
| Attention banner | **Yes** — "You have N orders to confirm" on both pages |
| Files to fix | **Both** VendorOrders.tsx + VendorDashboard.tsx |
| Detail page CTA | **Yes** — header "Confirm Order" + callout banner when `SUBMITTED` |
| Allocation/batch UI gating | **Gate on ACCEPTED or later** |
| Implementation scope | **Full pass — all 14 issues + clean V2 migration** |
| Complaint approach | **Delete legacy, use `OperationalException` + `resolveException`** |
| DeliveryNote approach | **Delete `generateDeliveryNote()` usage, use V2 `deliveryNoteStore` + `salesPointStore`** |

---

## Architecture After Migration

```
VendorOrderDetail.tsx (after)
│
├── useHydratedOrder(id)           ← single source of truth
│   ├── hydrated.order.items       ← replaces order.items (legacy)
│   ├── hydrated.order.remarks     ← replaces order.note (legacy)
│   ├── hydrated.order.externalReferences ← replaces order.clientPO / soNumber
│   ├── hydrated.order.exceptionSummary   ← NEW: surface exception state
│   ├── hydrated.allocations[0]    ← address lookup via salesPointStore
│   ├── hydrated.shipmentBatches   ← batches + delivery notes (v2)
│   └── hydrated.deliveryNotes     ← replaces generateDeliveryNote()
│
├── useOperationalExceptions()     ← replaces order.complaint
│   └── filter by: type=QUANTITY_VARIANCE + sourceEntityId=orderId
│
└── resolveException()             ← replaces resolveQuantityComplaint()
    (from exceptionStore.ts)
```

---

## Delivery Address Strategy (Pre-batch vs Post-batch)

```
Pre-batch (SUBMITTED/ACCEPTED):
  hydrated.allocations[0].salesPointId
    → getSalesPointById(salesPointId)
    → SalesPoint.{ name, address, contacts, zone, region }

Post-batch (PRINTING → COMPLETED):
  hydrated.shipmentBatches[last].destinationSnapshots[0]
    → ShipmentDestinationSnapshot.{ salesPointName, address, contacts }
```

A helper `resolveVendorDeliveryAddress(hydrated, getSalesPointById)` encapsulates both cases.

---

## Component Mapping — Complaint Review → Exception Card

| Legacy `Complaint Review` card | V2 `Quantity Variance` card |
|---|---|
| `complaint.id` | `exception.exceptionNumber` |
| `complaint.status` (pending/approved/rejected) | `exception.status` (OPEN/RESOLVED/WAIVED) |
| `complaint.remarks` | `exception.description` |
| `complaint.items[]` (deltaQty) | `exception.affectedEntityRefs[]` → join `hydrated.allocations` for actual qty delta |
| `resolveQuantityComplaint(orderId, { decision: "approved" })` | `resolveException({ ..., resolution: { resolutionType: "FIXED" } })` |
| `resolveQuantityComplaint(orderId, { decision: "rejected" })` | `resolveException({ ..., resolution: { resolutionType: "ACCEPTED_VARIANCE" } })` |

---

## Proposed Changes

---

### Layer 0 — New Shared Helper

#### [NEW] `src/lib/v2/selectors/deliveryAddress.ts`

Pure selector resolving vendor-facing delivery address from `HydratedOrder`:

```ts
export interface VendorDeliveryAddress {
  companyName: string;
  salesPointName: string;
  wCode: string;
  address: string;
  phone?: string;
  picName?: string;
}

// Pre-batch: getSalesPointById(allocations[0].salesPointId)
// Post-batch: shipmentBatches[last].destinationSnapshots[0]
// No allocations: returns null → UI shows placeholder
export function resolveVendorDeliveryAddress(
  hydrated: HydratedOrder,
  getSalesPoint: (id: ID) => SalesPoint | undefined,
): VendorDeliveryAddress | null
```

---

### Layer 1 — `VendorOrders.tsx`

**File:** [VendorOrders.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/vendor/VendorOrders.tsx)

1. **Split `VendorOrderActions` by state:**
   - `NEW` → `<Badge variant="secondary">Awaiting Job</Badge>` (no button)
   - `SUBMITTED` → `<Button onClick={handleConfirmOrder}>Confirm Order</Button>`
   - `ACCEPTED+` (not fully received) → `<Button asChild>Update Progress</Button>`
   - `FULLY_RECEIVED` → `<Button variant="ghost">View</Button>`

2. **Rename + guard `handleConfirmOrder`:**
   - Guard: `if (row.productionStatus !== "SUBMITTED") return`
   - Same `acceptProductionJob` call, new toast: `"Order confirmed. Production can now begin."`

3. **Attention banner** above the table when `submittedCount > 0`:
   ```
   ⚡ You have N orders to confirm   [Show orders ↓]
   ```

4. **Column reorder** — move `deadline` first, add `orderedQuantity`, hide `pod` / `readyQuantity` / `shippedQuantity`.

5. **Quick Filter tabs** — "Needs Confirmation" / "In Production" / "Shipping" / "History".

6. **Remove Export CSV button.**

7. **Add page count** to pagination.

---

### Layer 2 — `VendorDashboard.tsx`

**File:** [VendorDashboard.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/vendor/VendorDashboard.tsx)

1. Same `handleConfirmOrder` rename + guard (same logic as Layer 1).
2. Pending tab: `NEW` → badge, `SUBMITTED` → "Confirm Order" button.
3. Attention banner above Tabs when pending count > 0.
4. Metric label update: `"Awaiting confirmation"` → `"Needs your confirmation"`.

---

### Layer 3 — `VendorOrderDetail.tsx` — Full V2 Migration

**File:** [VendorOrderDetail.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/vendor/VendorOrderDetail.tsx)

#### 3a. Remove legacy imports and usages
```ts
// DELETE:
import { generateDeliveryNote } from "@/lib/deliveryNote";
import { resolveQuantityComplaint, useOrders } from "@/lib/orderStore";
const orders = useOrders();
const order = orders.find(...) ?? orders[0];
const deliveryNote = generateDeliveryNote(order);
const deliverySnapshot = deliveryNote.deliverySnapshot;
const complaint = order.complaint;
```

#### 3b. Replace with V2 sources
```ts
// ADD:
import { useOperationalExceptions, resolveException } from "@/lib/v2/exceptionStore";
import { getSalesPointById } from "@/lib/v2/salesPointStore";
import { resolveVendorDeliveryAddress } from "@/lib/v2/selectors/deliveryAddress";

const order = hydrated?.order;  // V2 OrderRequest shape
const allExceptions = useOperationalExceptions();
const activeException = allExceptions.find(
  (e) => e.type === "QUANTITY_VARIANCE" &&
    ["OPEN","ASSIGNED","IN_REVIEW","REOPENED"].includes(e.status) &&
    (e.sourceEntityId === order?.id || e.affectedEntityRefs.some(r => r.entityId === order?.id))
);
const deliveryAddress = hydrated
  ? resolveVendorDeliveryAddress(hydrated, getSalesPointById)
  : null;
```

#### 3c. "Confirm Order" CTA in `renderWorkflowActions()`
When `hydrated?.productionStatus === "SUBMITTED"` → single "Confirm Order" button in header.

#### 3d. "Action Required" callout banner
Shown at top of page when `SUBMITTED`. Disappears on `ACCEPTED`.

#### 3e. Gate Allocation Table + Batch tools
```tsx
{hydrated && !["NEW","SUBMITTED"].includes(hydrated.productionStatus) && (
  <WorkflowStatusCard ... />
)}
```

#### 3f. Replace `deliverySnapshot` in Shipping Address card
Source from `deliveryAddress` (v2 helper). Show placeholder when `null` (pre-allocation).

#### 3g. Replace Complaint Review → Quantity Variance card
- Source from `activeException` (v2 `OperationalException`)
- Actions: "Acknowledge & Resolve" (`resolutionType: "FIXED"`) and "Accept Variance" (`resolutionType: "ACCEPTED_VARIANCE"`)
- Calls `resolveException()` instead of `resolveQuantityComplaint()`

#### 3h. Update Ordered Line Items card
- Use `order.items` (v2 `OrderItem`) — already has `shippedQuantity`, `receivedQuantity`
- Columns: `#`, `Product`, `Ordered`, `Shipped`, `Received`
- Remove "Ready for print" badge entirely

#### 3i. Minor fixes
- Header title: `order.id` → `order.orderRequestNumber`
- Remove fake `ArrowUpRight` icon on Supplier name
- Replace technical card descriptions with plain language

---

### Layer 4 — `src/pages/admin/OrderDetail.tsx`

**File:** [OrderDetail.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/admin/OrderDetail.tsx)

Replace the single `raiseQuantityComplaint` call site with `openException`:

```ts
// BEFORE:
raiseQuantityComplaint(hydrated.order.id, { remarks, createdBy, items });

// AFTER:
openException(
  {
    type: "QUANTITY_VARIANCE",
    severity: "HIGH",
    ownerRole: "VENDOR",
    sourceEntityType: "ORDER_REQUEST",
    sourceEntityId: hydrated.order.id,
    affectedEntityRefs: selectedAllocations.map(a => ({
      entityType: "SALES_POINT_ALLOCATION",
      entityId: a.id,
    })),
    title: `Quantity variance on ${hydrated.order.orderRequestNumber}`,
    description: remarks,
  },
  buildCommand(actor, "Raise quantity variance from admin order detail"),
);
```

> Admin UI shape stays the same — only the underlying command changes.

---

### Layer 5 — `src/pages/shared/DeliveryNotePrint.tsx`

**File:** [DeliveryNotePrint.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/shared/DeliveryNotePrint.tsx)

- Remove `generateDeliveryNote(order)` and `useOrders()`
- Read `deliveryNote` from `useHydratedOrder(id).deliveryNotes[0]` (V2 `DeliveryNote` aggregate)
- Scope: **data source switch only** — layout refactor is a separate task

---

### Layer 6 — `src/pages/shared/PackagingLabelsPrint.tsx`

**File:** [PackagingLabelsPrint.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/shared/PackagingLabelsPrint.tsx)

- Remove `useOrders()` → switch to `labelStore` (`va-trace-v2-labels`) via `useSalesPointLabels()`
- Scope: **data source switch only**

---

### Layer 7 — Legacy Cleanup

After all call sites removed:

| File | Action |
|---|---|
| [orderStore.ts](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/lib/orderStore.ts) | Remove `raiseQuantityComplaint`, `resolveQuantityComplaint`. Keep `getOrdersSnapshot` (V2 seed builders still need it). |
| [deliveryNote.ts](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/lib/deliveryNote.ts) | Remove `generateDeliveryNote`, `generatePackagingLabels` exports. Keep internal `buildLabelRecord`, `buildDeliveryNoteRecord` until `orderStore` is fully deprecated. |
| [types/order.ts](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/lib/types/order.ts) | Remove `ComplaintStatus`, `ComplaintLineItem`, `ComplaintHistoryEntry`, `OrderComplaint`, `complaint?`, `complaintStatus?`, `revisionStatus?` from `Order` interface. |

---

## Verification Plan

### Automated
```bash
npm run build       # tsc + vite — zero type errors confirms all legacy refs removed
npm run lint        # eslint — zero new warnings
npx playwright test # E2E — all existing tests pass
```

### Manual Checklist

| Scenario | Expected |
|---|---|
| Orders list — SUBMITTED orders exist | Attention banner: "You have N orders to confirm" |
| Orders list — NEW order row | "Awaiting Job" badge, no button |
| Orders list — SUBMITTED order row | "Confirm Order" button |
| Click "Confirm Order" on list | Toast success, button changes to "Update Progress" |
| Open SUBMITTED order detail | "Action Required" callout + "Confirm Order" in header |
| Confirm from detail page | Callout disappears, workflow actions appear |
| Open ACCEPTED order detail | Allocation Table + Batch tools visible |
| Shipping Address (pre-batch) | Address from `salesPointStore` |
| Shipping Address (post-batch) | Address from `shipmentBatch.destinationSnapshots` |
| Shipping Address (no allocations) | Placeholder: "Delivery address will appear once allocated." |
| Quantity Variance card | Replaces Complaint Review; shows exception from V2 store |
| Vendor resolves variance | `resolveException()` called, card disappears |
| Admin raises quantity issue | `openException(QUANTITY_VARIANCE)` called |
| DeliveryNotePrint | Renders from V2 `DeliveryNote`, not `generateDeliveryNote()` |
| Build passes | No TypeScript errors; no `resolveQuantityComplaint` or `generateDeliveryNote` imports remain |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Pre-batch order has no allocation → `deliveryAddress = null` | Helper returns `null` gracefully; UI shows contextual placeholder |
| Admin `OrderDetail` complaint UI selects items not allocations | Allocation IDs available via `hydrated.allocations`; UI adaptation is minimal |
| `getOrdersSnapshot` still needed by V2 seed builders | Explicitly kept — only complaint/deliveryNote functions removed |
| `DeliveryNotePrint` layout uses legacy `deliverySnapshot` field names | Data source switch only; layout refactor deferred to follow-up |
| Playwright tests may reference `complaint` in DOM | Update tests as part of execution |

---

## Estimated Effort

| Layer | Complexity | Est. |
|---|---|---|
| 0 — `deliveryAddress.ts` helper | Low | 30 min |
| 1 — `VendorOrders.tsx` | Medium | 45 min |
| 2 — `VendorDashboard.tsx` | Low | 30 min |
| 3 — `VendorOrderDetail.tsx` full migration | High | 90 min |
| 4 — `AdminOrderDetail.tsx` complaint → exception | Medium | 45 min |
| 5 — `DeliveryNotePrint.tsx` data source | Medium | 45 min |
| 6 — `PackagingLabelsPrint.tsx` data source | Low | 30 min |
| 7 — Legacy cleanup + type deletions | Low | 20 min |
| **Total** | | **~6 hrs** |
