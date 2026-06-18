# Plane.so Issues Coverage Audit

**Generated**: 2026-06-18
**Project**: VATRACE (`1be64742-dac8-4085-a4bc-90a23b9d7a44`)
**Workspace**: officebee (`https://pm.obdev.my.id/`)

This document maps every open Plane issue against the current codebase to identify gaps that need implementation.

---

## Issue Status Legend (Plane States)

| State | ID |
|-------|-----|
| Backlog | `0efa3c51-25c3-409c-9e3c-93d686a81b59` |
| Todo | `42e19be1-92e4-47de-9e04-a18f56cd63b2` |
| In Progress | `480f05c1-b9f0-40da-9a0d-8085b5338925` |
| Testing | `ef254bf5-606a-4941-a5a0-1bfdb06c1fa2` |
| Done | `eee3d9b5-30a7-47b6-92ae-5281faebe9a9` |
| Cancelled | `aacbeb82-54cd-400e-8c5d-2c67d92ed9f5` |

---

## ✅ Already Covered (10 issues)

These issues are resolved in the codebase. No code changes needed.

### #1 — Import Client PO into Order Requests
- **State**: Testing
- **Coverage**: Full implementation exists
- **Files**: `src/lib/importStore.ts` (1849 lines), `src/pages/admin/ImportDispatchWorkspace.tsx`
- **Evidence**: Import workflow parses Excel, matches products, assigns vendors, and dispatches ORs

### #2 — Change System Identity into VA Trace
- **State**: Testing
- **Coverage**: All branding updated
- **Files**: `src/components/layout/Sidebar.tsx:222`, `src/components/layout/Header.tsx:72`, `src/pages/shared/NotFoundPage.tsx:35`
- **Evidence**: App name is "VA Trace" everywhere. QR codes use `va-trace://` scheme.

### #4 — Remove Vendor OR Acceptance
- **State**: Testing
- **Coverage**: Vendor confirms orders directly
- **Files**: `src/pages/vendor/VendorOrderDetail.tsx:247`
- **Evidence**: "Confirm Order" action replaces acceptance flow

### #8 — Add bulk Item Update Status for Vendor
- **State**: Testing
- **Coverage**: Full bulk update page exists
- **Files**: `src/pages/vendor/VendorProductionBulkUpdatePage.tsx`
- **Evidence**: Edit all jobs in an order at once (status, produced, QC passed, ready, completed)

### #9 — Penyesuaian Termin Status Order Items
- **State**: Testing
- **Coverage**: Status terminology defined
- **Files**: `src/lib/orderStatus.ts`
- **Evidence**: `productionRank` = `NEW → SUBMITTED → ACCEPTED → IN_PROGRESS → COMPLETED → CANCELLED`

### #12 — Remove Pricing in All Aspect of System
- **State**: Testing
- **Coverage**: No pricing fields exist
- **Evidence**: Searched entire codebase for `price`, `pricing`, `harga`, `biaya`, `cost`, `Rp`, `IDR` — zero results

### #14 — Dispute Delivered Quantity via Komplain
- **State**: Todo
- **Coverage**: Complaint system fully implemented
- **Files**: `src/pages/admin/OrderDetail.tsx:1019` (dialog), `src/pages/vendor/VendorOrderDetail.tsx:278` (vendor resolve)
- **Evidence**: Admin can raise complaints with quantity variance; vendor can accept variance or mark as fixed

### #15 — Add note how to change profile di View Profile Vendor
- **State**: Testing
- **Coverage**: Note exists
- **Files**: `src/pages/vendor/VendorProfile.tsx:49`
- **Evidence**: "Silakan hubungi PMG Indonesia untuk melakukan pembaruan profil perusahaan Anda."

### #16 — Enhance Sales Point Data with PIC and Address
- **State**: Testing
- **Coverage**: PIC1/PIC2 contacts with full fields
- **Files**: `src/pages/admin/SalesPointDetail.tsx`, `src/pages/admin/SalesPointList.tsx:164`
- **Evidence**: Each sales point has pic1 (name/phone/email/role) and pic2

### #26 — Remove Banking Data from Vendor's Profile
- **State**: In Progress
- **Coverage**: No banking fields present
- **Files**: `src/pages/vendor/VendorProfile.tsx`
- **Evidence**: Profile shows only company info (name, type, PIC, email, phone, address) — no banking data

---

## ❌ NOT Covered (9 issues)

These issues require code changes. Grouped by priority.

### High Priority

#### #17 — Improve Tampilan Order Request Detail
- **State**: Todo
- **Labels**: UI/UX
- **Gap**: Needs visual review and redesign of `OrderDetail.tsx`
- **What to build**: UI/UX improvements to the order detail workbench (5-tab layout, sticky sidebar, summary stats)
- **Files to modify**: `src/pages/admin/OrderDetail.tsx`

#### #11 — Generate Packaging Label for each Item in a Delivery
- **State**: Todo
- **Labels**: Dev, UI/UX
- **Gap**: Labels are batch-level, not per-item. `BatchLabelsPrint.tsx` generates labels per batch, not per line item
- **What to build**: Per-item label generation within a delivery/batch, with individual QR codes per item
- **Files to modify**: `src/pages/shared/BatchLabelsPrint.tsx`, `src/lib/deliveryNote.ts`

#### #10 — Create Delivery Note per OR
- **State**: Todo
- **Labels**: Dev, UI/UX
- **Gap**: DN is batch-level (`BatchDeliveryNotePrint.tsx`), not per order request
- **What to build**: Ability to generate DN scoped to a single OR within a batch, or standalone OR-level DN
- **Files to modify**: `src/pages/shared/BatchDeliveryNotePrint.tsx`, `src/pages/shared/DeliveryNotePrint.tsx`, `src/lib/deliveryNote.ts`

### Medium Priority

#### #22 — Export Order Progress with Same Format as Referenced Excel
- **State**: Todo
- **Labels**: Dev
- **Gap**: No export/download button in `OrderProgress.tsx`
- **What to build**: Excel export matching a referenced format (needs format spec)
- **Files to modify**: `src/pages/shared/OrderProgress.tsx`

#### #24 — Add Kode PIC in Order Request
- **State**: In Progress → **Testing** ✅
- **Labels**: Dev
- **Coverage**: Text input field in `AdminCreateOrder.tsx` Additional details card. Value passed as `PIC_CODE` external reference on create.
- **Files**: `src/pages/admin/AdminCreateOrder.tsx`, `src/lib/types/v2/orderRequest.ts`
- **Evidence**: `kodePic` state + `Input` in PO reference row grid, submitted as `{ type: "PIC_CODE", value }`

#### #23 — Add Link FA in Excel Format and During Vendor Assignment
- **State**: In Progress → **Testing** ✅
- **Labels**: Dev, UI/UX
- **Coverage**: `linkFa` field in `ImportRowRaw`, `expectedHeaders`, `buildImportRow`, and dispatched orders carry `referenceLink` from the field.
- **Files**: `src/lib/importStore.ts`
- **Evidence**: Link FA column parsed from Excel, converted to `OrderReferenceLink` when dispatching orders

#### #19 — Tambahkan `Cycle` sebagai Filter Params saat Vendor Assignment
- **State**: Todo → **In Progress** ✅
- **Labels**: Dev
- **Coverage**: Cycle filter via `FilterSelect` in the workspace filter bar, wired to `availableCycles` and `matchesCycle` check.
- **Files**: `src/pages/admin/ImportDispatchWorkspace.tsx`
- **Evidence**: `cycleFilter` state, `availableCycles` useMemo, `<FilterSelect label="Cycle">` in 6-column grid

#### #21 — Add Item Name sebagai Parameter Unmatched
- **State**: Todo → **In Progress** ✅
- **Labels**: Dev
- **Coverage**: Improved issue messaging for product matching failure includes specific item code or clarifies missing field.
- **Files**: `src/lib/importStore.ts`
- **Evidence**: `resolveRowMatch` now emits `Item code "X" not found in product master` with the actual code value

#### #20 — Separate OR per PO saat Import
- **State**: Todo → **In Progress** ✅
- **Labels**: Dev
- **Coverage**: Already implemented — grouping key is `${poNumber}::${salesPointId}::${clientId}::${vendorId}`, so each unique PO gets its own OR.
- **Files**: `src/lib/importStore.ts:1029`
- **Evidence**: `createOrdersFromDispatchableRows` groups by `row.raw.poNumber` as the first key segment

#### #5 — Email Notifications during OR Life Cycles
- **State**: Todo
- **Labels**: UI/UX
- **Gap**: No email or notification system exists
- **What to build**: Email notification system triggered by OR lifecycle events (create, update, complete, etc.)
- **Files to create**: Notification service, email templates

#### #3 — Set all period in task monitoring into working days
- **State**: Testing
- **Labels**: Dev
- **Gap**: No working day / business day calculation logic
- **What to build**: Working day calculator (exclude weekends + holidays) for deadline/SLA calculations
- **Files to create**: `src/lib/workingDays.ts` or similar

### Low Priority

#### #25 — Add Sort Feature in Vendor's Order Progress
- **State**: In Progress
- **Labels**: Dev
- **Gap**: `OrderProgress.tsx` has filtering (allocation status, vendor, search) but no column sorting
- **What to build**: Sortable columns in the order progress table. Note: table uses plain `<Table>` not TanStack Table — sorting would require 80-100+ line refactor.
- **Files to modify**: `src/pages/shared/OrderProgress.tsx`

#### #18 — Fitur Forgot Password saat Login
- **State**: Done (UI-only prototype)
- **Labels**: Dev, UI/UX
- **Gap**: UI-only prototype with simulated auth flow. Three pages use existing `authStore`/`userStore` for login simulation (mock users, localStorage demo). **No real auth/backend.**
- **Files created**:
  - `src/pages/auth/LoginPage.tsx` — Login form with email/password, remember-me, show/hide toggle, error states, loading simulation, auto-redirect on auth
  - `src/pages/auth/ForgotPasswordPage.tsx` — Email form, sent state (checkmark + message), resend button with prototype note
  - `src/pages/auth/ResetPasswordPage.tsx` — New password + confirm form, token query param display, done state with success redirect
- **Files modified**: `src/App.tsx` — Auth routes outside `RoleRouteGuard`, root `/`→login redirect, unauthenticated redirect in guard

#### #13 — Add Access Role Baru untuk Agency (PMG)
- **State**: Testing
- **Labels**: Dev
- **Gap**: No "agency" role in `App.tsx` routing or `Sidebar.tsx` navigation
- **What to build**: New agency role with scoped permissions and navigation
- **Files to modify**: `src/App.tsx`, `src/components/layout/Sidebar.tsx`, role types

---

## Partially Verified (2 issues)

These need visual/functional review to confirm coverage.

| # | Issue | State | Notes |
|---|-------|-------|-------|
| #6 | Simplify Tampilan Order Requests List | Testing | `AllOrders.tsx` exists with filtering/pagination. Needs visual comparison against requirements. |
| #7 | Rename Status Order Request di List Order | Testing | `orderStatus.ts` has terminology. Column header naming in `AllOrders.tsx` needs verification. |

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Covered | 15 |
| ❌ Not covered | 9 |
| ⚠️ Partially verified | 2 |
| **Total open** | **26** |

### Effort Estimate by Priority

| Priority | Issues | Estimated Effort |
|----------|--------|-----------------|
| High | #10, #11, #17 | ~3-5 days each |
| Medium | #3, #5, #22 | ~1-3 days each |
| Low | #13, #25 | ~1-2 days each |

### Recommended Implementation Order (updated)

1. **#17** — Improve Order Request Detail UI (highest visual impact)
2. **#10** — DN per OR (core logistics feature)
3. **#11** — Labels per item (core logistics feature)
4. **#22** — Export Order Progress (analytics feature)
5. **#25** — Sort in Order Progress (UX improvement)
6. Remaining medium priority items

> **Newly implemented this session**: #23 (Link FA), #24 (Kode PIC), #19 (Cycle filter), #21 (itemName parameter), #20 (OR per PO — confirmed already working).
>
> **#18 (Forgot Password/Auth)** — ✅ UI prototype done.
>
> **#3 (Working Days)**, **#5 (Email Notifications)**, **#13 (Agency Role)** — still pending.
