# E2E Order Lifecycle Test Plan

## Context
The VA Trace app lacks a comprehensive E2E test that covers the **complete order lifecycle** from creation through to delivery completion. Existing tests cover isolated features (complaints, labels, delivery notes, routing) but none walks the full chain of order → production → shipment → delivery. This plan defines 4 test scenarios to fill that gap, following the app's existing Playwright + localStorage-seeding patterns.

## Scenarios

### Scenario A: Happy Path — New Order → Complete Delivery (golden path)

**Goal:** Create a fresh order, progress it through all stages to completion, verify each transition.

**Seed data:** Use `createManualOrder()` from `src/lib/orderStore.ts` to build a fresh order with 2 items (both quantity 10, status "New"), then `upsertOrder()` to write it to localStorage. The seed runs inside `page.addInitScript(() => { ... })`.

**UI walkthrough:**
1. Navigate to `/admin` — dashboard renders
2. Navigate to `/admin/orders` — order list visible, new order appears
3. Click the order → `/admin/orders/OR-XXXXX` — V2 Command Center tabs visible
4. **Start Production:** Click "Start Production" in the Production tab area (or via the shared action button)
   - Assert: items transition from "New" → "In Production"
5. **Create Shipment Batch:** In the order detail, create a shipment batch from the allocations
   - Assert: shipment batch with "READY" status appears
6. **Dispatch:** Click "Dispatch" on the batch
   - Assert: batch status changes to "DISPATCHED"
7. **Upload POD:** In the vendor role, navigate to `/vendor/orders/:id`, upload POD
   - Assert: items show `deliveredQuantity` updated, status "Delivered"
8. **Verify Delivery Note:** Navigate to `/admin/orders/:id/delivery-note`
   - Assert: delivery note shows correct quantities for both items
9. **Verify Completion:** Order status shows "Completed" / distribution "FULLY_RECEIVED"

**Approach:** Since full UI walkthrough through all roles is complex (requires role switching), use a **hybrid approach**:
- Seed the order fresh via `addInitScript` with `createManualOrder()`
- Use `page.evaluate(() => JSON.parse(localStorage.getItem('va-trace-orders')))` to check state mid-test
- Call the store functions directly via `page.evaluate` for actions like `startProduction`, `createShipmentBatch`, `dispatchShipmentBatch`, `uploadPodForShipmentBatch` (since these are synchronous localStorage operations)
- Navigate the UI for **rendering verification** at each stage

**Key assertions after each stage:**
| Stage | Assertions |
|-------|-----------|
| Initial | "Fulfillment Status" visible, items "0 pcs received" |
| After production | Items status "In Production" |
| After batch + dispatch | Batch shows "DISPATCHED" in shipment batches tab |
| After POD upload | "FULLY_RECEIVED" distribution status, items show "Delivered" |
| Delivery note | Correct delivered qty in table, outstanding = 0 |

**Existing pattern to follow:** `complaint-flow.spec.ts` uses `page.evaluate` to directly mutate localStorage mid-test, then navigates to verify UI reflects it.

### Scenario B: Complaint Flow — Quantity Adjustment After Delivery

**Goal:** Test the full complaint lifecycle: raise, approve, verify delivery note adjustment.

**Approach:**
1. Seed an order with one item 50 qty, `deliveredQuantity: 50` (simulating already delivered), status "Ready to Ship"
2. Navigate to `/admin/orders/:id`
3. Click "Raise Complaint" → dialog opens
4. Adjust `actualReceivedQty` for the delivered item to 45 (5 missing)
5. Click "Submit Complaint"
6. Assert: complaint pill shows "pending"
7. Navigate to `/vendor/orders/:id` — complaint block visible
8. Approve the complaint (reduce delivered qty from 50 → 45)
9. Assert: Approved badge visible, delivered qty shows 45
10. Navigate to delivery note page → verify "45Pcs" shown

**Models after:** `tests/complaint-flow.spec.ts` — but improve it by testing through the actual UI (button clicks + dialog fill) rather than full localStorage mutation.

### Scenario C: Partial Delivery / Multi-Batch Shipment

**Goal:** Verify the system correctly displays partial fulfillment states.

**Approach:**
1. Seed an order with 3 items: item-1 (50 qty), item-2 (50 qty), item-3 (50 qty), all "New"
2. Start production, then simulate partial delivery:
   - Create shipment batch for item-1 only (50 qty)
   - Dispatch and upload POD for that batch
3. Assert: distribution status shows "PARTIALLY_RECEIVED"
4. Assert: item-1 shows "Delivered", item-2 and item-3 show "In Production"
5. Assert: delivery note shows 50 delivered, 100 outstanding
6. Then run second batch for item-2, deliver it
7. Assert: distribution status still "PARTIALLY_RECEIVED" (or might reach different status)
8. Deliver item-3 → assert distribution "FULLY_RECEIVED"

### Scenario D: Vendor Shipment Workflow from Order Detail

**Goal:** Verify the vendor order detail page renders all shipment-related actions correctly.

**Approach:**
1. Seed an order that's in "Ready to Ship" with 2 items both `deliveredQuantity: 0`
2. Pre-seed allocations (required for "Create Shipment Batch" to be enabled)
3. Navigate to `/vendor/orders/:id`
4. Assert: "Create Shipment Batch" button visible
5. Create a batch → assert batch shows in list
6. Click into batch detail → assert batch items list renders
7. Assert: "Open Active Batch" link works
8. Assert: "Delivery Note" link renders when batch has a delivery note
9. Assert: "Labels" link renders

## Technical Design

### File to create
`/Users/perdanahary/Documents/Projects/Officebee/VA Trace/tests/e2e-order-lifecycle.spec.ts`

### Reusable helpers (to put at top of file)
```typescript
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const STORAGE_KEY = "va-trace-orders";

// Helper: seed a single order into localStorage
async function seedOrder(page, order: any) {
  await page.addInitScript(({key, orderData}) => {
    localStorage.setItem(key, JSON.stringify([orderData]));
    window.dispatchEvent(new Event("va-trace-orders:change"));
  }, {key: STORAGE_KEY, orderData: order});
}

// Helper: update order via localStorage direct
async function updateOrder(page, orderId: string, updater: (order: any) => any) {
  await page.evaluate(({key, id, updaterStr}) => {
    const orders = JSON.parse(localStorage.getItem(key) ?? "[]");
    const next = orders.map(o => o.id === id ? eval(updaterStr)(o) : o);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("va-trace-orders:change"));
  }, {key: STORAGE_KEY, id: orderId, updaterStr: updater.toString()});
}
```

### Test structure
```typescript
test.describe("E2E Order Lifecycle", () => {
  test("A: Happy path — new order through to completed delivery", async ({ page }) => { ... });
  test("B: Complaint flow — raise and approve quantity adjustment", async ({ page }) => { ... });
  test("C: Partial delivery with multiple shipment batches", async ({ page }) => { ... });
  test("D: Vendor shipment workflow from order detail", async ({ page }) => { ... });
});
```

### Verification commands
```bash
# Run just the new test
E2E_BASE_URL=http://localhost:5173 npx playwright test tests/e2e-order-lifecycle.spec.ts --project=chromium

# Or run all local tests
npm run test
```

### Key files referenced
- `src/lib/orderStore.ts` — all order mutation functions (startProduction, createShipmentBatch, dispatchShipmentBatch, uploadPodForShipmentBatch, raiseQuantityComplaint, resolveQuantityComplaint, generateLabelForItem, generateBulkLabels, regenerateDeliveryNote)
- `src/lib/orderStatus.ts` — status computation (getOrderRequestStatus, recomputeOrderDomainState)
- `src/lib/types/order.ts` — Order, OrderLine, SalesPointAllocation types
- `src/lib/types/logistics.ts` — ShipmentBatch, DeliveryConfirmation types
- `src/lib/types/status.ts` — ProductionStatus, DistributionStatus, ShipmentBatchStatus enums
- `src/lib/mock/orders.ts` — seed data patterns
- `tests/complaint-flow.spec.ts` — pattern for localStorage seeding + mid-test mutations
- `tests/v2-release-readiness.spec.ts` — pattern for create order via UI form
