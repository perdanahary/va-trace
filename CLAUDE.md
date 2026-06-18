# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## 🚀 MODE: ENGINEERING (Default)
**Triggers**: Specific code changes, refactoring, iteration
**Behavior**: Compressed output, no fluff, subagent-driven

Launch subagents. Output only the modified or requested code block. 
Do not provide explanations or setup guides unless asked. 
Ultra-concise, high-density style.

## 📚 MODE: LEARNING
**Triggers**: New concepts, architecture decisions, design patterns
**Behavior**: Step-by-step, conceptual first, then code

- Explain concept first
- Show working examples with comments
- Discuss why, not just how
- Include relevant references

Use when: "I want to understand...", "How does...", "Why..."

## 🔍 MODE: EXPLORATION
**Triggers**: Architecture design, ambiguous requirements, trade-off analysis
**Behavior**: Conversational, discuss multiple approaches

- Outline 2–3 approaches
- Compare trade-offs (complexity, performance, maintainability)
- Confirm direction before code

Use when: "Should I...", "What's the best way...", "Let's explore..."

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Type-check + Vite production build
- `npm run lint` — ESLint (ts,tsx, zero warnings)
- `npm run test` — Playwright E2E
- `npm run test:legacy` — Legacy E2E suite (bulk-import, complaint-flow, delivery-note, etc.)
- `npm run test:staging` — Staging E2E tests (requires `RUN_STAGING=1`)
- `npm run test:unit` — Vitest unit tests
- `npm run preview` — Preview production build
- `npm run doctor` — React Doctor diagnostics

## Architecture Overview

### Stack
React 18 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui (Radix primitives), React Router v6, TanStack Table, TanStack Virtual, framer-motion, next-themes, sonner, recharts, zod, qrcode.react.

### Routing & Roles
Routes are role-prefixed (`/admin`, `/vendor`, `/client`, `/operator`, `/analyst`). `RoleRouteGuard` in `App.tsx` enforces role matching — if URL role ≠ user role, redirect to the user's role home. The sidebar (`Sidebar.tsx`) provides role-specific navigation groups (Orders, Logistics, etc.).

### Data Layer (V2 — primary, under active development)
All state lives in localStorage. A three-layer architecture:

1. **`localRepository.ts`** — Generic `createLocalRepository<T>()` providing snapshot/subscription/write with cross-tab sync and seed fallback.
2. **`repository.ts`** — `createCollectionStore<T>()` + `runCommand()` (idempotency, versioning, audit events).
3. **Domain stores** — One per aggregate: `orderRequestStore`, `allocationStore`, `shipmentBatchStore`, `deliveryNoteStore`, `labelStore`, `productionStore`, `podStore`, `exceptionStore`.

Key V2 store keys: `va-trace-v2-orders`, `va-trace-v2-dns`, `va-trace-v2-labels`, `va-trace-v2-shipments`, `va-trace-v2-allocations`, `va-trace-v2-productions`, `va-trace-v2-exceptions`, `va-trace-v2-pods`.

### Legacy Stores (read-only input for migration)
`orderStore.ts`, `userStore.ts`, `authStore.ts`, `clientStore.ts`, `supplierStore.ts`, `projectStore.ts` — module-level arrays + `useSyncExternalStore`. Storage key: `va-trace-orders`.

### Vice → V2 Migration
Runs on app startup via `runV2Migration()` in `App.tsx`. Idempotent — seeds V2 stores only when empty. Legacy data is read-only input. `isV2DomainEnabled()` flag in `localStorage` (`va-trace-v2-enabled`) acts as a kill switch.

### V2 Type System
`src/lib/types/v2/` — Contract-aligned types: `OrderRequest`, `SalesPoint`, `SalesPointAllocation`, `ProductionJob`, `ShipmentBatch`, `ShippingLabel`, `DeliveryNote`, `DeliveryConfirmation`. Statuses are `string` literal unions with companion `as const` arrays. Base types in `foundation.ts`.

### Projection Pattern (CR-07)
All summaries, statuses, and list rows are **read projections** computed from source aggregates. `projections.ts` contains `hydrateOrder()` and `hydrateShipmentBatch()`. `viewModels.ts` provides React hooks joining multiple stores into table row shapes: `useHydratedOrders()`, `useOrderListRows()`, `useShipmentBatchRows()`, `useDeliveryNoteRows()`, `usePodQueueRows()`, `useProductionRows()`.

### Command Pattern
V2 mutations flow through `runCommand()` which handles idempotency keys, optimistic versioning (`expectedVersion`), and automatic audit/domain event emission.

### Selectors (pure functions)
`src/lib/v2/selectors/derivedStatus.ts` — `deriveAllocationStatus()`, `deriveDistributionStatus()`, `podStatusFromConfirmation()`, `isOrderComplete()`, etc.

### Print Views
- `DeliveryNotePrint.tsx` — Reads V2 `DeliveryNote`, bridges to legacy print template
- `PackagingLabelsPrint.tsx` — Reads V2 `ShippingLabel`, bridges to legacy label format

### Shared UI Components
`src/components/shared/` — `ColumnToggle` (table column visibility), `AdvancedFilterBar`, `FilterSection`, `OrderMetadataSummary`. Domain tables in `src/components/domain/tables/` — `OrderRequestTable`, `DeliveryNoteTable`, `ShipmentBatchTable`, `ProductionJobTable`, `SalesPointAllocationTable`, `PodQueueTable`.

### Order Lifecycle
Draft → Submitted → Accepted → In Production (Printing → Finishing → QC) → Ready For Distribution → Batch Created → Dispatched → In Transit → Received → Completed. Cancel and Amend available throughout (policy-constrained).

### Page Directory
- `src/pages/admin/AdminDashboard.tsx`, `AllOrders.tsx`, `OrderDetail.tsx` (admin)
- `src/pages/vendor/VendorDashboard.tsx`, `VendorOrders.tsx`, `VendorOrderDetail.tsx` (vendor)
- `src/pages/client/CreateOrder.tsx` (client)
- `src/pages/shared/DeliveryNotePrint.tsx`, `PackagingLabelsPrint.tsx` (print views)
