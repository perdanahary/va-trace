# Implementation Plan - Order Detail State-Aware UX Refactor

Refactor the [OrderDetail.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/admin/OrderDetail.tsx) page to dynamically pivot its layout when the order is in the early production phase (Distribution Status: `NOT_STARTED` and all production jobs are `SUBMITTED` / pre-ready). This removes misleading actions, hides empty elements, and focuses the user's attention on active production tracking.

## User Review Required

> [!IMPORTANT]
> The primary action "Create Shipment Batch" in the header will be **hidden** when there is 0 ready production quantity. A status label indicating the order is "Locked for Production" will be displayed instead.

> [!NOTE]
> The tabs "Documents" and "Compliance" will be **dynamically hidden** from the view until the first shipment batch is created, reducing screen clutter in the early lifecycle phase.

---

## Proposed Changes

### [Admin Order Workbench]

#### [MODIFY] [OrderDetail.tsx](file:///Users/perdanahary/Documents/Projects/Officebee/VA%20Trace/src/pages/admin/OrderDetail.tsx)

1. **Calculate Production Phase Helpers**:
   - Extract `totalReadyQty` from `hydrated.productionJobs` to determine if any items are ready for dispatch.
   - Detect if the order is in the pre-shipment phase: `isProductionPhase = hydrated.order.distributionStatus === "NOT_STARTED" && totalReadyQty === 0`.

2. **Adjust Header Actions**:
   - Update `canCreateBatch` to require `totalReadyQty > 0`.
   - If `isProductionPhase` is true, hide the primary "Create Shipment Batch" button in the header and render a badge/pill stating: `Production Ongoing (Order Locked)`.

3. **Simplify Sidebar (At a Glance)**:
   - Modify `buildFocusCard` so that when `isProductionPhase` is true, it displays:
     - **Eyebrow**: `"Production Phase"`
     - **Title**: `"Waiting for production progress"`
     - **Description**: `"The vendor is manufacturing the items. Shipment batch creation will unlock once ready quantities are reported."`
   - If `isProductionPhase` is true, hide the `Documents` and `Exceptions & Complaints` cards in the sidebar.

4. **Dynamic Tabs Visibility**:
   - Filter `ORDER_DETAIL_TABS` to show only `Overview`, `Allocations & Jobs` (customized from `Operations`), and `Audit` when `isProductionPhase` is true.
   - Rename the `"operations"` tab trigger label to `"Allocations & Jobs"` for better clarity in the simplified view.

5. **Overview Tab Improvements**:
   - If `isProductionPhase` is true:
     - Replace the `DeliveryProgressBar` card with a new custom `ProductionPipelineStepper` component.
     - The stepper will show 4 nodes: `Submitted` ➔ `Accepted` ➔ `In Production` ➔ `Ready to Ship`.
     - Highlighting of active node will map from the order's `productionStatus`.
     - When `totalReadyQty > 0` but distribution hasn't started, show a secondary progress bar: `X / Y pcs ready for shipping`.

---

## Verification Plan

### Automated Tests
- Create a new Playwright test `tests/order-detail-ux-state.spec.ts` that:
  - Sets up mock data with `distributionStatus: "NOT_STARTED"` and production jobs in `SUBMITTED`.
  - Asserts that the "Create Shipment Batch" button is hidden.
  - Asserts that the "Documents" and "Compliance" tabs are hidden.
  - Asserts that the Focus Card displays the production phase message.
  - Asserts that the Production Stepper is visible on the Overview tab.

### Manual Verification
1. **Navigate to Order Detail** of an order with 0 ready items. Verify the header button is hidden, the stepper is shown, and tabs are simplified.
2. **Mark a Production Job Ready**: In vendor dashboard or mock data, change a production job to have `readyQuantity > 0`. Go back to the Admin Order Detail, and verify that the "Create Shipment Batch" button appears, and the Focus Card changes to "Ready for distribution".
