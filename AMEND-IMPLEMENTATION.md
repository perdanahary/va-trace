# Amend Order Implementation

## Problem

Admin POV showed **"Production Ongoing (Order Locked)"** in the order detail header for all orders with `productionStatus !== "COMPLETED" && productionStatus !== "CANCELLED"`. This included orders that hadn't started production yet (`NEW`, `SUBMITTED`, `ACCEPTED`), where no meaningful locking exists.

## Solution

Introduced an **"Amend Order"** button in the header that replaces the locked badge when the order is in a pre-production state. Amending navigates to a form that pre-fills the existing order data, allows editing, and submits via `amendOrderRequest()`.

---

## Files Changed

### `src/pages/admin/OrderDetail.tsx`
- **`canAmend`** — new boolean: `productionStatus` is one of `NEW | SUBMITTED | ACCEPTED` and user is `admin | operator`
- **`isProductionPhase`** — tightened to only `IN_PROGRESS | EXCEPTION` (actual production running)
- **`renderWorkflowActions`** — three-way branch: `canAmend` → **Amend Order** button (navigates to `/admin/orders/:id/amend`), `isProductionPhase` → locked badge, else existing logic
- **`buildFocusCard`** — same classification; pre-production orders show "Order Request Created / Waiting for production start" card

### `src/lib/routes.ts`
- Added `orderAmend: (id) => \`/admin/orders/${id}/amend\``

### `src/App.tsx`
- Imported `AdminAmendOrder`, added route `/admin/orders/:id/amend`

### `src/pages/admin/AdminAmendOrder.tsx` (new)
- Fetches existing `OrderRequest` by ID via `useOrderRequests()`
- Pre-fills form: items (product code, quantity), PO number, deadline, notes
- Allows: editing item quantities, adding/removing items, changing metadata
- **"Amendment Reason"** textarea (required, red-bordered card)
- Submits via `amendOrderRequest()` with:
  - `metadataChanges`: `clientPoNumber`, `deadlineDate`, `remarks`
  - `itemChanges`: only items whose `orderedQuantity` changed
- On success: toast + navigate back to order detail
- On error: toast + inline error message

---

## State Machine

| `productionStatus` | Behavior |
|--------------------|----------|
| `NEW` | Amend Order |
| `SUBMITTED` | Amend Order |
| `ACCEPTED` | Amend Order |
| `IN_PROGRESS` | Production Ongoing (Order Locked) |
| `EXCEPTION` | Production Ongoing (Order Locked) |
| `COMPLETED` | Normal workflow actions |
| `CANCELLED` | Normal workflow actions |
