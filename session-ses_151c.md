# New session - 2026-06-09T21:17:16.280Z

**Session ID:** ses_151c0d38affeKbOsYhcwjIE6GI
**Created:** 6/10/2026, 4:17:16 AM
**Updated:** 6/10/2026, 4:20:38 AM

---

## User

saya mau sales order number itu datanya tergenerate ketika vendor mentrigger update fullfilment "in production". sales order number datanya disimpan di data-seeds yang di wire dengan data order. data "destination" dan "deliver to" serta "address"  di order detail seharusnya align dengan data seed sales point, jadi arsitektur informasi data yang ditampilkan harus mudah dipahami terutama posisi datanya di UI.

---

## Assistant (Build · DeepSeek V4 Flash Free · 70.9s)

_Thinking:_

The user is speaking in Indonesian. Let me understand the request:

1. They want the sales order number to be generated when a vendor triggers an update of fulfillment status to "in production"
2. The sales order number data should be stored in data-seeds that are wired with order data
3. The "destination", "deliver to", and "address" fields in order detail should align with the data seed's sales point data
4. The information architecture should be easy to understand, especially the data position in the UI

Let me explore the codebase to understand the current structure first.

**Tool: task**

**Input:**
```json
{
  "description": "Explore codebase structure",
  "prompt": "Explore the codebase at /Users/perdanahary/Documents/Projects/Officebee/VA Trace thoroughly. I need to understand:\n\n1. The overall project structure (what framework, what language, main directories)\n2. How orders/fulfillment work - look for files related to orders, sales orders, fulfillment, vendors\n3. How data-seeds are structured - look for any \"seed\" related files\n4. How order details display destination, deliver to, address, sales point\n5. Look for any existing sales order number generation logic\n6. Look for fulfillment status updates, especially \"in production\" status\n\nSearch for keywords: \"sales order\", \"fulfillment\", \"in production\", \"data-seed\", \"sales point\", \"destination\", \"deliver to\", \"seed\", \"order detail\"\n\nReturn:\n- Project structure overview\n- Key files related to orders and fulfillment\n- Current data-seed structure\n- Current sales order number logic (if any)\n- Current order detail display for destination/deliver to/address\n- Fulfillment/vendor status update logic",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_151c0be95ffe7PFyfzXU7xMG4J" state="completed">
<task_result>
Now I have a thorough understanding of the entire codebase. Here is my comprehensive report:

---

## Comprehensive Codebase Analysis: VA Trace (Officebee)

### 1. PROJECT STRUCTURE OVERVIEW

**Framework & Language:**
- **Frontend:** React 18 with TypeScript
- **Build tool:** Vite 5
- **Styling:** Tailwind CSS 4 with `tailwindcss-animate`
- **Routing:** React Router DOM v6
- **State management:** `useSyncExternalStore` + `localStorage` (no Redux/Zustand)
- **UI library:** Radix UI primitives + shadcn-style components
- **Testing:** Playwright
- **Other key deps:** `@tanstack/react-table`, `recharts`, `framer-motion`, `xlsx`, `zod`, `lucide-react`, `@tabler/icons-react`

**Main Directory Layout:**
```
/Users/perdanahary/Documents/Projects/Officebee/VA Trace/
├── src/
│   ├── App.tsx                           # Router with all routes (admin, operator, analyst, client, vendor)
│   ├── main.tsx                          # Entry point
│   ├── index.css                         # Tailwind base styles
│   ├── components/
│   │   ├── layout/                       # Sidebar, Header, ContentArea, RoleSwitcher, UserAccountMenu
│   │   ├── shared/                       # FilterSection
│   │   └── ui/                           # shadcn-style UI components (badge, button, card, table, etc.)
│   ├── hooks/                            # use-mobile hook
│   ├── lib/                              # Core business logic & data stores
│   │   ├── mockData.ts                   # ALL seed data (orders, sales points, products) + data types (3303 lines)
│   │   ├── orderStore.ts                 # Order CRUD, production start, complaints
│   │   ├── orderStatus.ts               # Status ranking, "Partial" prefix logic
│   │   ├── deliveryNote.ts              # Delivery note & packaging label generation
│   │   ├── salesPointSeed.ts            # Auto-generated seed file from CSV (~1500 lines of PIC/shipping data)
│   │   ├── importStore.ts               # Bulk PO import state management (1801 lines)
│   │   ├── projectStore.ts              # Project/campaign names store
│   │   ├── supplierStore.ts             # Supplier CRUD
│   │   ├── clientStore.ts               # Client CRUD
│   │   ├── userStore.ts                 # User store
│   │   ├── productMaster.ts             # Product master data
│   │   ├── messages.ts                  # Inbox messages seed data
│   │   └── utils.ts                     # Utility functions
│   ├── modules/data-cleaner/            # Data cleaner module (parser, types, cleaning)
│   └── pages/
│       ├── admin/                       # Admin pages (OrderDetail, AllOrders, AdminCreateOrder, etc.)
│       ├── client/                      # Client pages (CreateOrder, ClientDashboard)
│       ├── vendor/                      # Vendor pages (VendorDashboard, VendorOrders, UpdateProgress, etc.)
│       └── shared/                      # Shared pages (OrderProgress, DeliveryNotePrint, PackagingLabelsPrint, etc.)
├── tests/                               # Playwright e2e tests
├── documents/                           # Documents directory
├── scripts/                             # Scripts directory
├── .vercel/                             # Vercel deployment config
├── playwright.config.ts
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── vercel.json
```

**Roles in App.tsx:** admin, operator, analyst, client, vendor. Each role has its own prefix path (`/admin`, `/operator`, `/analyst`, `/client`, `/vendor`).

---

### 2. ORDERS / FULFILLMENT -- KEY FILES

| File | Purpose |
|------|---------|
| `src/lib/mockData.ts` | Contains the `Order` interface, `OrderLine`, `SalesPointMapping`, `mockOrderSeeds` (15 seed orders), `mockSalesPoints` (100+ entries), `mockOrders` (computed). This is the single source of truth for all seed data. |
| `src/lib/orderStore.ts` | Order state management: `useOrders()`, `createManualOrder()`, `startProduction()`, `upsertOrder()`, `appendOrders()`, `raiseQuantityComplaint()`, `resolveQuantityComplaint()` |
| `src/lib/orderStatus.ts` | Status ranking/order flow: `OrderStatus[] = ["Created", "Accepted", "In Production", "Ready to Ship", "On Delivery", "Delivered", "Completed", "Overdue", "Urgent", "Waiting"]`. `getBaseOrderStatus()` strips "Partial " prefix. `getOrderRequestStatus()` computes overall OR status from items. |
| `src/lib/deliveryNote.ts` | Generates `DeliveryNote` and `PackagingLabelsDocument` objects. `getSalesPointDeliveryProfile()` resolves sales point data for delivery. `createDoNumber()` generates DO numbers from order IDs. |
| `src/components/ui/StatusBadge.tsx` | Status badge component with color coding: Created=secondary, Accepted=success, In Production=processing, Ready to Ship=processing, On Delivery=processing, Delivered=success, Completed=success, Overdue=destructive, Urgent=destructive, Waiting=warning. |
| `src/pages/admin/OrderDetail.tsx` | Order detail page (admin/operator/analyst). Shows fulfillment info, delivery details, complaint flow. |
| `src/pages/admin/AdminCreateOrder.tsx` | Manual order creation for admin/operator. |
| `src/pages/admin/AllOrders.tsx` | Paginated order list with search/filter. |
| `src/pages/vendor/VendorDashboard.tsx` | Vendor dashboard with tabs: Pending, Production, Shipping, History. Includes "Start Production" button. |
| `src/pages/vendor/UpdateProgress.tsx` | Vendor progress update page. Bulk advance items through stages: In Production -> Ready to Ship -> On Delivery -> Delivered. Also handles complaint review. |
| `src/pages/vendor/VendorOrders.tsx` | Vendor orders list. |
| `src/pages/client/CreateOrder.tsx` | Client-side order creation. |
| `src/lib/importStore.ts` | Bulk PO import logic, match/assign/dispatch workflow. Generates orders from imported spreadsheet rows. |
| `src/pages/admin/ImportDispatchWorkspace.tsx` | Admin workspace for dispatching imported POs. |
| `src/lib/supplierStore.ts` | Supplier CRUD with seed data (4 initial suppliers). |
| `src/lib/projectStore.ts` | Project name store seeded from mock orders. |
| `src/lib/clientStore.ts` | Client CRUD with 1 initial client (Sampoerna). |
| `src/lib/messages.ts` | Inbox message seed data (order notifications). |

**Order Status Flow (stage pipeline):**
```
Created -> Accepted -> In Production -> Ready to Ship -> On Delivery -> Delivered -> Completed
```
Plus special statuses: Overdue, Urgent, Waiting, and "Partial {status}" prefixes.

---

### 3. DATA-SEED STRUCTURE

There are **multiple seed layers** in this project:

#### a) Sales Point Seeds: `/src/lib/salesPointSeed.ts`
- Auto-generated from `documents/master-pic-address_sales-point.csv`
- Contains ~100 `SalesPointSeed` entries, each with:
  ```typescript
  interface SalesPointSeed {
    zone: string;
    region: string;
    area: string;
    subArea: string;
    pic1: SalesPointPic;      // { name, email, phone }
    pic2: SalesPointPic;
    remarks: string;
    note: string;
    shippingAddress: ShippingAddress;  // { provinsi, kotaKabupaten, kecamatan, alamat, kodePos }
  }
  ```

#### b) Order Seeds: in `/src/lib/mockData.ts` (lines 69-354)
- `mockOrderSeeds` array -- 15 seed orders with hardcoded IDs (e.g., `OR-2026-816972`, `OR-2026-715187`)
- Each seed has: `id`, `campaign`, `createdDate`, `deadline`, `clientPO`, `soNumber`, `supplier`, `salesPointId`, `items`
- The seeds cover all statuses: Created, Accepted, In Production, Ready to Ship, On Delivery, Delivered, Completed, Overdue, Urgent, Waiting

#### c) Sales Point Base Data: in `/src/lib/mockData.ts` (lines 2354-3230)
- `baseSalesPoints` array -- raw sales point records (zone, region, area, wcode, salesPoint)
- Each is combined with the seed data via `findSeed()` to produce `mockSalesPoints`

#### d) `findSeed()` function (lines 3235-3253):
- Matches sales point to seed by: exact match -> case-insensitive match -> substring match -> first area seed
- Populates: `subArea`, `pic1`, `pic2`, `remarks`, `note`, `shippingAddress`

#### e) `mockOrders` computed (lines 3279-3289):
- Maps `mockOrderSeeds` through `getSalesPointPicByWcode()` to fill PIC data from sales point seeds, then computes status via `getOrderRequestStatus()`

#### f) Project Seeds: in `/src/lib/projectStore.ts`
- `getSeedProjects()` extracts unique campaign names from `mockOrders`
- Merged with user-created projects in localStorage

---

### 4. ORDER DETAIL DISPLAY -- DESTINATION / DELIVER TO / ADDRESS

**In `src/pages/admin/OrderDetail.tsx` (lines 246-255)** and **`src/pages/vendor/UpdateProgress.tsx` (lines 249-258)**:

```typescript
<DetailRow label="Destination" value={`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`} />
<DetailRow label="Deliver to" value={deliverySnapshot.deliveryCompanyName} />
<DetailRow label="Address" value={deliverySnapshot.address} />
<DetailRow label="SO Number" value={deliveryNote.soNumber} />
```

**Resolution chain in `src/lib/deliveryNote.ts` -> `getSalesPointDeliveryProfile()` (lines 123-143):**

```typescript
export function getSalesPointDeliveryProfile(salesPointId: string): SalesPointDeliveryProfile {
  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === salesPointId) ?? mockSalesPoints[0];
  return {
    ...salesPoint,
    deliveryCompanyName: salesPoint.deliveryCompanyName ?? "PT. HM. Sampoerna Tbk",
    deliveryLocationName: salesPoint.deliveryLocationName ?? `PT HMS ${salesPoint.salesPoint}`,
    address: salesPoint.address ?? salesPoint.shippingAddress.alamat ?? `${salesPoint.salesPoint}, ${salesPoint.region}, ${salesPoint.zone}`,
    phone: salesPoint.phone ?? salesPoint.pic1.phone ?? "",
    picClient: salesPoint.picClient ?? salesPoint.pic1.name ?? "",
  };
}
```

Key findings:
- **deliveryCompanyName**: Falls back to `"PT. HM. Sampoerna Tbk"` (hardcoded). Currently NO sales point entries have `deliveryCompanyName` set in `baseSalesPoints` (grep across mockData.ts shows it's only declared in the interface but never populated).
- **deliveryLocationName**: Falls back to `` `PT HMS ${salesPoint.salesPoint}` `` (e.g. "PT HMS Jakarta Barat"). Not populated in seed data either.
- **address**: Falls back to `salesPoint.shippingAddress.alamat` from the salesPointSeed CSV data, or a composite string.
- **wcode**: The warehouse code (e.g. WH055, WH020) -- displayed as destination code.
- **picClient**: Falls back to `pic1.name` from sales point seed.

**Missing required fields validation** (lines 266-278):
```typescript
if (!order.soNumber) missing.push("SO Number");
if (!order.campaign) missing.push("Campaign Name / Project");
if (!order.picProject.name || !order.picProject.email) missing.push("PIC Project");
if (!salesPoint.deliveryCompanyName) missing.push("Deliver-to company");
if (!salesPoint.deliveryLocationName) missing.push("Deliver-to location");
if (!salesPoint.address) missing.push("Deliver-to address");
```

---

### 5. SALES ORDER NUMBER (SO NUMBER) LOGIC

**There is NO automated generation of SO numbers.** It is entirely **user-entered manually**.

Key locations:
- **`/src/pages/admin/AdminCreateOrder.tsx`** (line 35, 289): A free-text `<Input>` field with placeholder "e.g. SO123928". Validated as required (line 103).
- **`/src/pages/client/CreateOrder.tsx`** (line 23, 165): Same free-text input.
- **`/src/lib/orderStore.ts`** (line 228): `soNumber: draft.soNumber.trim()` -- simply passes through the user input.
- **`/src/lib/mockData.ts`**: Seed orders have hardcoded `soNumber` values like `"SO123928"`, `"SO178056"`, `"SO570001"` through `"SO570009"`.

The `soNumber` field on the `Order` interface (line 52) is just `string` -- no auto-generation function exists.

**DO Number generation** (delivery note number) in `/src/lib/deliveryNote.ts` (line 241-243):
```typescript
function createDoNumber(order: Order) {
  const numericSeed = order.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `DEL${order.createdDate.replace(/\D/g, "")}${numericSeed}`;
}
```
Example: `DEL20260601816972` (from `OR-2026-816972` created `2026-06-01`)

**OR Number generation** (order request ID) in `/src/lib/orderStore.ts` (line 201-203):
```typescript
function makeOrderId() {
  return `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
}
```
Format: `OR-{year}-{6-digit random}`. **Purely random** -- no sequential counter, no database sequence.

---

### 6. FULFILLMENT STATUS UPDATES -- "IN PRODUCTION" AND STAGE ADVANCEMENT

#### How status is updated:

**1. `startProduction()` in `/src/lib/orderStore.ts` (lines 244-267):**
- Called when vendor clicks "Start Production" on pending orders
- Sets all items with status "Created", "Waiting", or "Accepted" to "In Production"
- Then recalculates overall order status via `getOrderRequestStatus()`

**2. Bulk stage advance in `/src/pages/vendor/UpdateProgress.tsx` (lines 97-155):**
- Four functions: `advanceToProduction()`, `advanceToReadyToShip()`, `advanceToOnDelivery()`, `advanceToDelivered()`
- Each advances any items below the target stage up to that stage
- Uses `upsertOrder()` with the updated items and recalculated status

**3. Vendor Dashboard "Start Production" in `/src/pages/vendor/VendorDashboard.tsx` (line 175):**
- In the Pending tab, a button directly calls `startProduction(order.id)` from `orderStore`

**4. Stage pipeline (STAGE_FLOW) in UpdateProgress.tsx (lines 42-50):**
```typescript
const STAGE_FLOW: OrderStatus[] = [
  "Created", "Accepted", "In Production", "Ready to Ship",
  "On Delivery", "Delivered", "Completed",
];
```

**5. Complaint workflow (revision/quantity adjustment):**
- Admin raises complaint via `raiseQuantityComplaint()` (sets `complaintStatus: "pending"`)
- Vendor approves/rejects via `resolveQuantityComplaint()` (sets to "approved"/"rejected")
- If approved, `deliveredQuantity` is updated on affected items

**6. Tab filtering in Vendor Dashboard (lines 204-227):**
- Pending: Created, Waiting
- Production: In Production, Accepted
- Shipping: Ready to Ship, On Delivery
- History: Completed, Delivered

**Relevant UI files:**
- `/src/pages/vendor/UpdateProgress.tsx` -- Full vendor progress update page (bulk actions, timeline, complaint review)
- `/src/pages/vendor/VendorDashboard.tsx` -- Quick "Start Production" + tab-based order views
- `/src/pages/admin/OrderDetail.tsx` -- Admin view showing fulfillment progress bars (In Production, Ready to Ship, On Delivery, Delivered) for orders in those stages

---

### SUMMARY OF ALL KEY FILE PATHS

| Category | Absolute Path |
|----------|--------------|
| **Main entry** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/App.tsx` |
| **Order type definition** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts` |
| **Order store (CRUD, production, complaints)** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts` |
| **Order status logic** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStatus.ts` |
| **Delivery note generation** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/deliveryNote.ts` |
| **Sales point seed data** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/salesPointSeed.ts` |
| **Status badge component** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/components/ui/StatusBadge.tsx` |
| **Admin order detail** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/OrderDetail.tsx` |
| **Admin create order** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx` |
| **Admin all orders** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AllOrders.tsx` |
| **Vendor update progress** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx` |
| **Vendor dashboard** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/VendorDashboard.tsx` |
| **Bulk import store** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/importStore.ts` |
| **Import dispatch workspace** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/ImportDispatchWorkspace.tsx` |
| **Supplier store** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/supplierStore.ts` |
| **Project store** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/projectStore.ts` |
| **Client store** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/clientStore.ts` |
| **Packaging labels print** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/shared/PackagingLabelsPrint.tsx` |
| **Delivery note print** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/shared/DeliveryNotePrint.tsx` |
| **Client create order** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/client/CreateOrder.tsx` |
| **Inbox messages** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/messages.ts` |
| **Project overview doc** | `/Users/perdanahary/Documents/Projects/Officebee/VA Trace/GEMINI.md` |
</task_result>
</task>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.2s)

_Thinking:_

Now I have a thorough understanding of the codebase. Let me read the key files to understand the details before making changes.

The user wants:

1. **Sales Order Number (SO Number) auto-generated** when vendor triggers fulfillment update to "In Production"
2. **SO Number stored in data-seeds** that are wired with order data
3. **"Destination", "Deliver to", and "Address" in order detail should align with data seed sales point** - so these fields should come from the sales point seed data
4. **Information architecture should be easy to understand** - especially the data position in the UI

Let me read the key files to understand the current implementation in detail.

Key things I need to do:
1. Read `mockData.ts` to understand the Order interface and how soNumber is currently used
2. Read `orderStore.ts` to understand how orders are created and updated
3. Read `deliveryNote.ts` to understand the delivery profile
4. Read `OrderDetail.tsx` to see how destination/deliver to/address are displayed
5. Read `AdminCreateOrder.tsx` and `client/CreateOrder.tsx` to see how SO number is currently entered
6. Read `UpdateProgress.tsx` and `VendorDashboard.tsx` to see how "In Production" is triggered

The key changes:
1. Remove SO number field from manual order creation forms (admin and client)
2. Auto-generate SO number when status becomes "In Production"
3. Store the SO number in a "data seed" system that's wired to the order
4. Make destination/deliver to/address align with sales point seed data

Let me read all the relevant files now.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts</path>
<type>file</type>
<content>
1: import { getOrderRequestStatus, type OrderItemProgress, type OrderRequestStatus } from "@/lib/orderStatus";
2: import { salesPointSeeds } from "@/lib/salesPointSeed";
3: import type { SalesPointPic, ShippingAddress } from "@/lib/salesPointSeed";
4: 
5: export interface OrderLine extends OrderItemProgress {
6:   productCode: string;
7:   poLineNumber: string;
8:   deliveredQuantity?: number;
9: }
10: 
11: export type ComplaintStatus = "pending" | "approved" | "rejected";
12: 
13: export interface ComplaintLineItem {
14:   lineId: string;
15:   productCode: string;
16:   productName: string;
17:   poLineNumber: string;
18:   orderedQty: number;
19:   systemDeliveredQty: number;
20:   actualReceivedQty: number;
21:   deltaQty: number;
22: }
23: 
24: export interface ComplaintHistoryEntry {
25:   id: string;
26:   action: "created" | "approved" | "rejected" | "quantity-adjusted";
27:   actor: string;
28:   timestamp: string;
29:   note?: string;
30: }
31: 
32: export interface OrderComplaint {
33:   id: string;
34:   status: ComplaintStatus;
35:   remarks: string;
36:   createdAt: string;
37:   createdBy: string;
38:   reviewedAt?: string;
39:   reviewedBy?: string;
40:   reviewNote?: string;
41:   items: ComplaintLineItem[];
42:   history: ComplaintHistoryEntry[];
43: }
44: 
45: export interface Order {
46:   id: string;
47:   campaign: string;
48:   status: OrderRequestStatus;
49:   createdDate: string;
50:   deadline: string;
51:   clientPO: string;
52:   soNumber: string;
53:   supplier: string;
54:   salesPointId: string;
55:   clientId?: string;
56:   clientName?: string;
57:   clientEntityName?: string;
58:   picProject: {
59:     name: string;
60:     email: string;
61:   };
62:   items: OrderLine[];
63:   complaint?: OrderComplaint;
64:   complaintStatus?: ComplaintStatus;
65:   revisionStatus?: ComplaintStatus;
66:   note?: string;
67: }
68: 
69: const mockOrderSeeds: Omit<Order, "status">[] = [
70:   {
71:     id: "OR-2026-816972",
72:     campaign: "Sunscreen Campaign Q2",
73:     createdDate: "2026-06-01",
74:     deadline: "21 days left",
75:     clientPO: "123928098",
76:     soNumber: "SO123928",
77:     supplier: "PT. HH Global Services Indonesia",
78:     salesPointId: "WH055",
79:     clientId: "CUS-SAMPOERNA",
80:     clientName: "Sampoerna",
81:     clientEntityName: "PT HM Sampoerna Tbk",
82:     picProject: {
83:       name: "Chandra Sadikin",
84:       email: "Chandra.Sadikin@sampoerna.com",
85:     },
86:     items: [
87:       { id: "item-1", productCode: "2026-00194983-0039", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 50, status: "Ready to Ship" },
88:       { id: "item-2", productCode: "2026-00194983-0040", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 0, status: "In Production" },
89:       { id: "item-3", productCode: "2026-00194983-0041", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 50, deliveredQuantity: 0, status: "In Production" },
90:     ],
91:   },
92:   {
93:     id: "OR-2026-715187",
94:     campaign: "WOC12026 - POSM Networking - Production - PPOSM PPOSM VEEV",
95:     createdDate: "2026-05-20",
96:     deadline: "Overdue",
97:     clientPO: "5701749081",
98:     soNumber: "SO178056",
99:     supplier: "PT Print Solusi",
100:     salesPointId: "WH020",
101:     clientId: "CUS-SAMPOERNA",
102:     clientName: "Sampoerna",
103:     clientEntityName: "PT HM Sampoerna Tbk",
104:     picProject: {
105:       name: "Chandra Sadikin",
106:       email: "Chandra.Sadikin@sampoerna.com",
107:     },
108:     items: [
109:       { id: "item-1", productCode: "2026-00194876-0033", poLineNumber: "2", name: "Photopaper_GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - PPOSM VEEV 0.4 x 0.8 m V", quantity: 29, deliveredQuantity: 29, status: "Ready to Ship" },
110:       { id: "item-2", productCode: "2026-00194876-0034", poLineNumber: "3", name: "Photopaper_GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - PPOSM VEEV 0.8 x 0.4 m H", quantity: 29, deliveredQuantity: 29, status: "Ready to Ship" },
111:       { id: "item-3", productCode: "2026-00194876-0039", poLineNumber: "7", name: "Photopaper_GT SRC - Cigarette Cabinet 1 (H) - 25.5x72.5 cm - Photopaper - PPOSM VEEV 0.725 x 0.255 m H", quantity: 11, deliveredQuantity: 11, status: "Ready to Ship" },
112:     ],
113:   },
114:   {
115:     id: "OR-2026-901234",
116:     campaign: "A Mild Variant Promo",
117:     createdDate: "2026-06-03",
118:     deadline: "28 days left",
119:     clientPO: "9982711",
120:     soNumber: "SO998271",
121:     supplier: "CV Cetakan Terbaik Sejagat",
122:     salesPointId: "WH071",
123:     clientId: "CUS-SAMPOERNA",
124:     clientName: "Sampoerna",
125:     clientEntityName: "PT HM Sampoerna Tbk",
126:     picProject: {
127:       name: "Reno Saputra",
128:       email: "Reno.Saputra@panamas.com",
129:     },
130:     items: [
131:       { id: "item-1", productCode: "2026-00194983-0046", poLineNumber: "1", name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship" },
132:       { id: "item-2", productCode: "2026-00194983-0050", poLineNumber: "2", name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship" },
133:       { id: "item-3", productCode: "2026-00194983-0051", poLineNumber: "3", name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - DPP12 20K", quantity: 100, deliveredQuantity: 100, status: "Ready to Ship" },
134:     ],
135:   },
136:   {
137:     id: "OR-2026-445566",
138:     campaign: "Dji Sam Soe Magnum",
139:     createdDate: "2026-06-05",
140:     deadline: "45 days left",
141:     clientPO: "7726152",
142:     soNumber: "SO772615",
143:     supplier: "Pending",
144:     salesPointId: "WH069",
145:     clientId: "CUS-SAMPOERNA",
146:     clientName: "Sampoerna",
147:     clientEntityName: "PT HM Sampoerna Tbk",
148:     picProject: {
149:       name: "Joko Santoso",
150:       email: "Joko.Santoso@sampoerna.com",
151:     },
152:     items: [
153:       { id: "item-1", productCode: "2026-00194983-0052", poLineNumber: "1", name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K", quantity: 200, deliveredQuantity: 0, status: "Created" },
154:       { id: "item-2", productCode: "2026-00194983-0053", poLineNumber: "2", name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K", quantity: 200, deliveredQuantity: 0, status: "Created" },
155:     ],
156:   },
157:   {
158:     id: "OR-2026-112233",
159:     campaign: "SPS12 Launch",
160:     createdDate: "2026-05-15",
161:     deadline: "Finished",
162:     clientPO: "4451627",
163:     soNumber: "SO445162",
164:     supplier: "PT Multi Print",
165:     salesPointId: "WH179",
166:     clientId: "CUS-SAMPOERNA",
167:     clientName: "Sampoerna",
168:     clientEntityName: "PT HM Sampoerna Tbk",
169:     picProject: {
170:       name: "Chandra Sadikin",
171:       email: "Chandra.Sadikin@sampoerna.com",
172:     },
173:     items: [
174:       { id: "item-1", productCode: "2026-00194983-0043", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 120, deliveredQuantity: 120, status: "Completed" },
175:       { id: "item-2", productCode: "2026-00194983-0044", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 120, deliveredQuantity: 120, status: "Completed" },
176:     ],
177:   },
178:   // === Fulfillment Progress Seed Orders covering all OrderItemProgress states ===
179:   {
180:     id: "OR-2026-570001",
181:     campaign: "Dji Sam Soe Magnum Launch Q2",
182:     createdDate: "2026-06-08",
183:     deadline: "14 days left",
184:     clientPO: "5701713463",
185:     soNumber: "SO570001",
186:     supplier: "PT Print Solusi Indonesia",
187:     salesPointId: "WH020",
188:     clientId: "CUS-SAMPOERNA",
189:     clientName: "Sampoerna",
190:     clientEntityName: "PT HM Sampoerna Tbk",
191:     picProject: {
192:       name: "Haris Afzal",
193:       email: "haris.afzal@panamas.com",
194:     },
195:     items: [
196:       { id: "item-fs-01", productCode: "2026-00195039-0002", poLineNumber: "1", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DSE12 25K", quantity: 80, deliveredQuantity: 0, status: "Accepted" },
197:       { id: "item-fs-02", productCode: "2026-00195039-0014", poLineNumber: "2", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DSE12 25K", quantity: 32, deliveredQuantity: 0, status: "Accepted" },
198:     ],
199:   },
200:   {
201:     id: "OR-2026-570002",
202:     campaign: "DSSK Stock Replenishment C1",
203:     createdDate: "2026-05-28",
204:     deadline: "10 days left",
205:     clientPO: "5701713439",
206:     soNumber: "SO570002",
207:     supplier: "PT. HH Global Services Indonesia",
208:     salesPointId: "WH055",
209:     clientId: "CUS-SAMPOERNA",
210:     clientName: "Sampoerna",
211:     clientEntityName: "PT HM Sampoerna Tbk",
212:     picProject: {
213:       name: "Chandra Sadikin",
214:       email: "Chandra.Sadikin@sampoerna.com",
215:     },
216:     items: [
217:       { id: "item-fs-03", productCode: "2026-00194983-0040", poLineNumber: "2", name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 180, deliveredQuantity: 0, status: "In Production" },
218:       { id: "item-fs-04", productCode: "2026-00194983-0041", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K", quantity: 1200, deliveredQuantity: 200, status: "In Production" },
219:     ],
220:   },
221:   {
222:     id: "OR-2026-570003",
223:     campaign: "Marlboro Filter Black POSM",
224:     createdDate: "2026-05-20",
225:     deadline: "5 days left",
226:     clientPO: "5701713028",
227:     soNumber: "SO570003",
228:     supplier: "CV Cetakan Terbaik Sejagat",
229:     salesPointId: "WH071",
230:     clientId: "CUS-SAMPOERNA",
231:     clientName: "Sampoerna",
232:     clientEntityName: "PT HM Sampoerna Tbk",
233:     picProject: {
234:       name: "Chandra Sadikin",
235:       email: "Chandra.Sadikin@sampoerna.com",
236:     },
237:     items: [
238:       { id: "item-fs-05", productCode: "2026-00194988-0020", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM20", quantity: 43, deliveredQuantity: 43, status: "Ready to Ship" },
239:       { id: "item-fs-06", productCode: "2026-00194988-0022", poLineNumber: "3", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM20", quantity: 463, deliveredQuantity: 0, status: "Ready to Ship" },
240:     ],
241:   },
242:   {
243:     id: "OR-2026-570004",
244:     campaign: "Sampoerna Prima Distribution",
245:     createdDate: "2026-05-15",
246:     deadline: "3 days left",
247:     clientPO: "5701713462",
248:     soNumber: "SO570004",
249:     supplier: "PT Multi Print",
250:     salesPointId: "WH069",
251:     clientId: "CUS-SAMPOERNA",
252:     clientName: "Sampoerna",
253:     clientEntityName: "PT HM Sampoerna Tbk",
254:     picProject: {
255:       name: "Joko Santoso",
256:       email: "Joko.Santoso@sampoerna.com",
257:     },
258:     items: [
259:       { id: "item-fs-07", productCode: "2026-00194984-0003", poLineNumber: "3", name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 600, deliveredQuantity: 300, status: "On Delivery" },
260:       { id: "item-fs-08", productCode: "2026-00194984-0004", poLineNumber: "4", name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 300, deliveredQuantity: 0, status: "On Delivery" },
261:     ],
262:   },
263:   {
264:     id: "OR-2026-570005",
265:     campaign: "Palembang Q2 Fulfillment",
266:     createdDate: "2026-04-10",
267:     deadline: "Finished",
268:     clientPO: "7799123",
269:     soNumber: "SO570005",
270:     supplier: "PT Print Solusi Indonesia",
271:     salesPointId: "WH179",
272:     clientId: "CUS-SAMPOERNA",
273:     clientName: "Sampoerna",
274:     clientEntityName: "PT HM Sampoerna Tbk",
275:     picProject: {
276:       name: "Chandra Sadikin",
277:       email: "Chandra.Sadikin@sampoerna.com",
278:     },
279:     items: [
280:       { id: "item-fs-09", productCode: "2026-00194983-0060", poLineNumber: "1", name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DPP12 20K", quantity: 337, deliveredQuantity: 337, status: "Delivered" },
281:       { id: "item-fs-10", productCode: "2026-00194983-0063", poLineNumber: "2", name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - DPP12 20K", quantity: 1205, deliveredQuantity: 1205, status: "Delivered" },
282:     ],
283:   },
284:   {
285:     id: "OR-2026-570006",
286:     campaign: "Sukabumi Expansion Pending",
287:     createdDate: "2026-06-07",
288:     deadline: "30 days left",
289:     clientPO: "6644189",
290:     soNumber: "SO570006",
291:     supplier: "Pending",
292:     salesPointId: "WH079",
293:     clientId: "CUS-SAMPOERNA",
294:     clientName: "Sampoerna",
295:     clientEntityName: "PT HM Sampoerna Tbk",
296:     picProject: {
297:       name: "Chandra Sadikin",
298:       email: "Chandra.Sadikin@sampoerna.com",
299:     },
300:     items: [
301:       { id: "item-fs-11", productCode: "2026-00194983-0052", poLineNumber: "1", name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K", quantity: 150, deliveredQuantity: 0, status: "Waiting" },
302:       { id: "item-fs-12", productCode: "2026-00194983-0053", poLineNumber: "2", name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K", quantity: 150, deliveredQuantity: 0, status: "Waiting" },
303:     ],
304:   },
305:   {
306:     id: "OR-2026-570007",
307:     campaign: "Bandung Q1 Remaining",
308:     createdDate: "2026-04-01",
309:     deadline: "Overdue",
310:     clientPO: "5512345",
311:     soNumber: "SO570007",
312:     supplier: "CV Cetakan Terbaik Sejagat",
313:     salesPointId: "WH089",
314:     clientId: "CUS-SAMPOERNA",
315:     clientName: "Sampoerna",
316:     clientEntityName: "PT HM Sampoerna Tbk",
317:     picProject: {
318:       name: "Chandra Sadikin",
319:       email: "Chandra.Sadikin@sampoerna.com",
320:     },
321:     items: [
322:       { id: "item-fs-13", productCode: "2026-00194983-0046", poLineNumber: "8", name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K", quantity: 6900, deliveredQuantity: 6900, status: "Overdue" },
323:       { id: "item-fs-14", productCode: "2026-00194983-0049", poLineNumber: "9", name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K", quantity: 72, deliveredQuantity: 0, status: "Overdue" },
324:     ],
325:   },
326:   {
327:     id: "OR-2026-570008",
328:     campaign: "Surabaya Urgent Deployment",
329:     createdDate: "2026-06-02",
330:     deadline: "1 day left",
331:     clientPO: "4421098",
332:     soNumber: "SO570008",
333:     supplier: "PT. HH Global Services Indonesia",
334:     salesPointId: "WH131",
335:     clientId: "CUS-SAMPOERNA",
336:     clientName: "Sampoerna",
337:     clientEntityName: "PT HM Sampoerna Tbk",
338:     picProject: {
339:       name: "Chandra Sadikin",
340:       email: "Chandra.Sadikin@sampoerna.com",
341:     },
342:     items: [
343:       { id: "item-fs-15", productCode: "2026-00194984-0023", poLineNumber: "1", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - SPS12 15K", quantity: 51, deliveredQuantity: 0, status: "Urgent" },
344:       { id: "item-fs-16", productCode: "2026-00194984-0005", poLineNumber: "5", name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K", quantity: 40, deliveredQuantity: 0, status: "Urgent" },
345:     ],
346:   },
347:   {
348:     id: "OR-2026-570009",
349:     campaign: "Mixed Fulfillment Batch - Medan",
350:     createdDate: "2026-05-10",
351:     deadline: "7 days left",
352:     clientPO: "9901234",
353:     soNumber: "SO570009",
354:     supplier: "PT Print Solusi Indonesia",
355:     salesPointId: "WH020",
356:     clientId: "CUS-SAMPOERNA",
357:     clientName: "Sampoerna",
358:     clientEntityName: "PT HM Sampoerna Tbk",
359:     picProject: {
360:       name: "Haris Afzal",
361:       email: "haris.afzal@panamas.com",
362:     },
363:     items: [
364:       { id: "item-fs-17", productCode: "2026-00195039-0015", poLineNumber: "13", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DSE12 25K", quantity: 52, deliveredQuantity: 52, status: "Delivered" },
365:       { id: "item-fs-18", productCode: "2026-00195039-0020", poLineNumber: "18", name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DSE12 25K", quantity: 16, deliveredQuantity: 0, status: "On Delivery" },
366:       { id: "item-fs-19", productCode: "2026-00194983-0061", poLineNumber: "21", name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DPP12 20K", quantity: 112, deliveredQuantity: 0, status: "In Production" },
367:       { id: "item-fs-20", productCode: "2026-00194983-0062", poLineNumber: "22", name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - DPP12 20K", quantity: 47, deliveredQuantity: 0, status: "Created" },
368:     ],
369:   },
370: ];
371: 
372: 
373: 
374: export interface Supplier {
375:   id: string;
376:   name: string;
377:   type: "PT" | "CV" | "Personal";
378:   phone: string;
379:   picName: string;
380:   email: string;
381:   status: "ACTIVE" | "INACTIVE";
382:   addressLines?: string[];
383: }
384: 
385: export const mockSuppliers: Supplier[] = [
386:   {
387:     id: "SUP-001",
388:     name: "CV Cetakan Terbaik Sejagat",
389:     type: "CV",
390:     phone: "02179697969",
391:     picName: "Marco Polo",
392:     email: "marco@officebee.co",
393:     status: "ACTIVE"
394:   },
395:   {
396:     id: "SUP-004",
397:     name: "PT. HH Global Services Indonesia",
398:     type: "PT",
399:     phone: "+62 21 515 7606",
400:     picName: "Kiky Natalia",
401:     email: "Kiky.Natalia@hhglobal.com",
402:     status: "ACTIVE",
403:     addressLines: [
404:       "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
405:       "Jl. Jendral Sudirman Kav. 52-53",
406:       "Daerah Khusus Ibu Kota Jakarta 12830",
407:     ],
408:   },
409:   {
410:     id: "SUP-002",
411:     name: "PT Print Solusi Indonesia",
412:     type: "PT",
413:     phone: "02188997766",
414:     picName: "Lidya Smith",
415:     email: "lidya@printsolusi.id",
416:     status: "ACTIVE"
417:   },
418:   {
419:     id: "SUP-003",
420:     name: "PT Multi Print Abadi",
421:     type: "PT",
422:     phone: "02144553322",
423:     picName: "Budi Santoso",
424:     email: "budi@multiprint.co.id",
425:     status: "INACTIVE"
426:   }
427: ];
428: 
429: export interface Product {
430:   code: string;
431:   name: string;
432:   brand: string;
433:   weight: string;
434:   status: "Active" | "Inactive";
435:   material?: string;
436:   dimensions?: string;
437: }
438: 
439: export const mockProducts: Product[] = [
440:   {
441:     code: "2026-00194983-0039",
442:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
443:     brand: "DSSK all",
444:     weight: "0.5 kg",
445:     status: "Active",
446:     material: "Vinyl FF Frontlight 10 Oz",
447:     dimensions: "0.5x1 m"
448:   },
449:   {
450:     code: "2026-00194983-0040",
451:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
452:     brand: "DSSK all",
453:     weight: "0.5 kg",
454:     status: "Active",
455:     material: "Vinyl FF Frontlight 10 Oz",
456:     dimensions: "0.7x2 m"
457:   },
458:   {
459:     code: "2026-00194983-0041",
460:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
461:     brand: "DSSK all",
462:     weight: "0.5 kg",
463:     status: "Active",
464:     material: "Vinyl FF Frontlight 10 Oz",
465:     dimensions: "0.7x3 m"
466:   },
467:   {
468:     code: "2026-00194983-0042",
469:     name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
470:     brand: "DSSK all",
471:     weight: "0.5 kg",
472:     status: "Active",
473:     material: "Vinyl FF Frontlight 10 Oz",
474:     dimensions: "0.7x4 m"
475:   },
476:   {
477:     code: "2026-00194983-0043",
478:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
479:     brand: "DSSK all",
480:     weight: "0.5 kg",
481:     status: "Active",
482:     material: "Vinyl FF Frontlight 10 Oz",
483:     dimensions: "1x2 m"
484:   },
485:   {
486:     code: "2026-00194983-0044",
487:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
488:     brand: "DSSK all",
489:     weight: "0.5 kg",
490:     status: "Active",
491:     material: "Vinyl FF Frontlight 10 Oz",
492:     dimensions: "1x3 m"
493:   },
494:   {
495:     code: "2026-00194983-0045",
496:     name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
497:     brand: "DSSK all",
498:     weight: "0.5 kg",
499:     status: "Active",
500:     material: "Vinyl FF Frontlight 10 Oz",
501:     dimensions: "1x4 m"
502:   },
503:   {
504:     code: "2026-00194983-0046",
505:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - DPP12 20K",
506:     brand: "DSSK all",
507:     weight: "0.01 kg",
508:     status: "Active",
509:     material: "Sticker Chromo",
510:     dimensions: "40x40 cm"
511:   },
512:   {
513:     code: "2026-00194983-0047",
514:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - DPP12 20K",
515:     brand: "DSSK all",
516:     weight: "0.5 kg",
517:     status: "Active",
518:     material: "Vinyl FF Backlite",
519:     dimensions: "94x164 cm"
520:   },
521:   {
522:     code: "2026-00194983-0048",
523:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - DPP12 20K",
524:     brand: "DSSK all",
525:     weight: "0.5 kg",
526:     status: "Active",
527:     material: "Vinyl FF Backlite",
528:     dimensions: "94x518 cm"
529:   },
530:   {
531:     code: "2026-00194983-0049",
532:     name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K",
533:     brand: "DSSK all",
534:     weight: "0.01 kg",
535:     status: "Active",
536:     material: "Sticker Blockout",
537:     dimensions: "200x100 cm"
538:   },
539:   {
540:     code: "2026-00194983-0050",
541:     name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - DPP12 20K",
542:     brand: "DSSK all",
543:     weight: "0.01 kg",
544:     status: "Active",
545:     material: "Duratrans",
546:     dimensions: "27.7x97.7 cm"
547:   },
548:   {
549:     code: "2026-00194983-0051",
550:     name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - DPP12 20K",
551:     brand: "DSSK all",
552:     weight: "0.01 kg",
553:     status: "Active",
554:     material: "Duratrans",
555:     dimensions: "27.7x47.6 cm"
556:   },
557:   {
558:     code: "2026-00194983-0052",
559:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - DPP12 20K",
560:     brand: "DSSK all",
561:     weight: "0.01 kg",
562:     status: "Active",
563:     material: "Photopaper",
564:     dimensions: "80x40 cm"
565:   },
566:   {
567:     code: "2026-00194983-0053",
568:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - DPP12 20K",
569:     brand: "DSSK all",
570:     weight: "0.01 kg",
571:     status: "Active",
572:     material: "Photopaper",
573:     dimensions: "40x80 cm"
574:   },
575:   {
576:     code: "2026-00194983-0054",
577:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - DPP12 20K",
578:     brand: "DSSK all",
579:     weight: "0.01 kg",
580:     status: "Active",
581:     material: "Duratrans",
582:     dimensions: "40x120 cm"
583:   },
584:   {
585:     code: "2026-00194983-0055",
586:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - DPP12 20K",
587:     brand: "DSSK all",
588:     weight: "0.01 kg",
589:     status: "Active",
590:     material: "Duratrans",
591:     dimensions: "99.5x56.5 cm"
592:   },
593:   {
594:     code: "2026-00194983-0056",
595:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - DPP12 20K",
596:     brand: "DSSK all",
597:     weight: "0.01 kg",
598:     status: "Active",
599:     material: "Duratrans",
600:     dimensions: "99.5x56.5 cm"
601:   },
602:   {
603:     code: "2026-00194983-0057",
604:     name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - DPP12 20K",
605:     brand: "DSSK all",
606:     weight: "0.01 kg",
607:     status: "Active",
608:     material: "Duratrans",
609:     dimensions: "45x100 cm"
610:   },
611:   {
612:     code: "2026-00194983-0058",
613:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - DPP12 20K",
614:     brand: "DSSK all",
615:     weight: "0.01 kg",
616:     status: "Active",
617:     material: "Photopaper",
618:     dimensions: "25.5x72.5 cm"
619:   },
620:   {
621:     code: "2026-00194983-0059",
622:     name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - DPP12 20K",
623:     brand: "DSSK all",
624:     weight: "0.01 kg",
625:     status: "Active",
626:     material: "Sticker Blockout",
627:     dimensions: "200x100 cm"
628:   },
629:   {
630:     code: "2026-00194983-0060",
631:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DPP12 20K",
632:     brand: "DSSK all",
633:     weight: "0.01 kg",
634:     status: "Active",
635:     material: "Sticker Blockout",
636:     dimensions: "100x200 cm"
637:   },
638:   {
639:     code: "2026-00194983-0061",
640:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DPP12 20K",
641:     brand: "DSSK all",
642:     weight: "0.5 kg",
643:     status: "Active",
644:     material: "Art Carton",
645:     dimensions: "25.5x72.5 cm"
646:   },
647:   {
648:     code: "2026-00194983-0062",
649:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - DPP12 20K",
650:     brand: "DSSK all",
651:     weight: "0.5 kg",
652:     status: "Active",
653:     material: "Art Carton",
654:     dimensions: "20x58 cm"
655:   },
656:   {
657:     code: "2026-00194983-0063",
658:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - DPP12 20K",
659:     brand: "DSSK all",
660:     weight: "0.5 kg",
661:     status: "Active",
662:     material: "Art Carton",
663:     dimensions: "15x40 cm"
664:   },
665:   {
666:     code: "2026-00194983-0064",
667:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - DPP12 20K",
668:     brand: "DSSK all",
669:     weight: "0.5 kg",
670:     status: "Active",
671:     material: "Vinyl FF Frontlight",
672:     dimensions: "90x140 cm"
673:   },
674:   {
675:     code: "2026-00194983-0065",
676:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - DPP12 20K",
677:     brand: "DSSK all",
678:     weight: "0.01 kg",
679:     status: "Active",
680:     material: "Photopaper",
681:     dimensions: "48x47.5 cm"
682:   },
683:   {
684:     code: "2026-00194983-0066",
685:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DPP12 20K",
686:     brand: "DSSK all",
687:     weight: "0.01 kg",
688:     status: "Active",
689:     material: "Photopaper",
690:     dimensions: "48x97.5 cm"
691:   },
692:   {
693:     code: "2026-00194983-0067",
694:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - DPP12 20K",
695:     brand: "DSSK all",
696:     weight: "0.01 kg",
697:     status: "Active",
698:     material: "Photopaper",
699:     dimensions: "44.5x46.5 cm"
700:   },
701:   {
702:     code: "2026-00194983-0068",
703:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - DPP12 20K",
704:     brand: "DSSK all",
705:     weight: "0.01 kg",
706:     status: "Active",
707:     material: "Photopaper",
708:     dimensions: "44.5x96.5 cm"
709:   },
710:   {
711:     code: "2026-00194983-0069",
712:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - DPP12 20K",
713:     brand: "DSSK all",
714:     weight: "0.01 kg",
715:     status: "Active",
716:     material: "Photopaper",
717:     dimensions: "44.5x320 cm"
718:   },
719:   {
720:     code: "2026-00194983-0070",
721:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - DPP12 20K",
722:     brand: "DSSK all",
723:     weight: "0.01 kg",
724:     status: "Active",
725:     material: "Photopaper",
726:     dimensions: "44.5x290 cm"
727:   },
728:   {
729:     code: "2026-00194983-0071",
730:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - DPP12 20K",
731:     brand: "DSSK all",
732:     weight: "0.01 kg",
733:     status: "Active",
734:     material: "Photopaper",
735:     dimensions: "44.5x46.5 cm"
736:   },
737:   {
738:     code: "2026-00194983-0072",
739:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - DPP12 20K",
740:     brand: "DSSK all",
741:     weight: "0.01 kg",
742:     status: "Active",
743:     material: "Photopaper",
744:     dimensions: "44.5x71.5 cm"
745:   },
746:   {
747:     code: "2026-00194983-0073",
748:     name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - DPP12 20K",
749:     brand: "DSSK all",
750:     weight: "0.01 kg",
751:     status: "Active",
752:     material: "Photopaper",
753:     dimensions: "48x47.5 cm"
754:   },
755:   {
756:     code: "2026-00194983-0074",
757:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - DPP12 20K",
758:     brand: "DSSK all",
759:     weight: "0.01 kg",
760:     status: "Active",
761:     material: "Photopaper",
762:     dimensions: "48x72.5 cm"
763:   },
764:   {
765:     code: "2026-00194983-0075",
766:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - DPP12 20K",
767:     brand: "DSSK all",
768:     weight: "0.01 kg",
769:     status: "Active",
770:     material: "Sticker Blockout",
771:     dimensions: "100x400 cm"
772:   },
773:   {
774:     code: "2026-00194983-0076",
775:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - DPP12 20K",
776:     brand: "DSSK all",
777:     weight: "0.01 kg",
778:     status: "Active",
779:     material: "Sticker Blockout",
780:     dimensions: "100x600 cm"
781:   },
782:   {
783:     code: "2026-00194984-0001",
784:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
785:     brand: "Sampoerna Prima",
786:     weight: "0.5 kg",
787:     status: "Active",
788:     material: "Vinyl FF Frontlight 10 Oz",
789:     dimensions: "0.5x1 m"
790:   },
791:   {
792:     code: "2026-00194984-0002",
793:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
794:     brand: "Sampoerna Prima",
795:     weight: "0.5 kg",
796:     status: "Active",
797:     material: "Vinyl FF Frontlight 10 Oz",
798:     dimensions: "0.7x2 m"
799:   },
800:   {
801:     code: "2026-00194984-0003",
802:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
803:     brand: "Sampoerna Prima",
804:     weight: "0.5 kg",
805:     status: "Active",
806:     material: "Vinyl FF Frontlight 10 Oz",
807:     dimensions: "0.7x3 m"
808:   },
809:   {
810:     code: "2026-00194984-0004",
811:     name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
812:     brand: "Sampoerna Prima",
813:     weight: "0.5 kg",
814:     status: "Active",
815:     material: "Vinyl FF Frontlight 10 Oz",
816:     dimensions: "0.7x4 m"
817:   },
818:   {
819:     code: "2026-00194984-0005",
820:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
821:     brand: "Sampoerna Prima",
822:     weight: "0.5 kg",
823:     status: "Active",
824:     material: "Vinyl FF Frontlight 10 Oz",
825:     dimensions: "1x2 m"
826:   },
827:   {
828:     code: "2026-00194984-0006",
829:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
830:     brand: "Sampoerna Prima",
831:     weight: "0.5 kg",
832:     status: "Active",
833:     material: "Vinyl FF Frontlight 10 Oz",
834:     dimensions: "1x3 m"
835:   },
836:   {
837:     code: "2026-00194984-0007",
838:     name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - SPS12 15K",
839:     brand: "Sampoerna Prima",
840:     weight: "0.5 kg",
841:     status: "Active",
842:     material: "Vinyl FF Frontlight 10 Oz",
843:     dimensions: "1x4 m"
844:   },
845:   {
846:     code: "2026-00194984-0008",
847:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - SPS12 15K",
848:     brand: "Sampoerna Prima",
849:     weight: "0.01 kg",
850:     status: "Active",
851:     material: "Sticker Chromo",
852:     dimensions: "40x40 cm"
853:   },
854:   {
855:     code: "2026-00194984-0009",
856:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - SPS12 15K",
857:     brand: "Sampoerna Prima",
858:     weight: "0.5 kg",
859:     status: "Active",
860:     material: "Vinyl FF Backlite",
861:     dimensions: "94x164 cm"
862:   },
863:   {
864:     code: "2026-00194984-0010",
865:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - SPS12 15K",
866:     brand: "Sampoerna Prima",
867:     weight: "0.5 kg",
868:     status: "Active",
869:     material: "Vinyl FF Backlite",
870:     dimensions: "94x518 cm"
871:   },
872:   {
873:     code: "2026-00194984-0011",
874:     name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - SPS12 15K",
875:     brand: "Sampoerna Prima",
876:     weight: "0.01 kg",
877:     status: "Active",
878:     material: "Sticker Blockout",
879:     dimensions: "200x100 cm"
880:   },
881:   {
882:     code: "2026-00194984-0012",
883:     name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - SPS12 15K",
884:     brand: "Sampoerna Prima",
885:     weight: "0.01 kg",
886:     status: "Active",
887:     material: "Duratrans",
888:     dimensions: "27.7x97.7 cm"
889:   },
890:   {
891:     code: "2026-00194984-0013",
892:     name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - SPS12 15K",
893:     brand: "Sampoerna Prima",
894:     weight: "0.01 kg",
895:     status: "Active",
896:     material: "Duratrans",
897:     dimensions: "27.7x47.6 cm"
898:   },
899:   {
900:     code: "2026-00194984-0014",
901:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - SPS12 15K",
902:     brand: "Sampoerna Prima",
903:     weight: "0.01 kg",
904:     status: "Active",
905:     material: "Photopaper",
906:     dimensions: "80x40 cm"
907:   },
908:   {
909:     code: "2026-00194984-0015",
910:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - SPS12 15K",
911:     brand: "Sampoerna Prima",
912:     weight: "0.01 kg",
913:     status: "Active",
914:     material: "Photopaper",
915:     dimensions: "40x80 cm"
916:   },
917:   {
918:     code: "2026-00194984-0016",
919:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - SPS12 15K",
920:     brand: "Sampoerna Prima",
921:     weight: "0.01 kg",
922:     status: "Active",
923:     material: "Duratrans",
924:     dimensions: "40x120 cm"
925:   },
926:   {
927:     code: "2026-00194984-0017",
928:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - SPS12 15K",
929:     brand: "Sampoerna Prima",
930:     weight: "0.01 kg",
931:     status: "Active",
932:     material: "Duratrans",
933:     dimensions: "99.5x56.5 cm"
934:   },
935:   {
936:     code: "2026-00194984-0018",
937:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - SPS12 15K",
938:     brand: "Sampoerna Prima",
939:     weight: "0.01 kg",
940:     status: "Active",
941:     material: "Duratrans",
942:     dimensions: "99.5x56.5 cm"
943:   },
944:   {
945:     code: "2026-00194984-0019",
946:     name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - SPS12 15K",
947:     brand: "Sampoerna Prima",
948:     weight: "0.01 kg",
949:     status: "Active",
950:     material: "Duratrans",
951:     dimensions: "45x100 cm"
952:   },
953:   {
954:     code: "2026-00194984-0020",
955:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - SPS12 15K",
956:     brand: "Sampoerna Prima",
957:     weight: "0.01 kg",
958:     status: "Active",
959:     material: "Photopaper",
960:     dimensions: "25.5x72.5 cm"
961:   },
962:   {
963:     code: "2026-00194984-0021",
964:     name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - SPS12 15K",
965:     brand: "Sampoerna Prima",
966:     weight: "0.01 kg",
967:     status: "Active",
968:     material: "Sticker Blockout",
969:     dimensions: "200x100 cm"
970:   },
971:   {
972:     code: "2026-00194984-0022",
973:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - SPS12 15K",
974:     brand: "Sampoerna Prima",
975:     weight: "0.01 kg",
976:     status: "Active",
977:     material: "Sticker Blockout",
978:     dimensions: "100x200 cm"
979:   },
980:   {
981:     code: "2026-00194984-0023",
982:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - SPS12 15K",
983:     brand: "Sampoerna Prima",
984:     weight: "0.5 kg",
985:     status: "Active",
986:     material: "Art Carton",
987:     dimensions: "25.5x72.5 cm"
988:   },
989:   {
990:     code: "2026-00194984-0024",
991:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - SPS12 15K",
992:     brand: "Sampoerna Prima",
993:     weight: "0.5 kg",
994:     status: "Active",
995:     material: "Art Carton",
996:     dimensions: "20x58 cm"
997:   },
998:   {
999:     code: "2026-00194984-0025",
1000:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - SPS12 15K",
1001:     brand: "Sampoerna Prima",
1002:     weight: "0.5 kg",
1003:     status: "Active",
1004:     material: "Art Carton",
1005:     dimensions: "15x40 cm"
1006:   },
1007:   {
1008:     code: "2026-00194984-0026",
1009:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - SPS12 15K",
1010:     brand: "Sampoerna Prima",
1011:     weight: "0.5 kg",
1012:     status: "Active",
1013:     material: "Vinyl FF Frontlight",
1014:     dimensions: "90x140 cm"
1015:   },
1016:   {
1017:     code: "2026-00194984-0027",
1018:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - SPS12 15K",
1019:     brand: "Sampoerna Prima",
1020:     weight: "0.01 kg",
1021:     status: "Active",
1022:     material: "Photopaper",
1023:     dimensions: "48x47.5 cm"
1024:   },
1025:   {
1026:     code: "2026-00194984-0028",
1027:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - SPS12 15K",
1028:     brand: "Sampoerna Prima",
1029:     weight: "0.01 kg",
1030:     status: "Active",
1031:     material: "Photopaper",
1032:     dimensions: "48x97.5 cm"
1033:   },
1034:   {
1035:     code: "2026-00194984-0029",
1036:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - SPS12 15K",
1037:     brand: "Sampoerna Prima",
1038:     weight: "0.01 kg",
1039:     status: "Active",
1040:     material: "Photopaper",
1041:     dimensions: "44.5x46.5 cm"
1042:   },
1043:   {
1044:     code: "2026-00194984-0030",
1045:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - SPS12 15K",
1046:     brand: "Sampoerna Prima",
1047:     weight: "0.01 kg",
1048:     status: "Active",
1049:     material: "Photopaper",
1050:     dimensions: "44.5x96.5 cm"
1051:   },
1052:   {
1053:     code: "2026-00194984-0031",
1054:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - SPS12 15K",
1055:     brand: "Sampoerna Prima",
1056:     weight: "0.01 kg",
1057:     status: "Active",
1058:     material: "Photopaper",
1059:     dimensions: "44.5x320 cm"
1060:   },
1061:   {
1062:     code: "2026-00194984-0032",
1063:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - SPS12 15K",
1064:     brand: "Sampoerna Prima",
1065:     weight: "0.01 kg",
1066:     status: "Active",
1067:     material: "Photopaper",
1068:     dimensions: "44.5x290 cm"
1069:   },
1070:   {
1071:     code: "2026-00194984-0033",
1072:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - SPS12 15K",
1073:     brand: "Sampoerna Prima",
1074:     weight: "0.01 kg",
1075:     status: "Active",
1076:     material: "Photopaper",
1077:     dimensions: "44.5x46.5 cm"
1078:   },
1079:   {
1080:     code: "2026-00194984-0034",
1081:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - SPS12 15K",
1082:     brand: "Sampoerna Prima",
1083:     weight: "0.01 kg",
1084:     status: "Active",
1085:     material: "Photopaper",
1086:     dimensions: "44.5x71.5 cm"
1087:   },
1088:   {
1089:     code: "2026-00194984-0035",
1090:     name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - SPS12 15K",
1091:     brand: "Sampoerna Prima",
1092:     weight: "0.01 kg",
1093:     status: "Active",
1094:     material: "Photopaper",
1095:     dimensions: "48x47.5 cm"
1096:   },
1097:   {
1098:     code: "2026-00194984-0036",
1099:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - SPS12 15K",
1100:     brand: "Sampoerna Prima",
1101:     weight: "0.01 kg",
1102:     status: "Active",
1103:     material: "Photopaper",
1104:     dimensions: "48x72.5 cm"
1105:   },
1106:   {
1107:     code: "2026-00194984-0037",
1108:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - SPS12 15K",
1109:     brand: "Sampoerna Prima",
1110:     weight: "0.01 kg",
1111:     status: "Active",
1112:     material: "Sticker Blockout",
1113:     dimensions: "100x400 cm"
1114:   },
1115:   {
1116:     code: "2026-00194984-0038",
1117:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - SPS12 15K",
1118:     brand: "Sampoerna Prima",
1119:     weight: "0.01 kg",
1120:     status: "Active",
1121:     material: "Sticker Blockout",
1122:     dimensions: "100x600 cm"
1123:   },
1124:   {
1125:     code: "2026-00194985-0001",
1126:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - SAI12 16K",
1127:     brand: "Sampoerna Prima",
1128:     weight: "0.01 kg",
1129:     status: "Active",
1130:     material: "Sticker Chromo",
1131:     dimensions: "40x40 cm"
1132:   },
1133:   {
1134:     code: "2026-00194987-0001",
1135:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFM12",
1136:     brand: "Magnum Filter Black",
1137:     weight: "0.5 kg",
1138:     status: "Active",
1139:     material: "Vinyl FF Frontlight 10 Oz",
1140:     dimensions: "0.5x1 m"
1141:   },
1142:   {
1143:     code: "2026-00194987-0002",
1144:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFM12",
1145:     brand: "Magnum Filter Black",
1146:     weight: "0.5 kg",
1147:     status: "Active",
1148:     material: "Vinyl FF Frontlight 10 Oz",
1149:     dimensions: "0.7x2 m"
1150:   },
1151:   {
1152:     code: "2026-00194987-0003",
1153:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFM12",
1154:     brand: "Magnum Filter Black",
1155:     weight: "0.5 kg",
1156:     status: "Active",
1157:     material: "Vinyl FF Frontlight 10 Oz",
1158:     dimensions: "0.7x3 m"
1159:   },
1160:   {
1161:     code: "2026-00194987-0004",
1162:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFM12",
1163:     brand: "Magnum Filter Black",
1164:     weight: "0.5 kg",
1165:     status: "Active",
1166:     material: "Vinyl FF Frontlight 10 Oz",
1167:     dimensions: "1x2 m"
1168:   },
1169:   {
1170:     code: "2026-00194987-0005",
1171:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFM12",
1172:     brand: "Magnum Filter Black",
1173:     weight: "0.5 kg",
1174:     status: "Active",
1175:     material: "Vinyl FF Frontlight 10 Oz",
1176:     dimensions: "1x3 m"
1177:   },
1178:   {
1179:     code: "2026-00194987-0006",
1180:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFM12",
1181:     brand: "Magnum Filter Black",
1182:     weight: "0.01 kg",
1183:     status: "Active",
1184:     material: "Sticker Chromo",
1185:     dimensions: "40x40 cm"
1186:   },
1187:   {
1188:     code: "2026-00194987-0007",
1189:     name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFM12",
1190:     brand: "Magnum Filter Black",
1191:     weight: "0.01 kg",
1192:     status: "Active",
1193:     material: "Duratrans",
1194:     dimensions: "27.7x97.7 cm"
1195:   },
1196:   {
1197:     code: "2026-00194987-0008",
1198:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFM12",
1199:     brand: "Magnum Filter Black",
1200:     weight: "0.01 kg",
1201:     status: "Active",
1202:     material: "Photopaper",
1203:     dimensions: "80x40 cm"
1204:   },
1205:   {
1206:     code: "2026-00194987-0009",
1207:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFM12",
1208:     brand: "Magnum Filter Black",
1209:     weight: "0.01 kg",
1210:     status: "Active",
1211:     material: "Photopaper",
1212:     dimensions: "40x80 cm"
1213:   },
1214:   {
1215:     code: "2026-00194987-0010",
1216:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFM12",
1217:     brand: "Magnum Filter Black",
1218:     weight: "0.01 kg",
1219:     status: "Active",
1220:     material: "Duratrans",
1221:     dimensions: "40x120 cm"
1222:   },
1223:   {
1224:     code: "2026-00194987-0011",
1225:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM12",
1226:     brand: "Magnum Filter Black",
1227:     weight: "0.01 kg",
1228:     status: "Active",
1229:     material: "Duratrans",
1230:     dimensions: "99.5x56.5 cm"
1231:   },
1232:   {
1233:     code: "2026-00194987-0012",
1234:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM12",
1235:     brand: "Magnum Filter Black",
1236:     weight: "0.01 kg",
1237:     status: "Active",
1238:     material: "Duratrans",
1239:     dimensions: "99.5x56.5 cm"
1240:   },
1241:   {
1242:     code: "2026-00194987-0013",
1243:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFM12",
1244:     brand: "Magnum Filter Black",
1245:     weight: "0.01 kg",
1246:     status: "Active",
1247:     material: "Photopaper",
1248:     dimensions: "25.5x72.5 cm"
1249:   },
1250:   {
1251:     code: "2026-00194987-0014",
1252:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM12",
1253:     brand: "Magnum Filter Black",
1254:     weight: "0.5 kg",
1255:     status: "Active",
1256:     material: "Art Carton",
1257:     dimensions: "25.5x72.5 cm"
1258:   },
1259:   {
1260:     code: "2026-00194987-0015",
1261:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFM12",
1262:     brand: "Magnum Filter Black",
1263:     weight: "0.5 kg",
1264:     status: "Active",
1265:     material: "Art Carton",
1266:     dimensions: "20x58 cm"
1267:   },
1268:   {
1269:     code: "2026-00194987-0016",
1270:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM12",
1271:     brand: "Magnum Filter Black",
1272:     weight: "0.5 kg",
1273:     status: "Active",
1274:     material: "Art Carton",
1275:     dimensions: "15x40 cm"
1276:   },
1277:   {
1278:     code: "2026-00194987-0017",
1279:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFM12",
1280:     brand: "Magnum Filter Black",
1281:     weight: "0.01 kg",
1282:     status: "Active",
1283:     material: "Photopaper",
1284:     dimensions: "48x47.5 cm"
1285:   },
1286:   {
1287:     code: "2026-00194987-0018",
1288:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFM12",
1289:     brand: "Magnum Filter Black",
1290:     weight: "0.01 kg",
1291:     status: "Active",
1292:     material: "Photopaper",
1293:     dimensions: "48x97.5 cm"
1294:   },
1295:   {
1296:     code: "2026-00194987-0019",
1297:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFM12",
1298:     brand: "Magnum Filter Black",
1299:     weight: "0.01 kg",
1300:     status: "Active",
1301:     material: "Photopaper",
1302:     dimensions: "44.5x46.5 cm"
1303:   },
1304:   {
1305:     code: "2026-00194987-0020",
1306:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFM12",
1307:     brand: "Magnum Filter Black",
1308:     weight: "0.01 kg",
1309:     status: "Active",
1310:     material: "Photopaper",
1311:     dimensions: "44.5x96.5 cm"
1312:   },
1313:   {
1314:     code: "2026-00194987-0021",
1315:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - MFM12",
1316:     brand: "Magnum Filter Black",
1317:     weight: "0.01 kg",
1318:     status: "Active",
1319:     material: "Photopaper",
1320:     dimensions: "44.5x320 cm"
1321:   },
1322:   {
1323:     code: "2026-00194987-0022",
1324:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - MFM12",
1325:     brand: "Magnum Filter Black",
1326:     weight: "0.01 kg",
1327:     status: "Active",
1328:     material: "Photopaper",
1329:     dimensions: "44.5x290 cm"
1330:   },
1331:   {
1332:     code: "2026-00194987-0023",
1333:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFM12",
1334:     brand: "Magnum Filter Black",
1335:     weight: "0.01 kg",
1336:     status: "Active",
1337:     material: "Photopaper",
1338:     dimensions: "44.5x71.5 cm"
1339:   },
1340:   {
1341:     code: "2026-00194987-0024",
1342:     name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - MFM12",
1343:     brand: "Magnum Filter Black",
1344:     weight: "0.01 kg",
1345:     status: "Active",
1346:     material: "Photopaper",
1347:     dimensions: "48x47.5 cm"
1348:   },
1349:   {
1350:     code: "2026-00194987-0025",
1351:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFM12",
1352:     brand: "Magnum Filter Black",
1353:     weight: "0.01 kg",
1354:     status: "Active",
1355:     material: "Photopaper",
1356:     dimensions: "48x72.5 cm"
1357:   },
1358:   {
1359:     code: "2026-00194988-0001",
1360:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFM20",
1361:     brand: "Magnum Filter Black",
1362:     weight: "0.5 kg",
1363:     status: "Active",
1364:     material: "Vinyl FF Frontlight 10 Oz",
1365:     dimensions: "0.5x1 m"
1366:   },
1367:   {
1368:     code: "2026-00194988-0002",
1369:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFM20",
1370:     brand: "Magnum Filter Black",
1371:     weight: "0.5 kg",
1372:     status: "Active",
1373:     material: "Vinyl FF Frontlight 10 Oz",
1374:     dimensions: "0.7x2 m"
1375:   },
1376:   {
1377:     code: "2026-00194988-0003",
1378:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFM20",
1379:     brand: "Magnum Filter Black",
1380:     weight: "0.5 kg",
1381:     status: "Active",
1382:     material: "Vinyl FF Frontlight 10 Oz",
1383:     dimensions: "0.7x3 m"
1384:   },
1385:   {
1386:     code: "2026-00194988-0004",
1387:     name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFM20",
1388:     brand: "Magnum Filter Black",
1389:     weight: "0.5 kg",
1390:     status: "Active",
1391:     material: "Vinyl FF Frontlight 10 Oz",
1392:     dimensions: "0.7x4 m"
1393:   },
1394:   {
1395:     code: "2026-00194988-0005",
1396:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFM20",
1397:     brand: "Magnum Filter Black",
1398:     weight: "0.5 kg",
1399:     status: "Active",
1400:     material: "Vinyl FF Frontlight 10 Oz",
1401:     dimensions: "1x2 m"
1402:   },
1403:   {
1404:     code: "2026-00194988-0006",
1405:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFM20",
1406:     brand: "Magnum Filter Black",
1407:     weight: "0.5 kg",
1408:     status: "Active",
1409:     material: "Vinyl FF Frontlight 10 Oz",
1410:     dimensions: "1x3 m"
1411:   },
1412:   {
1413:     code: "2026-00194988-0007",
1414:     name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFM20",
1415:     brand: "Magnum Filter Black",
1416:     weight: "0.5 kg",
1417:     status: "Active",
1418:     material: "Vinyl FF Frontlight 10 Oz",
1419:     dimensions: "1x4 m"
1420:   },
1421:   {
1422:     code: "2026-00194988-0008",
1423:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFM20",
1424:     brand: "Magnum Filter Black",
1425:     weight: "0.01 kg",
1426:     status: "Active",
1427:     material: "Sticker Chromo",
1428:     dimensions: "40x40 cm"
1429:   },
1430:   {
1431:     code: "2026-00194988-0009",
1432:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFM20",
1433:     brand: "Magnum Filter Black",
1434:     weight: "0.5 kg",
1435:     status: "Active",
1436:     material: "Vinyl FF Backlite",
1437:     dimensions: "94x164 cm"
1438:   },
1439:   {
1440:     code: "2026-00194988-0010",
1441:     name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFM20",
1442:     brand: "Magnum Filter Black",
1443:     weight: "0.01 kg",
1444:     status: "Active",
1445:     material: "Sticker Blockout",
1446:     dimensions: "200x100 cm"
1447:   },
1448:   {
1449:     code: "2026-00194988-0011",
1450:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFM20",
1451:     brand: "Magnum Filter Black",
1452:     weight: "0.01 kg",
1453:     status: "Active",
1454:     material: "Photopaper",
1455:     dimensions: "80x40 cm"
1456:   },
1457:   {
1458:     code: "2026-00194988-0012",
1459:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFM20",
1460:     brand: "Magnum Filter Black",
1461:     weight: "0.01 kg",
1462:     status: "Active",
1463:     material: "Photopaper",
1464:     dimensions: "40x80 cm"
1465:   },
1466:   {
1467:     code: "2026-00194988-0013",
1468:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFM20",
1469:     brand: "Magnum Filter Black",
1470:     weight: "0.01 kg",
1471:     status: "Active",
1472:     material: "Duratrans",
1473:     dimensions: "40x120 cm"
1474:   },
1475:   {
1476:     code: "2026-00194988-0014",
1477:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM20",
1478:     brand: "Magnum Filter Black",
1479:     weight: "0.01 kg",
1480:     status: "Active",
1481:     material: "Duratrans",
1482:     dimensions: "99.5x56.5 cm"
1483:   },
1484:   {
1485:     code: "2026-00194988-0015",
1486:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFM20",
1487:     brand: "Magnum Filter Black",
1488:     weight: "0.01 kg",
1489:     status: "Active",
1490:     material: "Duratrans",
1491:     dimensions: "99.5x56.5 cm"
1492:   },
1493:   {
1494:     code: "2026-00194988-0016",
1495:     name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFM20",
1496:     brand: "Magnum Filter Black",
1497:     weight: "0.01 kg",
1498:     status: "Active",
1499:     material: "Duratrans",
1500:     dimensions: "45x100 cm"
1501:   },
1502:   {
1503:     code: "2026-00194988-0017",
1504:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFM20",
1505:     brand: "Magnum Filter Black",
1506:     weight: "0.01 kg",
1507:     status: "Active",
1508:     material: "Photopaper",
1509:     dimensions: "25.5x72.5 cm"
1510:   },
1511:   {
1512:     code: "2026-00194988-0018",
1513:     name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFM20",
1514:     brand: "Magnum Filter Black",
1515:     weight: "0.01 kg",
1516:     status: "Active",
1517:     material: "Sticker Blockout",
1518:     dimensions: "200x100 cm"
1519:   },
1520:   {
1521:     code: "2026-00194988-0019",
1522:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFM20",
1523:     brand: "Magnum Filter Black",
1524:     weight: "0.01 kg",
1525:     status: "Active",
1526:     material: "Sticker Blockout",
1527:     dimensions: "100x200 cm"
1528:   },
1529:   {
1530:     code: "2026-00194988-0020",
1531:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFM20",
1532:     brand: "Magnum Filter Black",
1533:     weight: "0.5 kg",
1534:     status: "Active",
1535:     material: "Art Carton",
1536:     dimensions: "25.5x72.5 cm"
1537:   },
1538:   {
1539:     code: "2026-00194988-0021",
1540:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFM20",
1541:     brand: "Magnum Filter Black",
1542:     weight: "0.5 kg",
1543:     status: "Active",
1544:     material: "Art Carton",
1545:     dimensions: "20x58 cm"
1546:   },
1547:   {
1548:     code: "2026-00194988-0022",
1549:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFM20",
1550:     brand: "Magnum Filter Black",
1551:     weight: "0.5 kg",
1552:     status: "Active",
1553:     material: "Art Carton",
1554:     dimensions: "15x40 cm"
1555:   },
1556:   {
1557:     code: "2026-00194988-0023",
1558:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFM20",
1559:     brand: "Magnum Filter Black",
1560:     weight: "0.5 kg",
1561:     status: "Active",
1562:     material: "Vinyl FF Frontlight",
1563:     dimensions: "90x140 cm"
1564:   },
1565:   {
1566:     code: "2026-00194988-0024",
1567:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFM20",
1568:     brand: "Magnum Filter Black",
1569:     weight: "0.01 kg",
1570:     status: "Active",
1571:     material: "Photopaper",
1572:     dimensions: "48x47.5 cm"
1573:   },
1574:   {
1575:     code: "2026-00194988-0025",
1576:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFM20",
1577:     brand: "Magnum Filter Black",
1578:     weight: "0.01 kg",
1579:     status: "Active",
1580:     material: "Photopaper",
1581:     dimensions: "48x97.5 cm"
1582:   },
1583:   {
1584:     code: "2026-00194988-0026",
1585:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFM20",
1586:     brand: "Magnum Filter Black",
1587:     weight: "0.01 kg",
1588:     status: "Active",
1589:     material: "Photopaper",
1590:     dimensions: "44.5x46.5 cm"
1591:   },
1592:   {
1593:     code: "2026-00194988-0027",
1594:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFM20",
1595:     brand: "Magnum Filter Black",
1596:     weight: "0.01 kg",
1597:     status: "Active",
1598:     material: "Photopaper",

(Output capped at 50 KB. Showing lines 1-1598. Use offset=1599 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts</path>
<type>file</type>
<content>
1: import { useSyncExternalStore } from "react";
2: import {
3:   getSalesPointClientBinding,
4:   mockOrders,
5:   type ComplaintHistoryEntry,
6:   type ComplaintLineItem,
7:   type ComplaintStatus,
8:   type Order,
9:   type OrderComplaint,
10:   type OrderLine,
11: } from "@/lib/mockData";
12: import { getOrderRequestStatus } from "@/lib/orderStatus";
13: 
14: export interface ImportedOrderLine extends OrderLine {
15:   sourceBatchId?: string;
16:   sourceRowId?: string;
17:   sourcePoNumber?: string;
18:   brandNamePo?: string;
19: }
20: 
21: export interface StoredOrder extends Omit<Order, "items"> {
22:   sourceType?: "manual" | "bulk_po_import";
23:   importBatchId?: string;
24:   importRowIds?: string[];
25:   importGroupKey?: string;
26:   assignedVendorId?: string;
27:   dispatchRunId?: string;
28:   importPoNumbers?: string[];
29:   items: ImportedOrderLine[];
30: }
31: 
32: export interface ManualOrderLineDraft {
33:   productCode: string;
34:   name: string;
35:   quantity: number;
36:   poLineNumber?: string;
37: }
38: 
39: export interface ManualOrderDraft {
40:   campaign: string;
41:   clientPO: string;
42:   soNumber: string;
43:   supplier: string;
44:   salesPointId: string;
45:   picProjectName: string;
46:   picProjectEmail: string;
47:   deadline: string;
48:   createdDate?: string;
49:   sourceType?: "manual";
50:   note?: string;
51:   items: ManualOrderLineDraft[];
52: }
53: 
54: export interface RaiseComplaintInput {
55:   remarks: string;
56:   createdBy: string;
57:   items: Array<Pick<ComplaintLineItem, "lineId" | "actualReceivedQty">>;
58: }
59: 
60: export interface ResolveComplaintInput {
61:   decision: ComplaintStatus;
62:   reviewedBy: string;
63:   reviewNote?: string;
64: }
65: 
66: const STORAGE_KEY = "va-trace-orders";
67: const STORE_EVENT = "va-trace-orders:change";
68: let cachedOrders: StoredOrder[] = mockOrders;
69: let cachedStorageValue: string | null = null;
70: 
71: function readStoredOrders(): StoredOrder[] {
72:   if (typeof window === "undefined") {
73:     return mockOrders;
74:   }
75: 
76:   try {
77:     const stored = window.localStorage.getItem(STORAGE_KEY);
78: 
79:     if (!stored) {
80:       cachedOrders = mockOrders;
81:       cachedStorageValue = null;
82:       return mockOrders;
83:     }
84: 
85:     if (stored === cachedStorageValue) {
86:       return cachedOrders;
87:     }
88: 
89:     const parsed = JSON.parse(stored) as StoredOrder[];
90:     if (Array.isArray(parsed) && parsed.length > 0) {
91:       cachedOrders = parsed;
92:       cachedStorageValue = stored;
93:       return parsed;
94:     }
95: 
96:     cachedOrders = mockOrders;
97:     cachedStorageValue = null;
98:     return mockOrders;
99:   } catch {
100:     return mockOrders;
101:   }
102: }
103: 
104: function writeStoredOrders(nextOrders: StoredOrder[]) {
105:   if (typeof window === "undefined") {
106:     return;
107:   }
108: 
109:   const serialized = JSON.stringify(nextOrders);
110:   cachedOrders = nextOrders;
111:   cachedStorageValue = serialized;
112:   window.localStorage.setItem(STORAGE_KEY, serialized);
113:   window.dispatchEvent(new Event(STORE_EVENT));
114: }
115: 
116: function subscribe(listener: () => void) {
117:   if (typeof window === "undefined") {
118:     return () => undefined;
119:   }
120: 
121:   const handleStorage = (event: StorageEvent) => {
122:     if (event.key === STORAGE_KEY) {
123:       listener();
124:     }
125:   };
126: 
127:   const handleStoreEvent = () => listener();
128: 
129:   window.addEventListener("storage", handleStorage);
130:   window.addEventListener(STORE_EVENT, handleStoreEvent);
131: 
132:   return () => {
133:     window.removeEventListener("storage", handleStorage);
134:     window.removeEventListener(STORE_EVENT, handleStoreEvent);
135:   };
136: }
137: 
138: export function getOrdersSnapshot() {
139:   return readStoredOrders();
140: }
141: 
142: export function useOrders() {
143:   return useSyncExternalStore(subscribe, readStoredOrders, () => mockOrders);
144: }
145: 
146: export function saveOrders(nextOrders: StoredOrder[]) {
147:   writeStoredOrders(nextOrders);
148: }
149: 
150: export function appendOrders(newOrders: StoredOrder[]) {
151:   const existingOrders = readStoredOrders();
152:   writeStoredOrders([...newOrders, ...existingOrders]);
153: }
154: 
155: export function upsertOrder(updatedOrder: StoredOrder) {
156:   const existingOrders = readStoredOrders();
157:   const nextOrders = existingOrders.some((order) => order.id === updatedOrder.id)
158:     ? existingOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
159:     : [updatedOrder, ...existingOrders];
160: 
161:   writeStoredOrders(nextOrders);
162: }
163: 
164: function resolveComplaintLineItems(order: StoredOrder, inputItems: RaiseComplaintInput["items"]): ComplaintLineItem[] {
165:   return order.items.map((item) => {
166:     const requestedItem = inputItems.find((entry) => entry.lineId === item.id);
167:     const systemDeliveredQty = item.deliveredQuantity ?? item.quantity;
168:     const actualReceivedQty = clampQuantity(requestedItem?.actualReceivedQty ?? systemDeliveredQty, item.quantity);
169: 
170:     return {
171:       lineId: item.id,
172:       productCode: item.productCode,
173:       productName: item.name,
174:       poLineNumber: item.poLineNumber,
175:       orderedQty: item.quantity,
176:       systemDeliveredQty,
177:       actualReceivedQty,
178:       deltaQty: Math.max(systemDeliveredQty - actualReceivedQty, 0),
179:     };
180:   });
181: }
182: 
183: function createComplaintHistory(action: ComplaintHistoryEntry["action"], actor: string, note?: string) {
184:   return {
185:     id: `${action}-${Date.now()}`,
186:     action,
187:     actor,
188:     timestamp: new Date().toISOString(),
189:     note,
190:   };
191: }
192: 
193: function clampQuantity(value: number, max: number) {
194:   if (!Number.isFinite(value)) {
195:     return 0;
196:   }
197: 
198:   return Math.max(0, Math.min(Math.round(value), max));
199: }
200: 
201: function makeOrderId() {
202:   return `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
203: }
204: 
205: function toIsoDate(date = new Date()) {
206:   return date.toISOString().slice(0, 10);
207: }
208: 
209: export function createManualOrder(draft: ManualOrderDraft): StoredOrder {
210:   const items: ImportedOrderLine[] = draft.items.map((item, index) => ({
211:     id: `ITEM-${index + 1}`,
212:     productCode: item.productCode,
213:     poLineNumber: item.poLineNumber?.trim() || String(index + 1),
214:     name: item.name,
215:     quantity: item.quantity,
216:     deliveredQuantity: 0,
217:     status: "Created",
218:   }));
219:   const salesPointClient = getSalesPointClientBinding(draft.salesPointId);
220: 
221:   return {
222:     id: makeOrderId(),
223:     campaign: draft.campaign.trim(),
224:     status: getOrderRequestStatus(items),
225:     createdDate: draft.createdDate ?? toIsoDate(),
226:     deadline: draft.deadline.trim(),
227:     clientPO: draft.clientPO.trim(),
228:     soNumber: draft.soNumber.trim(),
229:     supplier: draft.supplier.trim(),
230:     salesPointId: draft.salesPointId,
231:     clientId: salesPointClient?.clientId,
232:     clientName: salesPointClient?.clientName,
233:     clientEntityName: salesPointClient?.clientEntityName,
234:     picProject: {
235:       name: draft.picProjectName.trim(),
236:       email: draft.picProjectEmail.trim(),
237:     },
238:     sourceType: draft.sourceType ?? "manual",
239:     note: draft.note?.trim(),
240:     items,
241:   };
242: }
243: 
244: export function startProduction(orderId: string) {
245:   const existingOrders = readStoredOrders();
246:   const nextOrders: StoredOrder[] = existingOrders.map((order) => {
247:     if (order.id !== orderId) {
248:       return order;
249:     }
250: 
251:     const updatedItems = order.items.map((item) => {
252:       if (item.status === "Created" || item.status === "Waiting" || item.status === "Accepted") {
253:         return { ...item, status: "In Production" as const };
254:       }
255: 
256:       return item;
257:     });
258: 
259:     return {
260:       ...order,
261:       items: updatedItems,
262:       status: getOrderRequestStatus(updatedItems),
263:     };
264:   });
265: 
266:   writeStoredOrders(nextOrders);
267: }
268: 
269: export function raiseQuantityComplaint(orderId: string, input: RaiseComplaintInput) {
270:   const existingOrders = readStoredOrders();
271:   const nextOrders: StoredOrder[] = existingOrders.map((order) => {
272:     if (order.id !== orderId) {
273:       return order;
274:     }
275: 
276:     const complaintItems = resolveComplaintLineItems(order, input.items);
277:     const complaint: OrderComplaint = {
278:       id: `CMP-${order.id}-${Date.now().toString().slice(-6)}`,
279:       status: "pending",
280:       remarks: input.remarks,
281:       createdAt: new Date().toISOString(),
282:       createdBy: input.createdBy,
283:       items: complaintItems,
284:       history: [createComplaintHistory("created", input.createdBy, input.remarks)],
285:     };
286: 
287:     return {
288:       ...order,
289:       complaint,
290:       complaintStatus: "pending" as ComplaintStatus,
291:       revisionStatus: "pending" as ComplaintStatus,
292:     };
293:   });
294: 
295:   writeStoredOrders(nextOrders);
296: }
297: 
298: export function resolveQuantityComplaint(orderId: string, input: ResolveComplaintInput) {
299:   const existingOrders = readStoredOrders();
300:   const nextOrders: StoredOrder[] = existingOrders.map((order) => {
301:     if (order.id !== orderId || !order.complaint) {
302:       return order;
303:     }
304: 
305:     const nextComplaint: OrderComplaint = {
306:       ...order.complaint,
307:       status: input.decision,
308:       reviewedAt: new Date().toISOString(),
309:       reviewedBy: input.reviewedBy,
310:       reviewNote: input.reviewNote,
311:       history: [
312:         ...order.complaint.history,
313:         createComplaintHistory(input.decision === "approved" ? "approved" : "rejected", input.reviewedBy, input.reviewNote),
314:       ],
315:     };
316: 
317:     const updatedItems =
318:       input.decision === "approved"
319:         ? order.items.map((item) => {
320:             const complaintLine = nextComplaint.items.find((entry) => entry.lineId === item.id);
321: 
322:             if (!complaintLine) {
323:               return item;
324:             }
325: 
326:             return {
327:               ...item,
328:               deliveredQuantity: complaintLine.actualReceivedQty,
329:             };
330:           })
331:         : order.items;
332: 
333:     return {
334:       ...order,
335:       items: updatedItems,
336:       complaint: nextComplaint,
337:       complaintStatus: input.decision as ComplaintStatus,
338:       revisionStatus: input.decision as ComplaintStatus,
339:     };
340:   });
341: 
342:   writeStoredOrders(nextOrders);
343: }

(End of file - total 343 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/deliveryNote.ts"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/deliveryNote.ts</path>
<type>file</type>
<content>
1: import {
2:   mockProducts,
3:   mockSalesPoints,
4:   type Order,
5:   type SalesPointMapping,
6: } from "@/lib/mockData";
7: import { findSupplierByName } from "@/lib/supplierStore";
8: import { getOrdersSnapshot } from "@/lib/orderStore";
9: 
10: export interface CompanyProfile {
11:   name: string;
12:   addressLines: string[];
13:   phone: string;
14: }
15: 
16: export interface HHGlobalContact {
17:   label: string;
18:   name: string;
19:   email: string;
20:   phone: string;
21: }
22: 
23: export interface SalesPointDeliveryProfile extends SalesPointMapping {
24:   deliveryCompanyName: string;
25:   deliveryLocationName: string;
26:   address: string;
27:   phone: string;
28:   picClient: string;
29: }
30: 
31: export interface DeliveryNoteLine {
32:   id: string;
33:   poLineNumber: string;
34:   materialCode: string;
35:   description: string;
36:   orderedQty: number;
37:   deliveredQty: number;
38:   outstandingQty: number;
39:   uom: string;
40:   orderedAreaText?: string;
41:   deliveredAreaText?: string;
42:   outstandingAreaText?: string;
43: }
44: 
45: export interface DeliveryNote {
46:   id: string;
47:   orderId: string;
48:   doNumber: string;
49:   barcodeValue: string;
50:   qrPayload: string;
51:   poNumber: string;
52:   soNumber: string;
53:   projectName: string;
54:   picProject: string;
55:   senderProfile: CompanyProfile;
56:   hhGlobalContacts: HHGlobalContact[];
57:   deliverySnapshot: SalesPointDeliveryProfile;
58:   lines: DeliveryNoteLine[];
59:   note: string;
60:   deliveredBy: SignatureBlock;
61:   receivedBy: SignatureBlock;
62:   missingRequiredFields: string[];
63: }
64: 
65: export interface PackagingLabel {
66:   id: string;
67:   lineId: string;
68:   labelCode: string;
69:   qrPayload: string;
70:   orderId: string;
71:   doNumber: string;
72:   poLineNumber: string;
73:   productCode: string;
74:   productName: string;
75:   deliveredQty: number;
76:   uom: string;
77:   destinationCompanyName: string;
78:   destinationLocationName: string;
79:   destinationAddress: string;
80:   salesPointCode: string;
81:   projectName: string;
82: }
83: 
84: export interface PackagingLabelsDocument {
85:   orderId: string;
86:   doNumber: string;
87:   senderProfile: CompanyProfile;
88:   deliverySnapshot: SalesPointDeliveryProfile;
89:   labels: PackagingLabel[];
90:   missingRequiredFields: string[];
91: }
92: 
93: interface SignatureBlock {
94:   date: string;
95:   name: string;
96: }
97: 
98: const fallbackSenderProfile: CompanyProfile = {
99:   name: "PT. HH Global Services Indonesia",
100:   addressLines: [
101:     "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
102:     "Jl. Jendral Sudirman Kav. 52-53",
103:     "Daerah Khusus Ibu Kota Jakarta 12830",
104:   ],
105:   phone: "+62 21 515 7606",
106: };
107: 
108: const hhGlobalContacts: HHGlobalContact[] = [
109:   {
110:     label: "TRADE",
111:     name: "Kiky Natalia",
112:     email: "Kiky.Natalia@hhglobal.com",
113:     phone: "0878 4009 7700",
114:   },
115:   {
116:     label: "OOH",
117:     name: "Dias Tranantha",
118:     email: "Dias.Tranantha@hhglobal.com",
119:     phone: "0811 1441 516",
120:   },
121: ];
122: 
123: export function getSalesPointDeliveryProfile(salesPointId: string): SalesPointDeliveryProfile {
124:   const salesPoint =
125:     mockSalesPoints.find((entry) => entry.wcode === salesPointId) ??
126:     mockSalesPoints[0];
127: 
128:   return {
129:     ...salesPoint,
130:     deliveryCompanyName:
131:       salesPoint.deliveryCompanyName ??
132:       "PT. HM. Sampoerna Tbk",
133:     deliveryLocationName:
134:       salesPoint.deliveryLocationName ??
135:       `PT HMS ${salesPoint.salesPoint}`,
136:     address:
137:       salesPoint.address ??
138:       salesPoint.shippingAddress.alamat ??
139:       `${salesPoint.salesPoint}, ${salesPoint.region}, ${salesPoint.zone}`,
140:     phone: salesPoint.phone ?? salesPoint.pic1.phone ?? "",
141:     picClient: salesPoint.picClient ?? salesPoint.pic1.name ?? "",
142:   };
143: }
144: 
145: export function generateDeliveryNote(order: Order): DeliveryNote {
146:   const deliverySnapshot = getSalesPointDeliveryProfile(order.salesPointId);
147:   const senderProfile = getSenderProfile(order.supplier);
148:   const doNumber = createDoNumber(order);
149:   const lines = order.items.map((item) => {
150:     const product = mockProducts.find((entry) => entry.code === item.productCode);
151:     const deliveredQty = item.deliveredQuantity ?? inferDeliveredQuantity(item.status, item.quantity);
152:     const areaText = getAreaText(product?.dimensions, deliveredQty);
153: 
154:     return {
155:       id: item.id,
156:       poLineNumber: item.poLineNumber,
157:       materialCode: item.productCode,
158:       description: product?.name ?? item.name,
159:       orderedQty: item.quantity,
160:       deliveredQty,
161:       outstandingQty: Math.max(item.quantity - deliveredQty, 0),
162:       uom: "Pcs",
163:       orderedAreaText: getAreaText(product?.dimensions, item.quantity),
164:       deliveredAreaText: areaText,
165:       outstandingAreaText: getAreaText(product?.dimensions, Math.max(item.quantity - deliveredQty, 0)),
166:     };
167:   });
168: 
169:   return {
170:     id: doNumber,
171:     orderId: order.id,
172:     doNumber,
173:     barcodeValue: doNumber,
174:     qrPayload: `va-trace://delivery-note/${doNumber}`,
175:     poNumber: order.clientPO,
176:     soNumber: order.soNumber,
177:     projectName: order.campaign,
178:     picProject: `${order.picProject.name}(${order.picProject.email})`,
179:     senderProfile,
180:     hhGlobalContacts,
181:     deliverySnapshot,
182:     lines,
183:     note: "Tim Area WAJIB melakukan GR CPT dan COUPA.",
184:     deliveredBy: { date: "", name: "" },
185:     receivedBy: { date: "", name: "" },
186:     missingRequiredFields: getMissingRequiredFields(order, deliverySnapshot),
187:   };
188: }
189: 
190: export function generatePackagingLabels(order: Order): PackagingLabelsDocument {
191:   const deliverySnapshot = getSalesPointDeliveryProfile(order.salesPointId);
192:   const senderProfile = getSenderProfile(order.supplier);
193:   const doNumber = createDoNumber(order);
194: 
195:   const labels = order.items
196:     .map((item) => {
197:       const deliveredQty = item.deliveredQuantity ?? inferDeliveredQuantity(item.status, item.quantity);
198: 
199:       if (deliveredQty <= 0) {
200:         return null;
201:       }
202: 
203:       const labelCode = `${doNumber}-${item.poLineNumber.padStart(3, "0")}`;
204: 
205:       return {
206:         id: labelCode,
207:         lineId: item.id,
208:         labelCode,
209:         qrPayload: `va-trace://packaging-label/${doNumber}/${item.id}`,
210:         orderId: order.id,
211:         doNumber,
212:         poLineNumber: item.poLineNumber,
213:         productCode: item.productCode,
214:         productName: item.name,
215:         deliveredQty,
216:         uom: "Pcs",
217:         destinationCompanyName: deliverySnapshot.deliveryCompanyName,
218:         destinationLocationName: deliverySnapshot.deliveryLocationName,
219:         destinationAddress: deliverySnapshot.address,
220:         salesPointCode: deliverySnapshot.wcode,
221:         projectName: order.campaign,
222:       };
223:     })
224:     .filter((label): label is PackagingLabel => label !== null);
225: 
226:   return {
227:     orderId: order.id,
228:     doNumber,
229:     senderProfile,
230:     deliverySnapshot,
231:     labels,
232:     missingRequiredFields: getMissingRequiredFields(order, deliverySnapshot),
233:   };
234: }
235: 
236: export function getDeliveryNoteByOrderId(orderId: string) {
237:   const order = getOrdersSnapshot().find((entry) => entry.id === orderId);
238:   return order ? generateDeliveryNote(order) : null;
239: }
240: 
241: function createDoNumber(order: Order) {
242:   const numericSeed = order.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
243:   return `DEL${order.createdDate.replace(/\D/g, "")}${numericSeed}`;
244: }
245: 
246: function inferDeliveredQuantity(status: string, quantity: number) {
247:   return ["Ready to Ship", "On Delivery", "Delivered", "Completed"].includes(status)
248:     ? quantity
249:     : 0;
250: }
251: 
252: function getSenderProfile(supplierName: string): CompanyProfile {
253:   const supplier = findSupplierByName(supplierName);
254: 
255:   if (!supplier) {
256:     return fallbackSenderProfile;
257:   }
258: 
259:   return {
260:     name: supplier.name,
261:     addressLines: supplier.addressLines?.length ? supplier.addressLines : fallbackSenderProfile.addressLines,
262:     phone: supplier.phone || fallbackSenderProfile.phone,
263:   };
264: }
265: 
266: function getMissingRequiredFields(order: Order, salesPoint: SalesPointDeliveryProfile) {
267:   const missing: string[] = [];
268: 
269:   if (!order.soNumber) missing.push("SO Number");
270:   if (!order.campaign) missing.push("Campaign Name / Project");
271:   if (!order.picProject.name || !order.picProject.email) missing.push("PIC Project");
272:   if (!salesPoint.deliveryCompanyName) missing.push("Deliver-to company");
273:   if (!salesPoint.deliveryLocationName) missing.push("Deliver-to location");
274:   if (!salesPoint.address) missing.push("Deliver-to address");
275:   if (!salesPoint.phone) missing.push("Deliver-to phone");
276: 
277:   return missing;
278: }
279: 
280: function getAreaText(dimensions: string | undefined, quantity: number) {
281:   if (!dimensions || quantity <= 0) {
282:     return undefined;
283:   }
284: 
285:   const match = dimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*(cm|m)/i);
286: 
287:   if (!match) {
288:     return undefined;
289:   }
290: 
291:   const left = Number(match[1]);
292:   const right = Number(match[2]);
293:   const unit = match[3].toLowerCase();
294: 
295:   if (Number.isNaN(left) || Number.isNaN(right)) {
296:     return undefined;
297:   }
298: 
299:   const squareMeters = unit === "cm" ? (left / 100) * (right / 100) : left * right;
300: 
301:   return `${trimArea(squareMeters * quantity)}m2`;
302: }
303: 
304: function trimArea(value: number) {
305:   return value.toFixed(3).replace(/\.?0+$/, "");
306: }

(End of file - total 306 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.3s)

_Thinking:_

Now let me read the remaining parts of mockData.ts and the AdminCreateOrder.tsx, client/CreateOrder.tsx, UpdateProgress.tsx, VendorDashboard.tsx, and OrderDetail.tsx files.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts",
  "offset": 1599
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts</path>
<type>file</type>
<content>
1599:     dimensions: "44.5x96.5 cm"
1600:   },
1601:   {
1602:     code: "2026-00194988-0028",
1603:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x290 cm - Photopaper - MFM20",
1604:     brand: "Magnum Filter Black",
1605:     weight: "0.01 kg",
1606:     status: "Active",
1607:     material: "Photopaper",
1608:     dimensions: "44.5x290 cm"
1609:   },
1610:   {
1611:     code: "2026-00194988-0029",
1612:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - MFM20",
1613:     brand: "Magnum Filter Black",
1614:     weight: "0.01 kg",
1615:     status: "Active",
1616:     material: "Photopaper",
1617:     dimensions: "44.5x46.5 cm"
1618:   },
1619:   {
1620:     code: "2026-00194988-0030",
1621:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFM20",
1622:     brand: "Magnum Filter Black",
1623:     weight: "0.01 kg",
1624:     status: "Active",
1625:     material: "Photopaper",
1626:     dimensions: "44.5x71.5 cm"
1627:   },
1628:   {
1629:     code: "2026-00194988-0031",
1630:     name: "WS Mitra Sampoerna - Info Board (H) - 48x47.5 cm - Photopaper - MFM20",
1631:     brand: "Magnum Filter Black",
1632:     weight: "0.01 kg",
1633:     status: "Active",
1634:     material: "Photopaper",
1635:     dimensions: "48x47.5 cm"
1636:   },
1637:   {
1638:     code: "2026-00194988-0032",
1639:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFM20",
1640:     brand: "Magnum Filter Black",
1641:     weight: "0.01 kg",
1642:     status: "Active",
1643:     material: "Photopaper",
1644:     dimensions: "48x72.5 cm"
1645:   },
1646:   {
1647:     code: "2026-00194988-0033",
1648:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - MFM20",
1649:     brand: "Magnum Filter Black",
1650:     weight: "0.01 kg",
1651:     status: "Active",
1652:     material: "Sticker Blockout",
1653:     dimensions: "100x400 cm"
1654:   },
1655:   {
1656:     code: "2026-00194992-0001",
1657:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFB12",
1658:     brand: "Magnum Filter Black",
1659:     weight: "0.5 kg",
1660:     status: "Active",
1661:     material: "Vinyl FF Frontlight 10 Oz",
1662:     dimensions: "0.5x1 m"
1663:   },
1664:   {
1665:     code: "2026-00194992-0002",
1666:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFB12",
1667:     brand: "Magnum Filter Black",
1668:     weight: "0.5 kg",
1669:     status: "Active",
1670:     material: "Vinyl FF Frontlight 10 Oz",
1671:     dimensions: "0.7x2 m"
1672:   },
1673:   {
1674:     code: "2026-00194992-0003",
1675:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFB12",
1676:     brand: "Magnum Filter Black",
1677:     weight: "0.5 kg",
1678:     status: "Active",
1679:     material: "Vinyl FF Frontlight 10 Oz",
1680:     dimensions: "0.7x3 m"
1681:   },
1682:   {
1683:     code: "2026-00194992-0004",
1684:     name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFB12",
1685:     brand: "Magnum Filter Black",
1686:     weight: "0.5 kg",
1687:     status: "Active",
1688:     material: "Vinyl FF Frontlight 10 Oz",
1689:     dimensions: "0.7x4 m"
1690:   },
1691:   {
1692:     code: "2026-00194992-0005",
1693:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFB12",
1694:     brand: "Magnum Filter Black",
1695:     weight: "0.5 kg",
1696:     status: "Active",
1697:     material: "Vinyl FF Frontlight 10 Oz",
1698:     dimensions: "1x2 m"
1699:   },
1700:   {
1701:     code: "2026-00194992-0006",
1702:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFB12",
1703:     brand: "Magnum Filter Black",
1704:     weight: "0.5 kg",
1705:     status: "Active",
1706:     material: "Vinyl FF Frontlight 10 Oz",
1707:     dimensions: "1x3 m"
1708:   },
1709:   {
1710:     code: "2026-00194992-0007",
1711:     name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFB12",
1712:     brand: "Magnum Filter Black",
1713:     weight: "0.5 kg",
1714:     status: "Active",
1715:     material: "Vinyl FF Frontlight 10 Oz",
1716:     dimensions: "1x4 m"
1717:   },
1718:   {
1719:     code: "2026-00194992-0008",
1720:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFB12",
1721:     brand: "Magnum Filter Black",
1722:     weight: "0.01 kg",
1723:     status: "Active",
1724:     material: "Sticker Chromo",
1725:     dimensions: "40x40 cm"
1726:   },
1727:   {
1728:     code: "2026-00194992-0009",
1729:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFB12",
1730:     brand: "Magnum Filter Black",
1731:     weight: "0.5 kg",
1732:     status: "Active",
1733:     material: "Vinyl FF Backlite",
1734:     dimensions: "94x164 cm"
1735:   },
1736:   {
1737:     code: "2026-00194992-0010",
1738:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - MFB12",
1739:     brand: "Magnum Filter Black",
1740:     weight: "0.5 kg",
1741:     status: "Active",
1742:     material: "Vinyl FF Backlite",
1743:     dimensions: "94x518 cm"
1744:   },
1745:   {
1746:     code: "2026-00194992-0011",
1747:     name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB12",
1748:     brand: "Magnum Filter Black",
1749:     weight: "0.01 kg",
1750:     status: "Active",
1751:     material: "Sticker Blockout",
1752:     dimensions: "200x100 cm"
1753:   },
1754:   {
1755:     code: "2026-00194992-0012",
1756:     name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFB12",
1757:     brand: "Magnum Filter Black",
1758:     weight: "0.01 kg",
1759:     status: "Active",
1760:     material: "Duratrans",
1761:     dimensions: "27.7x97.7 cm"
1762:   },
1763:   {
1764:     code: "2026-00194992-0013",
1765:     name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - MFB12",
1766:     brand: "Magnum Filter Black",
1767:     weight: "0.01 kg",
1768:     status: "Active",
1769:     material: "Duratrans",
1770:     dimensions: "27.7x47.6 cm"
1771:   },
1772:   {
1773:     code: "2026-00194992-0014",
1774:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFB12",
1775:     brand: "Magnum Filter Black",
1776:     weight: "0.01 kg",
1777:     status: "Active",
1778:     material: "Photopaper",
1779:     dimensions: "80x40 cm"
1780:   },
1781:   {
1782:     code: "2026-00194992-0015",
1783:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFB12",
1784:     brand: "Magnum Filter Black",
1785:     weight: "0.01 kg",
1786:     status: "Active",
1787:     material: "Photopaper",
1788:     dimensions: "40x80 cm"
1789:   },
1790:   {
1791:     code: "2026-00194992-0016",
1792:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFB12",
1793:     brand: "Magnum Filter Black",
1794:     weight: "0.01 kg",
1795:     status: "Active",
1796:     material: "Duratrans",
1797:     dimensions: "40x120 cm"
1798:   },
1799:   {
1800:     code: "2026-00194992-0017",
1801:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB12",
1802:     brand: "Magnum Filter Black",
1803:     weight: "0.01 kg",
1804:     status: "Active",
1805:     material: "Duratrans",
1806:     dimensions: "99.5x56.5 cm"
1807:   },
1808:   {
1809:     code: "2026-00194992-0018",
1810:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB12",
1811:     brand: "Magnum Filter Black",
1812:     weight: "0.01 kg",
1813:     status: "Active",
1814:     material: "Duratrans",
1815:     dimensions: "99.5x56.5 cm"
1816:   },
1817:   {
1818:     code: "2026-00194992-0019",
1819:     name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFB12",
1820:     brand: "Magnum Filter Black",
1821:     weight: "0.01 kg",
1822:     status: "Active",
1823:     material: "Duratrans",
1824:     dimensions: "45x100 cm"
1825:   },
1826:   {
1827:     code: "2026-00194992-0020",
1828:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFB12",
1829:     brand: "Magnum Filter Black",
1830:     weight: "0.01 kg",
1831:     status: "Active",
1832:     material: "Photopaper",
1833:     dimensions: "25.5x72.5 cm"
1834:   },
1835:   {
1836:     code: "2026-00194992-0021",
1837:     name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB12",
1838:     brand: "Magnum Filter Black",
1839:     weight: "0.01 kg",
1840:     status: "Active",
1841:     material: "Sticker Blockout",
1842:     dimensions: "200x100 cm"
1843:   },
1844:   {
1845:     code: "2026-00194992-0022",
1846:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFB12",
1847:     brand: "Magnum Filter Black",
1848:     weight: "0.01 kg",
1849:     status: "Active",
1850:     material: "Sticker Blockout",
1851:     dimensions: "100x200 cm"
1852:   },
1853:   {
1854:     code: "2026-00194992-0023",
1855:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFB12",
1856:     brand: "Magnum Filter Black",
1857:     weight: "0.5 kg",
1858:     status: "Active",
1859:     material: "Art Carton",
1860:     dimensions: "25.5x72.5 cm"
1861:   },
1862:   {
1863:     code: "2026-00194992-0024",
1864:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFB12",
1865:     brand: "Magnum Filter Black",
1866:     weight: "0.5 kg",
1867:     status: "Active",
1868:     material: "Art Carton",
1869:     dimensions: "20x58 cm"
1870:   },
1871:   {
1872:     code: "2026-00194992-0025",
1873:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFB12",
1874:     brand: "Magnum Filter Black",
1875:     weight: "0.5 kg",
1876:     status: "Active",
1877:     material: "Art Carton",
1878:     dimensions: "15x40 cm"
1879:   },
1880:   {
1881:     code: "2026-00194992-0026",
1882:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFB12",
1883:     brand: "Magnum Filter Black",
1884:     weight: "0.5 kg",
1885:     status: "Active",
1886:     material: "Vinyl FF Frontlight",
1887:     dimensions: "90x140 cm"
1888:   },
1889:   {
1890:     code: "2026-00194992-0027",
1891:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFB12",
1892:     brand: "Magnum Filter Black",
1893:     weight: "0.01 kg",
1894:     status: "Active",
1895:     material: "Photopaper",
1896:     dimensions: "48x47.5 cm"
1897:   },
1898:   {
1899:     code: "2026-00194992-0028",
1900:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFB12",
1901:     brand: "Magnum Filter Black",
1902:     weight: "0.01 kg",
1903:     status: "Active",
1904:     material: "Photopaper",
1905:     dimensions: "48x97.5 cm"
1906:   },
1907:   {
1908:     code: "2026-00194992-0029",
1909:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFB12",
1910:     brand: "Magnum Filter Black",
1911:     weight: "0.01 kg",
1912:     status: "Active",
1913:     material: "Photopaper",
1914:     dimensions: "44.5x46.5 cm"
1915:   },
1916:   {
1917:     code: "2026-00194992-0030",
1918:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x46.5 cm - Photopaper - MFB12",
1919:     brand: "Magnum Filter Black",
1920:     weight: "0.01 kg",
1921:     status: "Active",
1922:     material: "Photopaper",
1923:     dimensions: "44.5x46.5 cm"
1924:   },
1925:   {
1926:     code: "2026-00194992-0031",
1927:     name: "WS Mitra Sampoerna - Info Board (H) - 44.5x71.5 cm - Photopaper - MFB12",
1928:     brand: "Magnum Filter Black",
1929:     weight: "0.01 kg",
1930:     status: "Active",
1931:     material: "Photopaper",
1932:     dimensions: "44.5x71.5 cm"
1933:   },
1934:   {
1935:     code: "2026-00194992-0032",
1936:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - MFB12",
1937:     brand: "Magnum Filter Black",
1938:     weight: "0.01 kg",
1939:     status: "Active",
1940:     material: "Photopaper",
1941:     dimensions: "48x72.5 cm"
1942:   },
1943:   {
1944:     code: "2026-00194992-0033",
1945:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x400 cm - Sticker Blockout - MFB12",
1946:     brand: "Magnum Filter Black",
1947:     weight: "0.01 kg",
1948:     status: "Active",
1949:     material: "Sticker Blockout",
1950:     dimensions: "100x400 cm"
1951:   },
1952:   {
1953:     code: "2026-00194992-0034",
1954:     name: "WS Stand Alone - Shop Sign Non Pole (H) - 100x600 cm - Sticker Blockout - MFB12",
1955:     brand: "Magnum Filter Black",
1956:     weight: "0.01 kg",
1957:     status: "Active",
1958:     material: "Sticker Blockout",
1959:     dimensions: "100x600 cm"
1960:   },
1961:   {
1962:     code: "2026-00194995-0075",
1963:     name: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - MFB20",
1964:     brand: "Magnum Filter Black",
1965:     weight: "0.5 kg",
1966:     status: "Active",
1967:     material: "Vinyl FF Frontlight 10 Oz",
1968:     dimensions: "0.5x1 m"
1969:   },
1970:   {
1971:     code: "2026-00194995-0076",
1972:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - MFB20",
1973:     brand: "Magnum Filter Black",
1974:     weight: "0.5 kg",
1975:     status: "Active",
1976:     material: "Vinyl FF Frontlight 10 Oz",
1977:     dimensions: "0.7x2 m"
1978:   },
1979:   {
1980:     code: "2026-00194995-0077",
1981:     name: "TPOSM - Sunscreen Without Velcro - 0.7x3 m - Vinyl FF Frontlight 10 Oz - MFB20",
1982:     brand: "Magnum Filter Black",
1983:     weight: "0.5 kg",
1984:     status: "Active",
1985:     material: "Vinyl FF Frontlight 10 Oz",
1986:     dimensions: "0.7x3 m"
1987:   },
1988:   {
1989:     code: "2026-00194995-0078",
1990:     name: "TPOSM - Sunscreen Without Velcro - 0.7x4 m - Vinyl FF Frontlight 10 Oz - MFB20",
1991:     brand: "Magnum Filter Black",
1992:     weight: "0.5 kg",
1993:     status: "Active",
1994:     material: "Vinyl FF Frontlight 10 Oz",
1995:     dimensions: "0.7x4 m"
1996:   },
1997:   {
1998:     code: "2026-00194995-0079",
1999:     name: "TPOSM - Sunscreen Without Velcro - 1x2 m - Vinyl FF Frontlight 10 Oz - MFB20",
2000:     brand: "Magnum Filter Black",
2001:     weight: "0.5 kg",
2002:     status: "Active",
2003:     material: "Vinyl FF Frontlight 10 Oz",
2004:     dimensions: "1x2 m"
2005:   },
2006:   {
2007:     code: "2026-00194995-0080",
2008:     name: "TPOSM - Sunscreen Without Velcro - 1x3 m - Vinyl FF Frontlight 10 Oz - MFB20",
2009:     brand: "Magnum Filter Black",
2010:     weight: "0.5 kg",
2011:     status: "Active",
2012:     material: "Vinyl FF Frontlight 10 Oz",
2013:     dimensions: "1x3 m"
2014:   },
2015:   {
2016:     code: "2026-00194995-0081",
2017:     name: "TPOSM - Sunscreen Without Velcro - 1x4 m - Vinyl FF Frontlight 10 Oz - MFB20",
2018:     brand: "Magnum Filter Black",
2019:     weight: "0.5 kg",
2020:     status: "Active",
2021:     material: "Vinyl FF Frontlight 10 Oz",
2022:     dimensions: "1x4 m"
2023:   },
2024:   {
2025:     code: "2026-00194995-0082",
2026:     name: "TPOSM - Sticker - 40x40 cm - Sticker Chromo - MFB20",
2027:     brand: "Magnum Filter Black",
2028:     weight: "0.01 kg",
2029:     status: "Active",
2030:     material: "Sticker Chromo",
2031:     dimensions: "40x40 cm"
2032:   },
2033:   {
2034:     code: "2026-00194995-0083",
2035:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x164 cm - Vinyl FF Backlite - MFB20",
2036:     brand: "Magnum Filter Black",
2037:     weight: "0.5 kg",
2038:     status: "Active",
2039:     material: "Vinyl FF Backlite",
2040:     dimensions: "94x164 cm"
2041:   },
2042:   {
2043:     code: "2026-00194995-0084",
2044:     name: "GT SRC - Shop Sign SRC Elevate (H) - 94x518 cm - Vinyl FF Backlite - MFB20",
2045:     brand: "Magnum Filter Black",
2046:     weight: "0.5 kg",
2047:     status: "Active",
2048:     material: "Vinyl FF Backlite",
2049:     dimensions: "94x518 cm"
2050:   },
2051:   {
2052:     code: "2026-00194995-0085",
2053:     name: "GT SRC - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB20",
2054:     brand: "Magnum Filter Black",
2055:     weight: "0.01 kg",
2056:     status: "Active",
2057:     material: "Sticker Blockout",
2058:     dimensions: "200x100 cm"
2059:   },
2060:   {
2061:     code: "2026-00194995-0086",
2062:     name: "GT SRC - Backwall SRC Elevate (H) - 27.7x97.7 cm - Duratrans - MFB20",
2063:     brand: "Magnum Filter Black",
2064:     weight: "0.01 kg",
2065:     status: "Active",
2066:     material: "Duratrans",
2067:     dimensions: "27.7x97.7 cm"
2068:   },
2069:   {
2070:     code: "2026-00194995-0087",
2071:     name: "GT SRC - Waterfall Backwall SRC Elevate (H) - 27.7x47.6 cm - Duratrans - MFB20",
2072:     brand: "Magnum Filter Black",
2073:     weight: "0.01 kg",
2074:     status: "Active",
2075:     material: "Duratrans",
2076:     dimensions: "27.7x47.6 cm"
2077:   },
2078:   {
2079:     code: "2026-00194995-0088",
2080:     name: "GT SRC - Snap Frame (V) - 80x40 cm - Photopaper - MFB20",
2081:     brand: "Magnum Filter Black",
2082:     weight: "0.01 kg",
2083:     status: "Active",
2084:     material: "Photopaper",
2085:     dimensions: "80x40 cm"
2086:   },
2087:   {
2088:     code: "2026-00194995-0089",
2089:     name: "GT SRC - Snap Frame (H) - 40x80 cm - Photopaper - MFB20",
2090:     brand: "Magnum Filter Black",
2091:     weight: "0.01 kg",
2092:     status: "Active",
2093:     material: "Photopaper",
2094:     dimensions: "40x80 cm"
2095:   },
2096:   {
2097:     code: "2026-00194995-0090",
2098:     name: "GT SRC - Backwall Topline (H) - 40x120 cm - Duratrans - MFB20",
2099:     brand: "Magnum Filter Black",
2100:     weight: "0.01 kg",
2101:     status: "Active",
2102:     material: "Duratrans",
2103:     dimensions: "40x120 cm"
2104:   },
2105:   {
2106:     code: "2026-00194995-0091",
2107:     name: "GT SRC - New Backwall SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB20",
2108:     brand: "Magnum Filter Black",
2109:     weight: "0.01 kg",
2110:     status: "Active",
2111:     material: "Duratrans",
2112:     dimensions: "99.5x56.5 cm"
2113:   },
2114:   {
2115:     code: "2026-00194995-0092",
2116:     name: "GT SRC - New Cigarette Cabinet SRC 2017 (H) - 99.5x56.5 cm - Duratrans - MFB20",
2117:     brand: "Magnum Filter Black",
2118:     weight: "0.01 kg",
2119:     status: "Active",
2120:     material: "Duratrans",
2121:     dimensions: "99.5x56.5 cm"
2122:   },
2123:   {
2124:     code: "2026-00194995-0093",
2125:     name: "GT SRC - Backwall Expose (H) - 45x100 cm - Duratrans - MFB20",
2126:     brand: "Magnum Filter Black",
2127:     weight: "0.01 kg",
2128:     status: "Active",
2129:     material: "Duratrans",
2130:     dimensions: "45x100 cm"
2131:   },
2132:   {
2133:     code: "2026-00194995-0094",
2134:     name: "GT SRC - Cigarette Cabinet Gen 1 (H) - 25.5x72.5 cm - Photopaper - MFB20",
2135:     brand: "Magnum Filter Black",
2136:     weight: "0.01 kg",
2137:     status: "Active",
2138:     material: "Photopaper",
2139:     dimensions: "25.5x72.5 cm"
2140:   },
2141:   {
2142:     code: "2026-00194995-0095",
2143:     name: "GT Stand Alone - Shop Sign Pole (V) - 200x100 cm - Sticker Blockout - MFB20",
2144:     brand: "Magnum Filter Black",
2145:     weight: "0.01 kg",
2146:     status: "Active",
2147:     material: "Sticker Blockout",
2148:     dimensions: "200x100 cm"
2149:   },
2150:   {
2151:     code: "2026-00194995-0096",
2152:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - MFB20",
2153:     brand: "Magnum Filter Black",
2154:     weight: "0.01 kg",
2155:     status: "Active",
2156:     material: "Sticker Blockout",
2157:     dimensions: "100x200 cm"
2158:   },
2159:   {
2160:     code: "2026-00194995-0097",
2161:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - MFB20",
2162:     brand: "Magnum Filter Black",
2163:     weight: "0.5 kg",
2164:     status: "Active",
2165:     material: "Art Carton",
2166:     dimensions: "25.5x72.5 cm"
2167:   },
2168:   {
2169:     code: "2026-00194995-0098",
2170:     name: "GT Stand Alone - TTD Medium (H) - 20x58 cm - Art Carton - MFB20",
2171:     brand: "Magnum Filter Black",
2172:     weight: "0.5 kg",
2173:     status: "Active",
2174:     material: "Art Carton",
2175:     dimensions: "20x58 cm"
2176:   },
2177:   {
2178:     code: "2026-00194995-0099",
2179:     name: "GT Stand Alone - TTD Fit (H) - 15x40 cm - Art Carton - MFB20",
2180:     brand: "Magnum Filter Black",
2181:     weight: "0.5 kg",
2182:     status: "Active",
2183:     material: "Art Carton",
2184:     dimensions: "15x40 cm"
2185:   },
2186:   {
2187:     code: "2026-00194995-0100",
2188:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - MFB20",
2189:     brand: "Magnum Filter Black",
2190:     weight: "0.5 kg",
2191:     status: "Active",
2192:     material: "Vinyl FF Frontlight",
2193:     dimensions: "90x140 cm"
2194:   },
2195:   {
2196:     code: "2026-00194995-0101",
2197:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x47.5 cm - Photopaper - MFB20",
2198:     brand: "Magnum Filter Black",
2199:     weight: "0.01 kg",
2200:     status: "Active",
2201:     material: "Photopaper",
2202:     dimensions: "48x47.5 cm"
2203:   },
2204:   {
2205:     code: "2026-00194995-0102",
2206:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - MFB20",
2207:     brand: "Magnum Filter Black",
2208:     weight: "0.01 kg",
2209:     status: "Active",
2210:     material: "Photopaper",
2211:     dimensions: "48x97.5 cm"
2212:   },
2213:   {
2214:     code: "2026-00194995-0103",
2215:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x46.5 cm - Photopaper - MFB20",
2216:     brand: "Magnum Filter Black",
2217:     weight: "0.01 kg",
2218:     status: "Active",
2219:     material: "Photopaper",
2220:     dimensions: "44.5x46.5 cm"
2221:   },
2222:   {
2223:     code: "2026-00194995-0104",
2224:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x96.5 cm - Photopaper - MFB20",
2225:     brand: "Magnum Filter Black",
2226:     weight: "0.01 kg",
2227:     status: "Active",
2228:     material: "Photopaper",
2229:     dimensions: "44.5x96.5 cm"
2230:   },
2231:   {
2232:     code: "2026-00194995-0105",
2233:     name: "WS Mitra Sampoerna - Header Backwall (H) - 44.5x320 cm - Photopaper - MFB20",
2234:     brand: "Magnum Filter Black",
2235:     weight: "0.01 kg",
2236:     status: "Active",
2237:     material: "Photopaper",
2238:     dimensions: "44.5x320 cm"
2239:   },
2240:   // DSE12 25K products (Dji Sam Soe Magnum Filter)
2241:   {
2242:     code: "2026-00195039-0002",
2243:     name: "TPOSM - Sunscreen Without Velcro - 0.7x2 m - Vinyl FF Frontlight 10 Oz - DSE12 25K",
2244:     brand: "Dji Sam Soe",
2245:     weight: "0.5 kg",
2246:     status: "Active",
2247:     material: "Vinyl FF Frontlight 10 Oz",
2248:     dimensions: "0.7x2 m"
2249:   },
2250:   {
2251:     code: "2026-00195039-0014",
2252:     name: "GT Stand Alone - Tin Plate (H) - 100x200 cm - Sticker Blockout - DSE12 25K",
2253:     brand: "Dji Sam Soe",
2254:     weight: "0.01 kg",
2255:     status: "Active",
2256:     material: "Sticker Blockout",
2257:     dimensions: "100x200 cm"
2258:   },
2259:   {
2260:     code: "2026-00195039-0015",
2261:     name: "GT Stand Alone - TTD Big (H) - 25.5x72.5 cm - Art Carton - DSE12 25K",
2262:     brand: "Dji Sam Soe",
2263:     weight: "0.5 kg",
2264:     status: "Active",
2265:     material: "Art Carton",
2266:     dimensions: "25.5x72.5 cm"
2267:   },
2268:   {
2269:     code: "2026-00195039-0018",
2270:     name: "WS Mitra Sampoerna - Shop Sign Mitra Sampoerna (H) - 90x140 cm - Vinyl FF Frontlight - DSE12 25K",
2271:     brand: "Dji Sam Soe",
2272:     weight: "0.5 kg",
2273:     status: "Active",
2274:     material: "Vinyl FF Frontlight",
2275:     dimensions: "90x140 cm"
2276:   },
2277:   {
2278:     code: "2026-00195039-0020",
2279:     name: "WS Mitra Sampoerna - Header Backwall (H) - 48x97.5 cm - Photopaper - DSE12 25K",
2280:     brand: "Dji Sam Soe",
2281:     weight: "0.01 kg",
2282:     status: "Active",
2283:     material: "Photopaper",
2284:     dimensions: "48x97.5 cm"
2285:   },
2286:   {
2287:     code: "2026-00195039-0025",
2288:     name: "WS Mitra Sampoerna - Info Board (H) - 48x72.5 cm - Photopaper - DSE12 25K",
2289:     brand: "Dji Sam Soe",
2290:     weight: "0.01 kg",
2291:     status: "Active",
2292:     material: "Photopaper",
2293:     dimensions: "48x72.5 cm"
2294:   },
2295: ];
2296: 
2297: export interface BrandSeed {
2298:   alias: string;
2299:   name: string;
2300:   sysname: string;
2301: }
2302: 
2303: export const mockBrands: BrandSeed[] = [
2304:   { alias: "A-Mild 16", name: "MLA16 35", sysname: "mla16-35" },
2305:   { alias: "Avolution 20", name: "AVO20", sysname: "avo20" },
2306:   { alias: "Dji Sam Soe", name: "DPP12 20", sysname: "dpp12-20" },
2307:   { alias: "DSS Magnum Filter 12 Edisi Bintang", name: "DSE12 25", sysname: "dse12-25" },
2308:   { alias: "Dji Sam Soe Snap Box 12", name: "DSB12", sysname: "dsb12" },
2309:   { alias: "Sampoerna Prima", name: "SPS12 15", sysname: "sps12-15" },
2310:   { alias: "Sampoerna Prima", name: "SAI12 16", sysname: "sai12-16" },
2311: ];
2312: 
2313: export const getBrandSeedByAlias = (alias: string) =>
2314:   mockBrands.find((brand) => brand.alias.toLowerCase() === alias.toLowerCase());
2315: 
2316: export const getBrandSeedByName = (brandName: string) =>
2317:   mockBrands.find((brand) => brand.name.toLowerCase() === brandName.toLowerCase());
2318: 
2319: export const adminMetrics = [
2320:   { label: "Active Orders", value: "24", change: "+4 this week", color: "text-primary" },
2321:   { label: "Urgent Orders", value: "3", change: "Deadline ≤ 3 days", color: "text-destructive" },
2322:   { label: "Completed", value: "156", change: "Last 30 days", color: "text-success" },
2323:   { label: "Work Volume This Month", value: "245", change: "+12% vs last month", color: "text-primary" },
2324: ];
2325: 
2326: export interface SalesPointMapping {
2327:   clientId: string;
2328:   clientName: string;
2329:   clientEntityName: string;
2330:   zone: string;
2331:   region: string;
2332:   area: string;
2333:   subArea: string;
2334:   wcode: string;
2335:   salesPoint: string;
2336:   pic1: SalesPointPic;
2337:   pic2: SalesPointPic;
2338:   remarks: string;
2339:   note: string;
2340:   shippingAddress: ShippingAddress;
2341:   deliveryCompanyName?: string;
2342:   deliveryLocationName?: string;
2343:   address?: string;
2344:   phone?: string;
2345:   picClient?: string;
2346: }
2347: 
2348: const boundClient = {
2349:   clientId: "CUS-SAMPOERNA",
2350:   clientName: "Sampoerna",
2351:   clientEntityName: "PT HM Sampoerna Tbk",
2352: } as const;
2353: 
2354: const baseSalesPoints: Omit<SalesPointMapping, "clientId" | "clientName" | "clientEntityName" | "pic1" | "pic2" | "remarks" | "note" | "shippingAddress" | "subArea">[] = [
2355:   {
2356:     "zone": "Jakarta",
2357:     "region": "Jakarta Inner",
2358:     "area": "Jakarta Barat",
2359:     "wcode": "WH055",
2360:     "salesPoint": "Jakarta Barat"
2361:   },
2362:   {
2363:     "zone": "Jakarta",
2364:     "region": "Jakarta Inner",
2365:     "area": "Jakarta Selatan",
2366:     "wcode": "WH071",
2367:     "salesPoint": "Jakarta Selatan"
2368:   },
2369:   {
2370:     "zone": "Jakarta",
2371:     "region": "Jakarta Inner",
2372:     "area": "Jakarta Timur",
2373:     "wcode": "WH064",
2374:     "salesPoint": "Jakarta Timur"
2375:   },
2376:   {
2377:     "zone": "Jakarta",
2378:     "region": "Jakarta Inner",
2379:     "area": "Jakarta Selatan",
2380:     "wcode": "WH299",
2381:     "salesPoint": "Pondok Pinang Jaksel"
2382:   },
2383:   {
2384:     "zone": "Jakarta",
2385:     "region": "Jakarta Inner",
2386:     "area": "Depok",
2387:     "wcode": "WH059",
2388:     "salesPoint": "Depok"
2389:   },
2390:   {
2391:     "zone": "Jakarta",
2392:     "region": "Jakarta Inner",
2393:     "area": "Jakarta Pusat",
2394:     "wcode": "WH069",
2395:     "salesPoint": "Jakarta Pusat"
2396:   },
2397:   {
2398:     "zone": "Jakarta",
2399:     "region": "Jakarta Inner",
2400:     "area": "Jakarta Utara",
2401:     "wcode": "WH052",
2402:     "salesPoint": "Jakarta Utara"
2403:   },
2404:   {
2405:     "zone": "Jakarta",
2406:     "region": "Jakarta Outer",
2407:     "area": "Bogor",
2408:     "wcode": "WH060",
2409:     "salesPoint": "Bogor"
2410:   },
2411:   {
2412:     "zone": "Jakarta",
2413:     "region": "Jakarta Outer",
2414:     "area": "Serang",
2415:     "wcode": "WH068",
2416:     "salesPoint": "Serang"
2417:   },
2418:   {
2419:     "zone": "Jakarta",
2420:     "region": "Jakarta Outer",
2421:     "area": "Bekasi",
2422:     "wcode": "WH075",
2423:     "salesPoint": "Bekasi"
2424:   },
2425:   {
2426:     "zone": "Jakarta",
2427:     "region": "Jakarta Outer",
2428:     "area": "Karawang",
2429:     "wcode": "WH066",
2430:     "salesPoint": "Karawang"
2431:   },
2432:   {
2433:     "zone": "Jakarta",
2434:     "region": "Jakarta Outer",
2435:     "area": "Tangerang",
2436:     "wcode": "WH057",
2437:     "salesPoint": "Tangerang"
2438:   },
2439:   {
2440:     "zone": "Jakarta",
2441:     "region": "Jakarta Outer",
2442:     "area": "Rangkasbitung",
2443:     "wcode": "WH077",
2444:     "salesPoint": "Rangkasbitung"
2445:   },
2446:   {
2447:     "zone": "West Java",
2448:     "region": "Java 1",
2449:     "area": "Bandung 2",
2450:     "wcode": "WH090",
2451:     "salesPoint": "Bandung 2"
2452:   },
2453:   {
2454:     "zone": "West Java",
2455:     "region": "Java 1",
2456:     "area": "Bandung 2",
2457:     "wcode": "WH169",
2458:     "salesPoint": "DPC Sumedang"
2459:   },
2460:   {
2461:     "zone": "West Java",
2462:     "region": "Java 1",
2463:     "area": "Garut",
2464:     "wcode": "WH083",
2465:     "salesPoint": "Garut"
2466:   },
2467:   {
2468:     "zone": "West Java",
2469:     "region": "Java 1",
2470:     "area": "Bandung 1",
2471:     "wcode": "WH089",
2472:     "salesPoint": "Bandung 1"
2473:   },
2474:   {
2475:     "zone": "West Java",
2476:     "region": "Java 1",
2477:     "area": "Bandung 3",
2478:     "wcode": "WH078",
2479:     "salesPoint": "Bandung 3"
2480:   },
2481:   {
2482:     "zone": "West Java",
2483:     "region": "Java 1",
2484:     "area": "Cirebon",
2485:     "wcode": "WH084",
2486:     "salesPoint": "Cirebon"
2487:   },
2488:   {
2489:     "zone": "West Java",
2490:     "region": "Java 1",
2491:     "area": "Sukabumi",
2492:     "wcode": "WH079",
2493:     "salesPoint": "Sukabumi"
2494:   },
2495:   {
2496:     "zone": "West Java",
2497:     "region": "Java 1",
2498:     "area": "Tasikmalaya",
2499:     "wcode": "WH082",
2500:     "salesPoint": "Tasikmalaya"
2501:   },
2502:   {
2503:     "zone": "Central Java",
2504:     "region": "Java 2",
2505:     "area": "Madiun",
2506:     "wcode": "WH111",
2507:     "salesPoint": "Madiun"
2508:   },
2509:   {
2510:     "zone": "Central Java",
2511:     "region": "Java 2",
2512:     "area": "Magelang",
2513:     "wcode": "WH108",
2514:     "salesPoint": "Magelang"
2515:   },
2516:   {
2517:     "zone": "Central Java",
2518:     "region": "Java 2",
2519:     "area": "Purwokerto",
2520:     "wcode": "WH087",
2521:     "salesPoint": "Purwokerto"
2522:   },
2523:   {
2524:     "zone": "Central Java",
2525:     "region": "Java 2",
2526:     "area": "Salatiga",
2527:     "wcode": "WH112",
2528:     "salesPoint": "Salatiga"
2529:   },
2530:   {
2531:     "zone": "Central Java",
2532:     "region": "Java 2",
2533:     "area": "Surakarta",
2534:     "wcode": "WH109",
2535:     "salesPoint": "Surakarta"
2536:   },
2537:   {
2538:     "zone": "Central Java",
2539:     "region": "Java 2",
2540:     "area": "Yogyakarta",
2541:     "wcode": "WH106",
2542:     "salesPoint": "Yogyakarta"
2543:   },
2544:   {
2545:     "zone": "Central Java",
2546:     "region": "Java 3",
2547:     "area": "Kediri",
2548:     "wcode": "WH117",
2549:     "salesPoint": "Kediri"
2550:   },
2551:   {
2552:     "zone": "Central Java",
2553:     "region": "Java 3",
2554:     "area": "Pati",
2555:     "wcode": "WH104",
2556:     "salesPoint": "Pati"
2557:   },
2558:   {
2559:     "zone": "Central Java",
2560:     "region": "Java 3",
2561:     "area": "Semarang",
2562:     "wcode": "WH099",
2563:     "salesPoint": "Semarang"
2564:   },
2565:   {
2566:     "zone": "Central Java",
2567:     "region": "Java 3",
2568:     "area": "Tegal",
2569:     "wcode": "WH101",
2570:     "salesPoint": "Tegal"
2571:   },
2572:   {
2573:     "zone": "Central Java",
2574:     "region": "Java 3",
2575:     "area": "Tuban",
2576:     "wcode": "WH115",
2577:     "salesPoint": "Tuban"
2578:   },
2579:   {
2580:     "zone": "East Java",
2581:     "region": "Java 4",
2582:     "area": "Surabaya",
2583:     "wcode": "WH131",
2584:     "salesPoint": "Surabaya"
2585:   },
2586:   {
2587:     "zone": "East Java",
2588:     "region": "Java 4",
2589:     "area": "Jember",
2590:     "wcode": "WH122",
2591:     "salesPoint": "DPC Banyuwangi"
2592:   },
2593:   {
2594:     "zone": "East Java",
2595:     "region": "Java 4",
2596:     "area": "Jember",
2597:     "wcode": "WH120",
2598:     "salesPoint": "Jember"
2599:   },
2600:   {
2601:     "zone": "East Java",
2602:     "region": "Java 4",
2603:     "area": "Pamekasan",
2604:     "wcode": "WH119",
2605:     "salesPoint": "Pamekasan"
2606:   },
2607:   {
2608:     "zone": "East Java",
2609:     "region": "Java 4",
2610:     "area": "Gresik",
2611:     "wcode": "WH124",
2612:     "salesPoint": "Gresik"
2613:   },
2614:   {
2615:     "zone": "East Java",
2616:     "region": "Java 4",
2617:     "area": "Mojokerto",
2618:     "wcode": "WH126",
2619:     "salesPoint": "Mojokerto"
2620:   },
2621:   {
2622:     "zone": "East Java",
2623:     "region": "Java 4",
2624:     "area": "Probolinggo",
2625:     "wcode": "WH123",
2626:     "salesPoint": "Probolinggo"
2627:   },
2628:   {
2629:     "zone": "East Java",
2630:     "region": "Java 4",
2631:     "area": "Malang",
2632:     "wcode": "WH116",
2633:     "salesPoint": "Malang"
2634:   },
2635:   {
2636:     "zone": "East Java",
2637:     "region": "Java 4",
2638:     "area": "Sidoarjo",
2639:     "wcode": "WH129",
2640:     "salesPoint": "Sidoarjo"
2641:   },
2642:   {
2643:     "zone": "East Java",
2644:     "region": "Bali NT",
2645:     "area": "Denpasar",
2646:     "wcode": "WH133",
2647:     "salesPoint": "Denpasar"
2648:   },
2649:   {
2650:     "zone": "East Java",
2651:     "region": "Bali NT",
2652:     "area": "Kupang",
2653:     "wcode": "WH137",
2654:     "salesPoint": "EZD Alor"
2655:   },
2656:   {
2657:     "zone": "East Java",
2658:     "region": "Bali NT",
2659:     "area": "Kupang",
2660:     "wcode": "WH137",
2661:     "salesPoint": "EZD Atambua"
2662:   },
2663:   {
2664:     "zone": "East Java",
2665:     "region": "Bali NT",
2666:     "area": "Kupang",
2667:     "wcode": "WH137",
2668:     "salesPoint": "Kupang"
2669:   },
2670:   {
2671:     "zone": "East Java",
2672:     "region": "Bali NT",
2673:     "area": "Mataram",
2674:     "wcode": "WH273",
2675:     "salesPoint": "EZD Sumbawa - Bima"
2676:   },
2677:   {
2678:     "zone": "East Java",
2679:     "region": "Bali NT",
2680:     "area": "Mataram",
2681:     "wcode": "WH273",
2682:     "salesPoint": "EZD Sumbawa - Sumbawa"
2683:   },
2684:   {
2685:     "zone": "East Java",
2686:     "region": "Bali NT",
2687:     "area": "Mataram",
2688:     "wcode": "WH136",
2689:     "salesPoint": "Mataram"
2690:   },
2691:   {
2692:     "zone": "East Java",
2693:     "region": "Bali NT",
2694:     "area": "Kupang",
2695:     "wcode": "WH244",
2696:     "salesPoint": "DPC Ende"
2697:   },
2698:   {
2699:     "zone": "East Java",
2700:     "region": "Bali NT",
2701:     "area": "Kupang",
2702:     "wcode": "WH271",
2703:     "salesPoint": "DPC Ruteng"
2704:   },
2705:   {
2706:     "zone": "East Java",
2707:     "region": "Bali NT",
2708:     "area": "Kupang",
2709:     "wcode": "WH270",
2710:     "salesPoint": "EZD Maumere"
2711:   },
2712:   {
2713:     "zone": "East Java",
2714:     "region": "Bali NT",
2715:     "area": "Kupang",
2716:     "wcode": "WH266",
2717:     "salesPoint": "EZD Sumba"
2718:   },
2719:   {
2720:     "zone": "East Java",
2721:     "region": "Bali NT",
2722:     "area": "Denpasar",
2723:     "wcode": "WH135",
2724:     "salesPoint": "DPC Singaraja"
2725:   },
2726:   {
2727:     "zone": "East",
2728:     "region": "Kalimantan 1",
2729:     "area": "Balikpapan",
2730:     "wcode": "WH145",
2731:     "salesPoint": "Balikpapan"
2732:   },
2733:   {
2734:     "zone": "East",
2735:     "region": "Kalimantan 1",
2736:     "area": "Banjarmasin",
2737:     "wcode": "WH140",
2738:     "salesPoint": "Banjarmasin"
2739:   },
2740:   {
2741:     "zone": "East",
2742:     "region": "Kalimantan 1",
2743:     "area": "Banjarmasin",
2744:     "wcode": "WH141",
2745:     "salesPoint": "DPC Barabai"
2746:   },
2747:   {
2748:     "zone": "East",
2749:     "region": "Kalimantan 1",
2750:     "area": "Banjarmasin",
2751:     "wcode": "WH141",
2752:     "salesPoint": "EZD Kotabaru"
2753:   },
2754:   {
2755:     "zone": "East",
2756:     "region": "Kalimantan 1",
2757:     "area": "Berau",
2758:     "wcode": "WH231",
2759:     "salesPoint": "Sales Point Nunukan"
2760:   },
2761:   {
2762:     "zone": "East",
2763:     "region": "Kalimantan 1",
2764:     "area": "Berau",
2765:     "wcode": "WH274",
2766:     "salesPoint": "Sales Point Tanjung Redeb"
2767:   },
2768:   {
2769:     "zone": "East",
2770:     "region": "Kalimantan 1",
2771:     "area": "Berau",
2772:     "wcode": "WH275",
2773:     "salesPoint": "Sales Point Tarakan"
2774:   },
2775:   {
2776:     "zone": "East",
2777:     "region": "Kalimantan 1",
2778:     "area": "Samarinda",
2779:     "wcode": "WH143",
2780:     "salesPoint": "Samarinda"
2781:   },
2782:   {
2783:     "zone": "East",
2784:     "region": "Kalimantan 2",
2785:     "area": "Palangkaraya",
2786:     "wcode": "WH241",
2787:     "salesPoint": "EZD Pangkalan Bun"
2788:   },
2789:   {
2790:     "zone": "East",
2791:     "region": "Kalimantan 2",
2792:     "area": "Palangkaraya",
2793:     "wcode": "WH277",
2794:     "salesPoint": "EZD Sampit"
2795:   },
2796:   {
2797:     "zone": "East",
2798:     "region": "Kalimantan 2",
2799:     "area": "Palangkaraya",
2800:     "wcode": "WH142",
2801:     "salesPoint": "Palangkaraya"
2802:   },
2803:   {
2804:     "zone": "East",
2805:     "region": "Kalimantan 2",
2806:     "area": "Pontianak",
2807:     "wcode": "WH245",
2808:     "salesPoint": "EZD Ketapang"
2809:   },
2810:   {
2811:     "zone": "East",
2812:     "region": "Kalimantan 2",
2813:     "area": "Pontianak",
2814:     "wcode": "WH138",
2815:     "salesPoint": "Pontianak"
2816:   },
2817:   {
2818:     "zone": "East",
2819:     "region": "Kalimantan 2",
2820:     "area": "Sintang",
2821:     "wcode": "WH139",
2822:     "salesPoint": "Sintang"
2823:   },
2824:   {
2825:     "zone": "East",
2826:     "region": "Sulawesi 1",
2827:     "area": "Manado",
2828:     "wcode": "WH007",
2829:     "salesPoint": "Manado"
2830:   },
2831:   {
2832:     "zone": "East",
2833:     "region": "Sulawesi 1",
2834:     "area": "Pare-Pare",
2835:     "wcode": "WH006",
2836:     "salesPoint": "DPC Palopo"
2837:   },
2838:   {
2839:     "zone": "East",
2840:     "region": "Sulawesi 1",
2841:     "area": "Kendari",
2842:     "wcode": "WH278",
2843:     "salesPoint": "EZD Bau-Bau"
2844:   },
2845:   {
2846:     "zone": "East",
2847:     "region": "Sulawesi 1",
2848:     "area": "Palu",
2849:     "wcode": "WH280",
2850:     "salesPoint": "EZD Luwuk"
2851:   },
2852:   {
2853:     "zone": "East",
2854:     "region": "Sulawesi 1",
2855:     "area": "Gorontalo",
2856:     "wcode": "WH010",
2857:     "salesPoint": "Gorontalo"
2858:   },
2859:   {
2860:     "zone": "East",
2861:     "region": "Sulawesi 1",
2862:     "area": "Palu",
2863:     "wcode": "WH009",
2864:     "salesPoint": "Palu"
2865:   },
2866:   {
2867:     "zone": "East",
2868:     "region": "Sulawesi 1",
2869:     "area": "Pare-Pare",
2870:     "wcode": "WH005",
2871:     "salesPoint": "Pare-Pare"
2872:   },
2873:   {
2874:     "zone": "East",
2875:     "region": "Sulawesi 1",
2876:     "area": "Kendari",
2877:     "wcode": "WH016",
2878:     "salesPoint": "Kendari"
2879:   },
2880:   {
2881:     "zone": "East",
2882:     "region": "Sulawesi 1",
2883:     "area": "Makassar 1",
2884:     "wcode": "WH004",
2885:     "salesPoint": "Makassar 1"
2886:   },
2887:   {
2888:     "zone": "East",
2889:     "region": "Sulawesi 1",
2890:     "area": "Makassar 2",
2891:     "wcode": "WH014",
2892:     "salesPoint": "Makassar 2"
2893:   },
2894:   {
2895:     "zone": "East",
2896:     "region": "Sulawesi 2",
2897:     "area": "Ambon",
2898:     "wcode": "WH008",
2899:     "salesPoint": "Ambon"
2900:   },
2901:   {
2902:     "zone": "East",
2903:     "region": "Sulawesi 2",
2904:     "area": "Ambon",
2905:     "wcode": "WH282",
2906:     "salesPoint": "EZD Tual"
2907:   },
2908:   {
2909:     "zone": "East",
2910:     "region": "Sulawesi 2",
2911:     "area": "Jayapura",
2912:     "wcode": "WH285",
2913:     "salesPoint": "EZD Merauke"
2914:   },
2915:   {
2916:     "zone": "East",
2917:     "region": "Sulawesi 2",
2918:     "area": "Jayapura",
2919:     "wcode": "WH286",
2920:     "salesPoint": "EZD Nabire"
2921:   },
2922:   {
2923:     "zone": "East",
2924:     "region": "Sulawesi 2",
2925:     "area": "Sorong",
2926:     "wcode": "WH289",
2927:     "salesPoint": "Sales Point Fak-Fak"
2928:   },
2929:   {
2930:     "zone": "East",
2931:     "region": "Sulawesi 2",
2932:     "area": "Sorong",
2933:     "wcode": "WH012",
2934:     "salesPoint": "Sales Point Kaimana"
2935:   },
2936:   {
2937:     "zone": "East",
2938:     "region": "Sulawesi 2",
2939:     "area": "Sorong",
2940:     "wcode": "WH290",
2941:     "salesPoint": "Sales Point Manokwari"
2942:   },
2943:   {
2944:     "zone": "East",
2945:     "region": "Sulawesi 2",
2946:     "area": "Sorong",
2947:     "wcode": "WH288",
2948:     "salesPoint": "Sales Point Timika"
2949:   },
2950:   {
2951:     "zone": "East",
2952:     "region": "Sulawesi 2",
2953:     "area": "Sorong",
2954:     "wcode": "WH012",
2955:     "salesPoint": "Sorong"
2956:   },
2957:   {
2958:     "zone": "East",
2959:     "region": "Sulawesi 2",
2960:     "area": "Ternate",
2961:     "wcode": "WH011",
2962:     "salesPoint": "Ternate"
2963:   },
2964:   {
2965:     "zone": "East",
2966:     "region": "Sulawesi 2",
2967:     "area": "Jayapura",
2968:     "wcode": "WH283",
2969:     "salesPoint": "EZD Biak"
2970:   },
2971:   {
2972:     "zone": "East",
2973:     "region": "Sulawesi 2",
2974:     "area": "Jayapura",
2975:     "wcode": "WH287",
2976:     "salesPoint": "EZD Serui"
2977:   },
2978:   {
2979:     "zone": "East",
2980:     "region": "Sulawesi 2",
2981:     "area": "Jayapura",
2982:     "wcode": "WH013",
2983:     "salesPoint": "Jayapura"
2984:   },
2985:   {
2986:     "zone": "North Sumatera",
2987:     "region": "Sumatera 2",
2988:     "area": "Padang",
2989:     "wcode": "WH032",
2990:     "salesPoint": "DPC Solok"
2991:   },
2992:   {
2993:     "zone": "North Sumatera",
2994:     "region": "Sumatera 2",
2995:     "area": "Padang",
2996:     "wcode": "WH031",
2997:     "salesPoint": "Padang"
2998:   },
2999:   {
3000:     "zone": "North Sumatera",
3001:     "region": "Sumatera 2",
3002:     "area": "Bukittinggi",
3003:     "wcode": "WH033",
3004:     "salesPoint": "Bukittinggi"
3005:   },
3006:   {
3007:     "zone": "Jakarta",
3008:     "region": "Jakarta Inner",
3009:     "area": "Jakarta Timur",
3010:     "wcode": "WH295",
3011:     "salesPoint": "Pasar Minggu"
3012:   },
3013:   {
3014:     "zone": "West Java",
3015:     "region": "Java 1",
3016:     "area": "Bandung 3",
3017:     "wcode": "WH096",
3018:     "salesPoint": "DPC Padalarang"
3019:   },
3020:   {
3021:     "zone": "North Sumatera",
3022:     "region": "Sumatera 1",
3023:     "area": "Lhokseumawe",
3024:     "wcode": "WH026",
3025:     "salesPoint": "Lhokseumawe"
3026:   },
3027:   {
3028:     "zone": "North Sumatera",
3029:     "region": "Sumatera 1",
3030:     "area": "Medan 1",
3031:     "wcode": "WH020",
3032:     "salesPoint": "Medan 1"
3033:   },
3034:   {
3035:     "zone": "North Sumatera",
3036:     "region": "Sumatera 1",
3037:     "area": "Medan 2",
3038:     "wcode": "WH021",
3039:     "salesPoint": "Medan 2"
3040:   },
3041:   {
3042:     "zone": "North Sumatera",
3043:     "region": "Sumatera 1",
3044:     "area": "Tanah Karo",
3045:     "wcode": "WH017",
3046:     "salesPoint": "Tanah Karo"
3047:   },
3048:   {
3049:     "zone": "North Sumatera",
3050:     "region": "Sumatera 1",
3051:     "area": "Banda Aceh",
3052:     "wcode": "WH024",
3053:     "salesPoint": "Banda Aceh"
3054:   },
3055:   {
3056:     "zone": "North Sumatera",
3057:     "region": "Sumatera 1",
3058:     "area": "Pematang Siantar",
3059:     "wcode": "WH022",
3060:     "salesPoint": "Pematang Siantar"
3061:   },
3062:   {
3063:     "zone": "North Sumatera",
3064:     "region": "Sumatera 1",
3065:     "area": "Kisaran",
3066:     "wcode": "WH030",
3067:     "salesPoint": "Kisaran"
3068:   },
3069:   {
3070:     "zone": "North Sumatera",
3071:     "region": "Sumatera 1",
3072:     "area": "Padang Sidempuan",
3073:     "wcode": "WH028",
3074:     "salesPoint": "Padang Sidempuan"
3075:   },
3076:   {
3077:     "zone": "North Sumatera",
3078:     "region": "Sumatera 2",
3079:     "area": "Batam",
3080:     "wcode": "WH038",
3081:     "salesPoint": "Batam"
3082:   },
3083:   {
3084:     "zone": "North Sumatera",
3085:     "region": "Sumatera 2",
3086:     "area": "Air Molek",
3087:     "wcode": "WH037",
3088:     "salesPoint": "Air Molek"
3089:   },
3090:   {
3091:     "zone": "North Sumatera",
3092:     "region": "Sumatera 2",
3093:     "area": "Duri",
3094:     "wcode": "WH036",
3095:     "salesPoint": "Duri"
3096:   },
3097:   {
3098:     "zone": "North Sumatera",
3099:     "region": "Sumatera 2",
3100:     "area": "Tanjung Pinang",
3101:     "wcode": "WH256",
3102:     "salesPoint": "EZD Tanjung Balai Karimun"
3103:   },
3104:   {
3105:     "zone": "North Sumatera",
3106:     "region": "Sumatera 2",
3107:     "area": "Pekanbaru",
3108:     "wcode": "WH034",
3109:     "salesPoint": "Pekanbaru"
3110:   },
3111:   {
3112:     "zone": "North Sumatera",
3113:     "region": "Sumatera 2",
3114:     "area": "Tanjung Pinang",
3115:     "wcode": "WH039",
3116:     "salesPoint": "Tanjung Pinang"
3117:   },
3118:   {
3119:     "zone": "South Sumatera",
3120:     "region": "Sumatera 3",
3121:     "area": "Lahat",
3122:     "wcode": "WH045",
3123:     "salesPoint": "Lahat"
3124:   },
3125:   {
3126:     "zone": "South Sumatera",
3127:     "region": "Sumatera 3",
3128:     "area": "Jambi",
3129:     "wcode": "WH047",
3130:     "salesPoint": "Jambi"
3131:   },
3132:   {
3133:     "zone": "South Sumatera",
3134:     "region": "Sumatera 3",
3135:     "area": "Palembang 1",
3136:     "wcode": "WH044",
3137:     "salesPoint": "Palembang 1"
3138:   },
3139:   {
3140:     "zone": "South Sumatera",
3141:     "region": "Sumatera 3",
3142:     "area": "Muara Bungo",
3143:     "wcode": "WH048",
3144:     "salesPoint": "Muara Bungo"
3145:   },
3146:   {
3147:     "zone": "South Sumatera",
3148:     "region": "Sumatera 3",
3149:     "area": "Palembang 2",
3150:     "wcode": "WH179",
3151:     "salesPoint": "Palembang 2"
3152:   },
3153:   {
3154:     "zone": "South Sumatera",
3155:     "region": "Sumatera 3",
3156:     "area": "Lahat",
3157:     "wcode": "WH046",
3158:     "salesPoint": "DPC Baturaja"
3159:   },
3160:   {
3161:     "zone": "South Sumatera",
3162:     "region": "Sumatera 3",
3163:     "area": "Pangkal Pinang",
3164:     "wcode": "WH258",
3165:     "salesPoint": "EZD Bangka"
3166:   },
3167:   {
3168:     "zone": "South Sumatera",
3169:     "region": "Sumatera 3",
3170:     "area": "Pangkal Pinang",
3171:     "wcode": "WH259",
3172:     "salesPoint": "EZD Belitung"
3173:   },
3174:   {
3175:     "zone": "South Sumatera",
3176:     "region": "Sumatera 4",
3177:     "area": "Bandar Lampung",
3178:     "wcode": "WH041",
3179:     "salesPoint": "Bandar Lampung"
3180:   },
3181:   {
3182:     "zone": "South Sumatera",
3183:     "region": "Sumatera 4",
3184:     "area": "Bengkulu",
3185:     "wcode": "WH049",
3186:     "salesPoint": "Bengkulu"
3187:   },
3188:   {
3189:     "zone": "South Sumatera",
3190:     "region": "Sumatera 4",
3191:     "area": "Kotabumi",
3192:     "wcode": "WH042",
3193:     "salesPoint": "Kotabumi"
3194:   },
3195:   {
3196:     "zone": "South Sumatera",
3197:     "region": "Sumatera 4",
3198:     "area": "Metro",
3199:     "wcode": "WH156",
3200:     "salesPoint": "Metro"
3201:   },
3202:   {
3203:     "zone": "South Sumatera",
3204:     "region": "Sumatera 4",
3205:     "area": "Bandar Lampung",
3206:     "wcode": "WH166",
3207:     "salesPoint": "DPC Pringsewu"
3208:   },
3209:   {
3210:     "zone": "South Sumatera",
3211:     "region": "Sumatera 4",
3212:     "area": "Bengkulu",
3213:     "wcode": "WH051",
3214:     "salesPoint": "DPC Lubuk Linggau"
3215:   },
3216:   {
3217:     "zone": "South Sumatera",
3218:     "region": "Sumatera 4",
3219:     "area": "Bandar Lampung",
3220:     "wcode": "WH167",
3221:     "salesPoint": "DPC Kalianda"
3222:   },
3223:   {
3224:     "zone": "South Sumatera",
3225:     "region": "Sumatera 4",
3226:     "area": "Kotabumi",
3227:     "wcode": "WH212",
3228:     "salesPoint": "DPC Tulang Bawang"
3229:   }
3230: ];
3231: 
3232: const emptyPic = { name: "", email: "", phone: "" };
3233: const emptyAddress = { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };
3234: 
3235: function findSeed(zone: string, region: string, area: string, salesPointName: string) {
3236:   const areaSeeds = salesPointSeeds.filter(
3237:     (s) => s.zone === zone && s.region === region && s.area === area,
3238:   );
3239: 
3240:   let best = areaSeeds.find((s) => s.subArea === salesPointName);
3241:   if (best) return best;
3242: 
3243:   best = areaSeeds.find((s) => s.subArea.toLowerCase() === salesPointName.toLowerCase());
3244:   if (best) return best;
3245: 
3246:   best = areaSeeds.find(
3247:     (s) =>
3248:       s.subArea.toLowerCase().includes(salesPointName.toLowerCase()) ||
3249:       salesPointName.toLowerCase().includes(s.subArea.toLowerCase()),
3250:   );
3251:   if (best) return best;
3252: 
3253:   return areaSeeds[0] ?? null;
3254: }
3255: 
3256: export const mockSalesPoints: SalesPointMapping[] = baseSalesPoints.map((salesPoint) => {
3257:   const seed = findSeed(salesPoint.zone, salesPoint.region, salesPoint.area, salesPoint.salesPoint);
3258: 
3259:   return {
3260:     ...salesPoint,
3261:     subArea: seed?.subArea ?? salesPoint.salesPoint,
3262:     pic1: seed?.pic1 ?? emptyPic,
3263:     pic2: seed?.pic2 ?? emptyPic,
3264:     remarks: seed?.remarks ?? "",
3265:     note: seed?.note ?? "",
3266:     shippingAddress: seed?.shippingAddress ?? emptyAddress,
3267:     ...boundClient,
3268:   };
3269: });
3270: 
3271: export function getSalesPointPicByWcode(wcode: string): { name: string; email: string } {
3272:   const salesPoint = mockSalesPoints.find((sp) => sp.wcode === wcode);
3273:   return {
3274:     name: salesPoint?.pic1?.name || "",
3275:     email: salesPoint?.pic1?.email || "",
3276:   };
3277: }
3278: 
3279: export const mockOrders: Order[] = mockOrderSeeds.map((order) => {
3280:   const pic = getSalesPointPicByWcode(order.salesPointId);
3281:   return {
3282:     ...order,
3283:     picProject: {
3284:       name: pic.name || order.picProject.name,
3285:       email: pic.email || order.picProject.email,
3286:     },
3287:     status: getOrderRequestStatus(order.items),
3288:   };
3289: });
3290: 
3291: export function getSalesPointClientBinding(salesPointId: string) {
3292:   const salesPoint = mockSalesPoints.find((entry) => entry.wcode === salesPointId);
3293: 
3294:   if (!salesPoint) {
3295:     return null;
3296:   }
3297: 
3298:   return {
3299:     clientId: salesPoint.clientId,
3300:     clientName: salesPoint.clientName,
3301:     clientEntityName: salesPoint.clientEntityName,
3302:   };
3303: }

(End of file - total 3303 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx</path>
<type>file</type>
<content>
1: import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
2: import { AnimatePresence, motion } from "framer-motion";
3: import { useNavigate } from "react-router-dom";
4: import { Calendar, CheckCircle, ChevronDown, ChevronUp, GripVertical, Info, Package, Plus, Trash2, AlertCircle } from "lucide-react";
5: import { toast } from "sonner";
6: 
7: import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
8: import { ContentArea } from "@/components/layout/ContentArea";
9: import { Header } from "@/components/layout/Header";
10: import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
11: import { Button } from "@/components/ui/button";
12: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
13: import { Input } from "@/components/ui/input";
14: import { Textarea } from "@/components/ui/textarea";
15: import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
16: import { getSalesPointClientBinding, mockSalesPoints } from "@/lib/mockData";
17: import { useProjectStore } from "@/lib/projectStore";
18: import { mockProducts } from "@/lib/productMaster";
19: import { appendOrders, createManualOrder } from "@/lib/orderStore";
20: import { useSupplierStore } from "@/lib/supplierStore";
21: import { cn } from "@/lib/utils";
22: 
23: interface AdminCreateOrderProps {
24:   role?: UserRole;
25: }
26: 
27: type OrderItem = { id: string; productCode: string; quantity: number; poLineNumber: string };
28: 
29: export function AdminCreateOrder({ role = "admin" }: AdminCreateOrderProps) {
30:   const navigate = useNavigate();
31:   const exactDeadlineInputRef = useRef<HTMLInputElement>(null);
32:   const [items, setItems] = useState<OrderItem[]>([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
33:   const [clientPO, setClientPO] = useState("");
34:   const [campaignName, setCampaignName] = useState("");
35:   const [soNumber, setSoNumber] = useState("");
36:   const [picProjectName, setPicProjectName] = useState("");
37:   const [picProjectEmail, setPicProjectEmail] = useState("");
38:   const [selectedSupplier, setSelectedSupplier] = useState("");
39:   const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
40:   const [customDeadline, setCustomDeadline] = useState("");
41:   const [note, setNote] = useState("");
42:   const [submitError, setSubmitError] = useState<string | null>(null);
43:   const [isSubmitting, setIsSubmitting] = useState(false);
44:   const { suppliers } = useSupplierStore();
45:   const { projects, addProject } = useProjectStore();
46: 
47:   const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
48:   const salesPointClient = getSalesPointClientBinding(salesPoint.wcode);
49:   const selectedSupplierRecord = suppliers.find((supplier) => supplier.id === selectedSupplier) ?? null;
50:   const selectedSupplierName = selectedSupplierRecord?.name ?? "Not Selected";
51:   const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
52:   const returnPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
53:   const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
54:   const [dropTargetId, setDropTargetId] = useState<string | null>(null);
55:   const productOptions = useMemo(
56:     () =>
57:       mockProducts.map((product) => ({
58:         value: product.code,
59:         label: product.name,
60:         description: product.code,
61:         keywords: [product.code, product.brand, product.material, product.dimensions].filter(Boolean) as string[],
62:       })),
63:     [],
64:   );
65:   const supplierOptions = useMemo(
66:     () =>
67:       suppliers.map((supplier) => ({
68:         value: supplier.id,
69:         label: supplier.name,
70:         description: supplier.id,
71:         keywords: [supplier.id, supplier.name, supplier.picName, supplier.email, supplier.phone, supplier.type, supplier.status].filter(Boolean) as string[],
72:       })),
73:     [suppliers],
74:   );
75:   const projectOptions = useMemo(
76:     () =>
77:       projects.map((project) => ({
78:         value: project,
79:         label: project,
80:         description: "Shared project record",
81:         keywords: project.split(/\s+/).filter(Boolean),
82:       })),
83:     [projects],
84:   );
85:   const salesPointOptions = useMemo(
86:     () =>
87:       mockSalesPoints.map((entry) => ({
88:         value: entry.wcode,
89:         label: `${entry.wcode} - ${entry.salesPoint}`,
90:         description: `${entry.region} · ${entry.zone}`,
91:         keywords: [entry.wcode, entry.salesPoint, entry.area, entry.region, entry.zone].filter(Boolean) as string[],
92:       })),
93:     [],
94:   );
95: 
96:   const deadlineLabel = formatDeadlineDate(customDeadline);
97: 
98:   const validationErrors = useMemo(() => {
99:     const errors: string[] = [];
100: 
101:     if (!clientPO.trim()) errors.push("Client PO Ref is required.");
102:     if (!campaignName.trim()) errors.push("Project is required.");
103:     if (!soNumber.trim()) errors.push("SO Number is required.");
104:     if (!picProjectName.trim()) errors.push("PIC Project Name is required.");
105:     if (!picProjectEmail.trim()) errors.push("PIC Project Email is required.");
106:     if (!selectedSupplierRecord) errors.push("Supplier assignment is required.");
107:     if (!selectedSalesPoint) errors.push("Sales point is required.");
108:     if (!customDeadline.trim()) errors.push("Deadline is required.");
109: 
110:     items.forEach((item, index) => {
111:       const product = mockProducts.find((entry) => entry.code === item.productCode);
112: 
113:       if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
114:       if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
115:       if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
116:     });
117: 
118:     return errors;
119:   }, [
120:     campaignName,
121:     clientPO,
122:     customDeadline,
123:     deadlineLabel,
124:     items,
125:     picProjectEmail,
126:     picProjectName,
127:     selectedSalesPoint,
128:     selectedSupplierRecord,
129:     soNumber,
130:   ]);
131: 
132:   const addItem = () => {
133:     setItems((current) => [
134:       ...current,
135:       { id: `item-${Date.now()}`, productCode: "", quantity: 0, poLineNumber: String(current.length + 1) },
136:     ]);
137:   };
138: 
139:   const removeItem = (id: string) => {
140:     if (items.length > 1) {
141:       setItems((current) => renumberItems(current.filter((item) => item.id !== id)));
142:     }
143:   };
144: 
145:   const updateItem = (id: string, field: "productCode" | "quantity" | "poLineNumber", value: string | number) => {
146:     setItems((currentItems) =>
147:       currentItems.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : String(value) } : item)),
148:     );
149:   };
150: 
151:   const handlePointerDown = (id: string, event: PointerEvent<HTMLButtonElement>) => {
152:     event.preventDefault();
153:     event.currentTarget.setPointerCapture(event.pointerId);
154:     setDraggedItemId(id);
155:     setDropTargetId(id);
156:   };
157: 
158:   const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
159:     if (!draggedItemId) return;
160: 
161:     const target = document.elementFromPoint(event.clientX, event.clientY);
162:     const row = target?.closest<HTMLElement>("[data-item-row='true']");
163:     const targetId = row?.dataset.itemId;
164: 
165:     if (targetId && targetId !== draggedItemId) {
166:       setDropTargetId(targetId);
167:     }
168:   };
169: 
170:   const handlePointerUp = () => {
171:     if (!draggedItemId || !dropTargetId || draggedItemId === dropTargetId) {
172:       setDraggedItemId(null);
173:       setDropTargetId(null);
174:       return;
175:     }
176: 
177:     setItems((current) => {
178:       return reorderItems(current, draggedItemId, dropTargetId);
179:     });
180: 
181:     setDraggedItemId(null);
182:     setDropTargetId(null);
183:   };
184: 
185:   const handlePointerCancel = () => {
186:     setDraggedItemId(null);
187:     setDropTargetId(null);
188:   };
189: 
190:   const moveItem = (id: string, direction: -1 | 1) => {
191:     setDraggedItemId(null);
192:     setDropTargetId(null);
193:     setItems((current) => reorderItemsByOffset(current, id, direction));
194:   };
195: 
196:   const handleSubmit = () => {
197:     if (validationErrors.length > 0) {
198:       const message = "Fix the required fields before sending this order.";
199:       setSubmitError(message);
200:       toast.error(message);
201:       return;
202:     }
203: 
204:     setIsSubmitting(true);
205:     setSubmitError(null);
206: 
207:     const order = createManualOrder({
208:       campaign: campaignName,
209:       clientPO,
210:       soNumber,
211:       supplier: selectedSupplierName,
212:       salesPointId: selectedSalesPoint,
213:       picProjectName,
214:       picProjectEmail,
215:       deadline: deadlineLabel,
216:       note,
217:       items: items.map((item, index) => {
218:         const product = mockProducts.find((entry) => entry.code === item.productCode);
219: 
220:         return {
221:           productCode: item.productCode,
222:           name: product?.name ?? item.productCode,
223:           quantity: item.quantity,
224:           poLineNumber: item.poLineNumber || String(index + 1),
225:         };
226:       }),
227:     });
228: 
229:     appendOrders([order]);
230:     addProject(campaignName);
231:     toast.success(`Order ${order.id} created.`);
232:     navigate(`/admin/orders/${order.id}`);
233:   };
234: 
235:   const openExactDeadlinePicker = () => {
236:     const input = exactDeadlineInputRef.current;
237:     if (!input) return;
238: 
239:     if (typeof input.showPicker === "function") {
240:       input.showPicker();
241:       return;
242:     }
243: 
244:     input.click();
245:   };
246: 
247:   return (
248:     <div className="flex min-h-screen bg-background">
249:       <Sidebar role={role} />
250:       <ContentArea>
251:         <Header title={`Create Order Request (${role.charAt(0).toUpperCase() + role.slice(1)})`} />
252: 
253:         <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
254:           {submitError ? (
255:             <Alert className="items-start gap-4 border-destructive/20 bg-destructive/5 text-foreground">
256:               <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
257:               <div className="flex-1">
258:                 <AlertTitle className="text-base font-semibold leading-none">Cannot send yet</AlertTitle>
259:                 <AlertDescription className="mt-2">
260:                   <p className="font-medium text-muted-foreground">{submitError}</p>
261:                   {validationErrors.length > 0 ? (
262:                     <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
263:                       {validationErrors.map((error) => (
264:                         <li key={error} className="text-foreground/80">{error}</li>
265:                       ))}
266:                     </ul>
267:                   ) : null}
268:                 </AlertDescription>
269:               </div>
270:             </Alert>
271:           ) : null}
272: 
273:           <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
274:             <div className="space-y-8 lg:col-span-2">
275:               <Card className="border-border/70 shadow-sm">
276:                 <CardHeader className="space-y-2">
277:                   <div className="flex items-center gap-2">
278:                     <Info className="h-4 w-4 text-primary" />
279:                     <CardTitle className="text-base">Project & Supplier Info</CardTitle>
280:                   </div>
281:                   <CardDescription>Capture the order request and supplier assignment.</CardDescription>
282:                 </CardHeader>
283:                 <CardContent>
284:                   <div className="grid gap-4 md:grid-cols-2">
285:                     <FormField label="Client PO Ref" required htmlFor="client-po">
286:                       <Input id="client-po" placeholder="e.g. 123928098" value={clientPO} onChange={(e) => setClientPO(e.target.value)} />
287:                     </FormField>
288:                     <FormField label="SO Number" required htmlFor="so-number">
289:                       <Input id="so-number" placeholder="e.g. SO123928" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />
290:                     </FormField>
291:                     <FormField label="Project" required>
292:                       <SearchableCombobox
293:                         value={campaignName}
294:                         onValueChange={setCampaignName}
295:                         onCreate={(project) => addProject(project)}
296:                         options={projectOptions}
297:                         placeholder="Select or create a project..."
298:                         searchPlaceholder="Search or type a new project name..."
299:                         emptyText="No matching projects found."
300:                         allowCreate
301:                         ariaLabel="Project"
302:                         createLabel="Create project"
303:                       />
304:                     </FormField>
305:                     <FormField label="Deadline" required>
306:                       <div className="relative">
307:                         <Button
308:                           type="button"
309:                           variant="outline"
310:                           className={cn(
311:                             "w-full justify-between border-input bg-background px-3 py-2.5 text-left font-normal text-foreground shadow-none hover:bg-accent",
312:                             !customDeadline && "text-muted-foreground",
313:                           )}
314:                           onClick={openExactDeadlinePicker}
315:                         >
316:                           <span>{customDeadline ? formatDeadlineDate(customDeadline) : "Pick a date"}</span>
317:                           <Calendar className="h-4 w-4 text-muted-foreground" />
318:                         </Button>
319:                         <Input
320:                           ref={exactDeadlineInputRef}
321:                           id="custom-deadline"
322:                           type="date"
323:                           value={customDeadline}
324:                           onChange={(e) => setCustomDeadline(e.target.value)}
325:                           className="sr-only"
326:                           tabIndex={-1}
327:                           aria-hidden="true"
328:                         />
329:                       </div>
330:                     </FormField>
331:                     <FormField label="PIC Project Email" required htmlFor="pic-project-email">
332:                       <Input
333:                         id="pic-project-email"
334:                         type="email"
335:                         placeholder="e.g. chandra.sadikin@sampoerna.com"
336:                         value={picProjectEmail}
337:                         onChange={(e) => setPicProjectEmail(e.target.value)}
338:                       />
339:                     </FormField>
340:                     <FormField label="PIC Project Name" required htmlFor="pic-project-name">
341:                       <Input id="pic-project-name" placeholder="e.g. Chandra Sadikin" value={picProjectName} onChange={(e) => setPicProjectName(e.target.value)} />
342:                     </FormField>
343:                     <FormField label="Assign Supplier" required>
344:                       <SearchableCombobox
345:                         value={selectedSupplier}
346:                         onValueChange={setSelectedSupplier}
347:                         options={supplierOptions}
348:                         placeholder="Select a supplier..."
349:                         searchPlaceholder="Search supplier, PIC, email, phone, or code..."
350:                         emptyText="No suppliers match your search."
351:                       />
352:                     </FormField>
353:                     <FormField label="Sales Point" required>
354:                       <SearchableCombobox
355:                         value={selectedSalesPoint}
356:                         onValueChange={setSelectedSalesPoint}
357:                         options={salesPointOptions}
358:                         placeholder="Select a sales point..."
359:                         searchPlaceholder="Search sales point, zone, region, or code..."
360:                         emptyText="No sales points match your search."
361:                       />
362:                     </FormField>
363:                     <FormField label="Internal Notes" htmlFor="order-note">
364:                       <Textarea
365:                         id="order-note"
366:                         placeholder="Add any internal notes about this order..."
367:                         value={note}
368:                         onChange={(e) => setNote(e.target.value)}
369:                         className="min-h-[80px] resize-none"
370:                       />
371:                     </FormField>
372:                   </div>
373:                 </CardContent>
374:               </Card>
375: 
376:               <Card className="border-border/70 shadow-sm">
377:                 <CardHeader className="space-y-2">
378:                   <div className="flex items-center justify-between gap-4">
379:                     <div className="flex items-center gap-2">
380:                       <Package className="h-4 w-4 text-primary" />
381:                       <CardTitle className="text-base">Items</CardTitle>
382:                     </div>
383:                     <Button variant="outline" size="sm" onClick={addItem}>
384:                       <Plus className="h-4 w-4" />
385:                       Add Item
386:                     </Button>
387:                   </div>
388:                 </CardHeader>
389:                 <CardContent className="space-y-4">
390:                   <AnimatePresence initial={false}>
391:                     {items.map((item, index) => (
392:                       <ItemRow
393:                         key={item.id}
394:                         id={item.id}
395:                         index={index}
396:                         itemCount={items.length}
397:                         isDragging={draggedItemId === item.id}
398:                         isDropTarget={dropTargetId === item.id}
399:                         productCode={item.productCode}
400:                         productOptions={productOptions}
401:                         quantity={item.quantity}
402:                         poLineNumber={item.poLineNumber}
403:                         canMoveUp={index > 0}
404:                         canMoveDown={index < items.length - 1}
405:                         onProductChange={(value) => updateItem(item.id, "productCode", value)}
406:                         onQuantityChange={(value) => updateItem(item.id, "quantity", value)}
407:                         onRemove={() => removeItem(item.id)}
408:                         onMoveUp={() => moveItem(item.id, -1)}
409:                         onMoveDown={() => moveItem(item.id, 1)}
410:                         onPointerDown={(event) => handlePointerDown(item.id, event)}
411:                         onPointerMove={handlePointerMove}
412:                         onPointerUp={handlePointerUp}
413:                         onPointerCancel={handlePointerCancel}
414:                       />
415:                     ))}
416:                   </AnimatePresence>
417:                 </CardContent>
418:               </Card>
419:             </div>
420: 
421:             <div className="space-y-6">
422:               <Card className="sticky top-24 border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
423:                 <CardHeader className="space-y-2">
424:                   <CardTitle className="flex items-center gap-2 text-base">
425:                     <CheckCircle className="h-4 w-4" />
426:                     Review & Assign
427:                   </CardTitle>
428:                   <CardDescription className="text-primary-foreground/80">Confirm the request before sending it to the vendor.</CardDescription>
429:                 </CardHeader>
430:                 <CardContent className="space-y-4 text-sm">
431:                   <div className="space-y-2 border-b border-white/20 pb-4 text-xs">
432:                     <ReviewRow label="Assigned Supplier" value={selectedSupplierName} />
433:                     <ReviewRow label="Sales Point" value={`${salesPoint.wcode} - ${salesPoint.salesPoint}`} />
434:                     <ReviewRow
435:                       label="Client"
436:                       value={
437:                         salesPointClient
438:                           ? `${salesPointClient.clientName} · ${salesPointClient.clientEntityName}`
439:                           : "Unbound"
440:                       }
441:                     />
442:                     <ReviewRow label="SO Number" value={soNumber || "Missing"} />
443:                     <ReviewRow label="PIC Project" value={picProjectName || "Missing"} />
444:                     <ReviewRow label="Total Qty" value={`${totalQuantity} qty`} />
445:                     <ReviewRow
446:                       label="Deadline"
447:                       value={deadlineLabel || "Unknown"}
448:                     />
449:                   </div>
450:                   <Button
451:                     onClick={handleSubmit}
452:                     disabled={isSubmitting}
453:                     className="w-full bg-white text-primary hover:bg-slate-50 disabled:opacity-70"
454:                   >
455:                     {isSubmitting ? "Sending..." : "Approve & Send to Vendor"}
456:                   </Button>
457:                 </CardContent>
458:               </Card>
459:             </div>
460:           </div>
461:         </main>
462:       </ContentArea>
463:     </div>
464:   );
465: }
466: 
467: 
468: function formatDeadlineDate(value: string) {
469:   if (!value.trim()) {
470:     return "";
471:   }
472: 
473:   const parsed = new Date(`${value}T00:00:00`);
474:   if (Number.isNaN(parsed.getTime())) {
475:     return value;
476:   }
477: 
478:   return parsed.toLocaleDateString("en-US", {
479:     month: "short",
480:     day: "numeric",
481:     year: "numeric",
482:   });
483: }
484: 
485: function FormField({
486:   label,
487:   required = false,
488:   htmlFor,
489:   children,
490: }: {
491:   label: string;
492:   required?: boolean;
493:   htmlFor?: string;
494:   children: ReactNode;
495: }) {
496:   return (
497:     <div className="space-y-2">
498:       <label className="text-xs font-medium" htmlFor={htmlFor}>
499:         {label} {required ? "*" : ""}
500:       </label>
501:       {children}
502:     </div>
503:   );
504: }
505: 
506: function ItemRow({
507:   id,
508:   index,
509:   itemCount,
510:   isDragging,
511:   isDropTarget,
512:   productCode,
513:   productOptions,
514:   quantity,
515:   poLineNumber,
516:   canMoveUp,
517:   canMoveDown,
518:   onProductChange,
519:   onQuantityChange,
520:   onRemove,
521:   onMoveUp,
522:   onMoveDown,
523:   onPointerDown,
524:   onPointerMove,
525:   onPointerUp,
526:   onPointerCancel,
527: }: {
528:   id: string;
529:   index: number;
530:   itemCount: number;
531:   isDragging: boolean;
532:   isDropTarget: boolean;
533:   productCode: string;
534:   productOptions: ComboboxOption[];
535:   quantity: number;
536:   poLineNumber: string;
537:   canMoveUp: boolean;
538:   canMoveDown: boolean;
539:   onProductChange: (value: string) => void;
540:   onQuantityChange: (value: string) => void;
541:   onRemove: () => void;
542:   onMoveUp: () => void;
543:   onMoveDown: () => void;
544:   onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
545:   onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
546:   onPointerUp: () => void;
547:   onPointerCancel: () => void;
548: }) {
549:   return (
550:     <motion.div
551:       initial={{ opacity: 0, height: 0 }}
552:       animate={{ opacity: 1, height: "auto" }}
553:       exit={{ opacity: 0, height: 0 }}
554:       data-item-row="true"
555:       data-item-id={id}
556:       className={cn(
557:         "grid gap-3 overflow-visible md:grid-cols-12 md:items-end",
558:         isDragging && "z-10 opacity-80",
559:         isDropTarget && !isDragging && "rounded-lg ring-1 ring-primary/30",
560:       )}
561:     >
562:       <div className="flex items-end gap-2 md:col-span-1 md:pb-0.5">
563:         <button
564:           type="button"
565:           onPointerDown={onPointerDown}
566:           onPointerMove={onPointerMove}
567:           onPointerUp={onPointerUp}
568:           onPointerCancel={onPointerCancel}
569:           className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
570:           style={{ touchAction: "none", cursor: "grab" }}
571:           aria-label={`Reorder line ${poLineNumber}`}
572:         >
573:           <GripVertical className="h-4 w-4" />
574:         </button>
575:       </div>
576:       <div className="space-y-2 md:col-span-2">
577:         {index === 0 ? <label className="text-xs font-medium">Line</label> : null}
578:         <div className="flex items-stretch gap-2">
579:           <Input value={poLineNumber} readOnly tabIndex={-1} className="h-10 bg-muted/40" placeholder="1" />
580:           <div className="flex h-10 w-9 shrink-0 flex-col overflow-hidden rounded-md border border-input bg-background">
581:             <Button
582:               type="button"
583:               variant="ghost"
584:               className="h-1/2 w-full rounded-none border-0 px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
585:               onClick={onMoveUp}
586:               disabled={!canMoveUp}
587:               aria-label={`Move line ${poLineNumber} up`}
588:             >
589:               <ChevronUp className="h-3.5 w-3.5" />
590:             </Button>
591:             <Button
592:               type="button"
593:               variant="ghost"
594:               className="h-1/2 w-full rounded-none border-0 border-t border-input px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
595:               onClick={onMoveDown}
596:               disabled={!canMoveDown}
597:               aria-label={`Move line ${poLineNumber} down`}
598:             >
599:               <ChevronDown className="h-3.5 w-3.5" />
600:             </Button>
601:           </div>
602:         </div>
603:       </div>
604:       <div className="space-y-2 md:col-span-6">
605:         {index === 0 ? <label className="text-xs font-medium">Product</label> : null}
606:         <SearchableCombobox
607:           value={productCode}
608:           onValueChange={onProductChange}
609:           options={productOptions}
610:           placeholder="Select product..."
611:           searchPlaceholder="Search product name, code, brand, or material..."
612:           emptyText="No products match your search."
613:         />
614:       </div>
615:       <div className="space-y-2 md:col-span-2">
616:         {index === 0 ? <label className="text-xs font-medium">Quantity</label> : null}
617:         <Input
618:           type="number"
619:           placeholder="0"
620:           value={quantity || ""}
621:           onChange={(event) => onQuantityChange(event.target.value)}
622:           className="h-10"
623:         />
624:       </div>
625:       <div className="md:col-span-1 md:pb-0.5">
626:         <Button
627:           type="button"
628:           variant="ghost"
629:           size="icon"
630:           className={cn("h-10 w-10", itemCount === 1 && "opacity-20")}
631:           onClick={onRemove}
632:           disabled={itemCount === 1}
633:         >
634:           <Trash2 className="h-4 w-4" />
635:         </Button>
636:       </div>
637:     </motion.div>
638:   );
639: }
640: 
641: function renumberItems(items: OrderItem[]) {
642:   return items.map((item, index) => ({
643:     ...item,
644:     poLineNumber: String(index + 1),
645:   }));
646: }
647: 
648: function reorderItems(items: OrderItem[], sourceId: string, targetId: string) {
649:   const sourceIndex = items.findIndex((item) => item.id === sourceId);
650:   const targetIndex = items.findIndex((item) => item.id === targetId);
651: 
652:   if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
653:     return items;
654:   }
655: 
656:   const nextItems = [...items];
657:   const [movedItem] = nextItems.splice(sourceIndex, 1);
658:   nextItems.splice(targetIndex, 0, movedItem);
659:   return renumberItems(nextItems);
660: }
661: 
662: function reorderItemsByOffset(items: OrderItem[], itemId: string, offset: -1 | 1) {
663:   const currentIndex = items.findIndex((item) => item.id === itemId);
664:   const nextIndex = currentIndex + offset;
665: 
666:   if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
667:     return items;
668:   }
669: 
670:   const nextItems = [...items];
671:   const [movedItem] = nextItems.splice(currentIndex, 1);
672:   nextItems.splice(nextIndex, 0, movedItem);
673:   return renumberItems(nextItems);
674: }
675: 
676: function ReviewRow({ label, value }: { label: string; value: string }) {
677:   return (
678:     <div className="flex items-start justify-between gap-4">
679:       <span className="italic opacity-80">{label}</span>
680:       <span className="max-w-[60%] text-right font-semibold">{value}</span>
681:     </div>
682:   );
683: }

(End of file - total 683 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/client/CreateOrder.tsx"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/client/CreateOrder.tsx</path>
<type>file</type>
<content>
1: import { useMemo, useState } from "react";
2: import { AnimatePresence, motion } from "framer-motion";
3: import { Link, useNavigate } from "react-router-dom";
4: import { ArrowLeft, Calendar, CheckCircle, Info, Package, Plus, Search, Trash2 } from "lucide-react";
5: import { toast } from "sonner";
6: 
7: import { Sidebar } from "@/components/layout/Sidebar";
8: import { ContentArea } from "@/components/layout/ContentArea";
9: import { Header } from "@/components/layout/Header";
10: import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
11: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
12: import { SearchableCombobox } from "@/components/ui/searchable-combobox";
13: import { cn } from "@/lib/utils";
14: import { getSalesPointClientBinding, mockProducts, mockSalesPoints } from "@/lib/mockData";
15: import { appendOrders, createManualOrder } from "@/lib/orderStore";
16: import { useProjectStore } from "@/lib/projectStore";
17: 
18: export function CreateOrder() {
19:   const navigate = useNavigate();
20:   const [items, setItems] = useState([{ id: "item-1", productCode: "", quantity: 0, poLineNumber: "1" }]);
21:   const [clientPO, setClientPO] = useState("");
22:   const [campaignName, setCampaignName] = useState("");
23:   const [soNumber, setSoNumber] = useState("");
24:   const [selectedSalesPoint, setSelectedSalesPoint] = useState("WH020");
25:   const [deadline, setDeadline] = useState("");
26:   const [linkFA, setLinkFA] = useState("");
27:   const [submitError, setSubmitError] = useState<string | null>(null);
28:   const [isSubmitting, setIsSubmitting] = useState(false);
29:   const { projects, addProject } = useProjectStore();
30: 
31:   const salesPoint = mockSalesPoints.find((entry) => entry.wcode === selectedSalesPoint) ?? mockSalesPoints[0];
32:   const salesPointClient = getSalesPointClientBinding(salesPoint.wcode);
33:   const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
34:   const projectOptions = useMemo(
35:     () =>
36:       projects.map((project) => ({
37:         value: project,
38:         label: project,
39:         description: "Shared project record",
40:         keywords: project.split(/\s+/).filter(Boolean),
41:       })),
42:     [projects],
43:   );
44: 
45:   const validationErrors = useMemo(() => {
46:     const errors: string[] = [];
47: 
48:     if (!clientPO.trim()) errors.push("Client PO Ref is required.");
49:     if (!campaignName.trim()) errors.push("Campaign Name is required.");
50:     if (!soNumber.trim()) errors.push("SO Number is required.");
51:     if (!selectedSalesPoint) errors.push("Sales point is required.");
52:     if (!deadline.trim()) errors.push("Deadline is required.");
53: 
54:     items.forEach((item, index) => {
55:       const product = mockProducts.find((entry) => entry.code === item.productCode);
56: 
57:       if (!item.productCode) errors.push(`Item ${index + 1}: select a product.`);
58:       if (!product) errors.push(`Item ${index + 1}: product code is not recognized.`);
59:       if (item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
60:     });
61: 
62:     return errors;
63:   }, [campaignName, clientPO, deadline, items, selectedSalesPoint, soNumber]);
64: 
65:   const addItem = () => {
66:     setItems((current) => [
67:       ...current,
68:       { id: `item-${Date.now()}`, productCode: "", quantity: 0, poLineNumber: String(current.length + 1) },
69:     ]);
70:   };
71: 
72:   const removeItem = (id: string) => {
73:     if (items.length > 1) {
74:       setItems(items.filter((item) => item.id !== id));
75:     }
76:   };
77: 
78:   const updateItem = (id: string, field: "productCode" | "quantity" | "poLineNumber", value: string | number) => {
79:     setItems((current) =>
80:       current.map((item) => (item.id === id ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : String(value) } : item)),
81:     );
82:   };
83: 
84:   const handleSubmit = () => {
85:     if (validationErrors.length > 0) {
86:       const message = "Fix the required fields before creating this order request.";
87:       setSubmitError(message);
88:       toast.error(message);
89:       return;
90:     }
91: 
92:     setIsSubmitting(true);
93:     setSubmitError(null);
94: 
95:     const order = createManualOrder({
96:       campaign: campaignName,
97:       clientPO,
98:       soNumber,
99:       supplier: "Pending",
100:       salesPointId: selectedSalesPoint,
101:       picProjectName: "Client Submitted",
102:       picProjectEmail: "",
103:       deadline,
104:       items: items.map((item, index) => {
105:         const product = mockProducts.find((entry) => entry.code === item.productCode);
106: 
107:         return {
108:           productCode: item.productCode,
109:           name: product?.name ?? item.productCode,
110:           quantity: item.quantity,
111:           poLineNumber: item.poLineNumber || String(index + 1),
112:         };
113:       }),
114:     });
115: 
116:     appendOrders([order]);
117:     addProject(campaignName);
118:     toast.success(`Order ${order.id} created.`);
119:     navigate("/client");
120:   };
121: 
122:   return (
123:     <div className="flex min-h-screen bg-canvas-white">
124:       <Sidebar role="client" />
125:       <ContentArea>
126:         <Header title="New Order Request" />
127: 
128:         <main className="mx-auto max-w-4xl space-y-8 p-8">
129:           <section className="flex items-center justify-between animate-in-smart">
130:             <Link to="/client" className="flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary group">
131:               <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
132:               Discard and Return
133:             </Link>
134:           </section>
135: 
136:           <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
137:             <div className="space-y-8 md:col-span-2">
138:               <section className="space-y-6 rounded-lg border border-border bg-white p-6 shadow-sm animate-in-smart" style={{ animationDelay: "100ms" }}>
139:                 <div className="flex items-center gap-2 border-b border-border pb-4">
140:                   <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
141:                     <Info className="h-3 w-3 text-primary" />
142:                   </div>
143:                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Project Details</h3>
144:                 </div>
145: 
146:                 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
147:                     <FormInput id="client-po" label="Client PO Ref" placeholder="e.g. 123928098" required value={clientPO} onChange={setClientPO} />
148:                   <div className="space-y-1.5">
149:                     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
150:                       Campaign Name *
151:                     </label>
152:                     <SearchableCombobox
153:                       value={campaignName}
154:                       onValueChange={setCampaignName}
155:                       onCreate={(project) => addProject(project)}
156:                       options={projectOptions}
157:                       placeholder="Select or create a project..."
158:                       searchPlaceholder="Search or type a new project name..."
159:                       emptyText="No matching projects found."
160:                       allowCreate
161:                       ariaLabel="Campaign Name"
162:                       createLabel="Create project"
163:                     />
164:                   </div>
165:                   <FormInput id="so-number" label="SO Number" placeholder="e.g. SO123928" required value={soNumber} onChange={setSoNumber} />
166:                   <div className="space-y-1.5">
167:                     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="sales-point">
168:                       Sales Point *
169:                     </label>
170:                     <div className="relative group">
171:                       <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
172:                       <select
173:                         id="sales-point"
174:                         value={selectedSalesPoint}
175:                         onChange={(event) => setSelectedSalesPoint(event.target.value)}
176:                         className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
177:                       >
178:                         {mockSalesPoints.map((entry) => (
179:                           <option key={`${entry.wcode}-${entry.salesPoint}`} value={entry.wcode}>
180:                             {entry.wcode} - {entry.salesPoint}
181:                           </option>
182:                         ))}
183:                       </select>
184:                     </div>
185:                   </div>
186:                   <div className="space-y-1.5">
187:                     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="deadline">
188:                       Deadline *
189:                     </label>
190:                     <div className="relative group">
191:                       <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
192:                       <input
193:                         id="deadline"
194:                         type="date"
195:                         value={deadline}
196:                         onChange={(event) => setDeadline(event.target.value)}
197:                         className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
198:                       />
199:                     </div>
200:                   </div>
201:                 </div>
202: 
203:                 <FormInput id="link-fa" label="Link FA (Optional)" placeholder="https://..." value={linkFA} onChange={setLinkFA} />
204:               </section>
205: 
206:               <section className="space-y-6 rounded-lg border border-border bg-white p-6 shadow-sm animate-in-smart" style={{ animationDelay: "200ms" }}>
207:                 <div className="flex items-center justify-between border-b border-border pb-4">
208:                   <div className="flex items-center gap-2">
209:                     <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
210:                       <Package className="h-3 w-3 text-primary" />
211:                     </div>
212:                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Item Specification</h3>
213:                   </div>
214:                   <button
215:                     onClick={addItem}
216:                     className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/5 btn-press"
217:                   >
218:                     <Plus className="h-3 w-3" />
219:                     Add Item
220:                   </button>
221:                 </div>
222: 
223:                 <div className="space-y-4">
224:                   <AnimatePresence initial={false}>
225:                     {items.map((item, index) => (
226:                       <motion.div
227:                         key={item.id}
228:                         initial={{ opacity: 0, height: 0, marginBottom: 0 }}
229:                         animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
230:                         exit={{ opacity: 0, height: 0, marginBottom: 0 }}
231:                         transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
232:                         className="grid grid-cols-12 items-end gap-3 overflow-hidden"
233:                       >
234:                         <div className="col-span-7 space-y-1.5">
235:                           {index === 0 ? <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Product</label> : null}
236:                           <Select value={item.productCode} onValueChange={(value) => updateItem(item.id, "productCode", value)}>
237:                             <SelectTrigger>
238:                               <SelectValue placeholder="Select product..." />
239:                             </SelectTrigger>
240:                             <SelectContent>
241:                               {mockProducts.map((product) => (
242:                                 <SelectItem key={product.code} value={product.code}>
243:                                   {product.name}
244:                                 </SelectItem>
245:                               ))}
246:                             </SelectContent>
247:                           </Select>
248:                         </div>
249:                         <div className="col-span-4 space-y-1.5">
250:                           {index === 0 ? <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Quantity</label> : null}
251:                           <input
252:                             type="number"
253:                             value={item.quantity || ""}
254:                             onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
255:                             placeholder="0"
256:                             className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
257:                           />
258:                         </div>
259:                         <div className="col-span-1 pb-1">
260:                           <button
261:                             onClick={() => removeItem(item.id)}
262:                             className={cn(
263:                               "rounded-md p-2 text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive btn-press",
264:                               items.length === 1 && "pointer-events-none cursor-not-allowed opacity-20",
265:                             )}
266:                           >
267:                             <Trash2 className="h-4 w-4" />
268:                           </button>
269:                         </div>
270:                       </motion.div>
271:                     ))}
272:                   </AnimatePresence>
273:                 </div>
274:               </section>
275:             </div>
276: 
277:             <div className="space-y-6">
278:               <section className="sticky top-24 rounded-lg bg-primary p-6 text-white shadow-xl shadow-primary/20 animate-in-smart" style={{ animationDelay: "300ms" }}>
279:                 <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-tight">
280:                   <CheckCircle className="h-4 w-4" />
281:                   Order Summary
282:                 </h3>
283: 
284:                 <div className="space-y-4 text-xs">
285:                   {submitError ? (
286:                     <Alert className="border-destructive/20 bg-destructive/5 text-foreground">
287:                       <AlertTitle>Cannot create yet</AlertTitle>
288:                       <AlertDescription>
289:                         {submitError}
290:                         {validationErrors.length > 0 ? (
291:                           <ul className="mt-2 list-disc space-y-1 pl-5">
292:                             {validationErrors.slice(0, 5).map((error) => (
293:                               <li key={error}>{error}</li>
294:                             ))}
295:                           </ul>
296:                         ) : null}
297:                       </AlertDescription>
298:                     </Alert>
299:                   ) : null}
300: 
301:                   <div className="space-y-2 border-b border-white/20 pb-4">
302:                     <div className="flex justify-between italic opacity-80">
303:                       <span>Total Items</span>
304:                       <span>{items.length} items</span>
305:                     </div>
306:                     <div className="flex justify-between font-bold">
307:                       <span>Total Qty</span>
308:                       <span>{totalQuantity} qty</span>
309:                     </div>
310:                     <div className="flex justify-between font-bold">
311:                       <span>Campaign</span>
312:                       <span className="ml-4 truncate">{campaignName || "Sunscreen Q2..."}</span>
313:                     </div>
314:                   </div>
315: 
316:                   <div className="space-y-1.5">
317:                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Destination</p>
318:                     <p className="font-medium">
319:                       {salesPoint.wcode} - {salesPoint.salesPoint}
320:                     </p>
321:                     <p className="text-[10px] uppercase tracking-widest opacity-70">
322:                       Client: {salesPointClient?.clientName ?? "Unbound"} · {salesPointClient?.clientEntityName ?? "No entity"}
323:                     </p>
324:                   </div>
325: 
326:                   <button
327:                     onClick={handleSubmit}
328:                     disabled={isSubmitting}
329:                     className="mt-4 w-full rounded-md bg-white py-3 text-xs font-bold uppercase tracking-widest text-primary shadow-md shadow-black/10 transition-all hover:bg-slate-50 disabled:opacity-70 btn-press"
330:                   >
331:                     {isSubmitting ? "Creating..." : "Create Order Request"}
332:                   </button>
333:                   <p className="text-center text-[10px] italic opacity-70">By clicking create, the order will be sent to the admin for review.</p>
334:                 </div>
335:               </section>
336:             </div>
337:           </div>
338:         </main>
339:       </ContentArea>
340:     </div>
341:   );
342: }
343: 
344: function FormInput({
345:   id,
346:   label,
347:   placeholder,
348:   required = false,
349:   value,
350:   onChange,
351: }: {
352:   id: string;
353:   label: string;
354:   placeholder: string;
355:   required?: boolean;
356:   value: string;
357:   onChange: (value: string) => void;
358: }) {
359:   return (
360:     <div className="space-y-1.5">
361:       <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor={id}>
362:         {label} {required && "*"}
363:       </label>
364:       <input
365:         id={id}
366:         type="text"
367:         value={value}
368:         onChange={(event) => onChange(event.target.value)}
369:         placeholder={placeholder}
370:         className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
371:       />
372:     </div>
373:   );
374: }

(End of file - total 374 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx</path>
<type>file</type>
<content>
1: import { useMemo, useState, type ReactNode } from "react";
2: import { useParams, Link } from "react-router-dom";
3: import {
4:   ArrowUpRight,
5:   ArrowRight,
6:   Calendar,
7:   CheckCircle2,
8:   ClipboardList,
9:   Package,
10:   Printer,
11:   Save,
12:   Send,
13:   Truck,
14:   XCircle,
15:   ChevronDown,
16:   AlertTriangle,
17:   Play,
18:   RotateCcw,
19: } from "lucide-react";
20: 
21: import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
22: import { ContentArea } from "@/components/layout/ContentArea";
23: import { Header } from "@/components/layout/Header";
24: import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
25: import { Badge } from "@/components/ui/badge";
26: import { Button } from "@/components/ui/button";
27: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
28: import { Progress } from "@/components/ui/progress";
29: import { StatusBadge } from "@/components/ui/StatusBadge";
30: import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
31: import { Textarea } from "@/components/ui/textarea";
32: import { generateDeliveryNote } from "@/lib/deliveryNote";
33: import { getBaseOrderStatus, getOrderRequestStatus } from "@/lib/orderStatus";
34: import { resolveQuantityComplaint, upsertOrder, useOrders } from "@/lib/orderStore";
35: import { cn } from "@/lib/utils";
36: import type { OrderStatus } from "@/components/ui/StatusBadge";
37: 
38: interface VendorUpdateProgressProps {
39:   role?: UserRole;
40: }
41: 
42: const STAGE_FLOW: OrderStatus[] = [
43:   "Created",
44:   "Accepted",
45:   "In Production",
46:   "Ready to Ship",
47:   "On Delivery",
48:   "Delivered",
49:   "Completed",
50: ];
51: 
52: function getStageIndex(status: string): number {
53:   return STAGE_FLOW.indexOf(status as OrderStatus);
54: }
55: 
56: export function VendorUpdateProgress({ role = "vendor" }: VendorUpdateProgressProps) {
57:   const { id } = useParams();
58:   const orders = useOrders();
59:   const order = orders.find((entry) => entry.id === id) ?? orders[0];
60:   const deliveryNote = generateDeliveryNote(order);
61:   const deliverySnapshot = deliveryNote.deliverySnapshot;
62:   const fulfillmentStatus = getBaseOrderStatus(order.status);
63:   const totalOrdered = getTotalQuantity(order);
64:   const totalDelivered = deliveryNote.lines.reduce((total, line) => total + line.deliveredQty, 0);
65:   const totalOutstanding = deliveryNote.lines.reduce((total, line) => total + line.outstandingQty, 0);
66:   const backPath = `/${role}/orders`;
67: 
68:   const complaint = order.complaint;
69:   const complaintSummary = useMemo(() => {
70:     if (!complaint) return null;
71:     const totalRequested = complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0);
72:     const totalActual = complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0);
73:     const totalDelta = complaint.items.reduce((total, item) => total + item.deltaQty, 0);
74:     return { totalRequested, totalActual, totalDelta };
75:   }, [complaint]);
76: 
77:   const [vendorNote, setVendorNote] = useState("");
78: 
79:   const stageDistribution = useMemo(() => {
80:     const counts: Record<string, number> = {};
81:     order.items.forEach((item) => {
82:       counts[item.status] = (counts[item.status] || 0) + 1;
83:     });
84:     return counts;
85:   }, [order]);
86: 
87:   const lowestStage = useMemo(() => {
88:     const stages = order.items.map((item) => getStageIndex(item.status));
89:     return Math.min(...stages);
90:   }, [order]);
91: 
92:   const highestStage = useMemo(() => {
93:     const stages = order.items.map((item) => getStageIndex(item.status));
94:     return Math.max(...stages);
95:   }, [order]);
96: 
97:   const advanceToProduction = () => {
98:     const updatedItems = order.items.map((item) => {
99:       const idx = getStageIndex(item.status);
100:       if (idx < getStageIndex("In Production")) {
101:         return { ...item, status: "In Production" as const };
102:       }
103:       return item;
104:     });
105:     upsertOrder({
106:       ...order,
107:       items: updatedItems,
108:       status: getOrderRequestStatus(updatedItems),
109:     } as any);
110:   };
111: 
112:   const advanceToReadyToShip = () => {
113:     const updatedItems = order.items.map((item) => {
114:       const idx = getStageIndex(item.status);
115:       if (idx < getStageIndex("Ready to Ship")) {
116:         return { ...item, status: "Ready to Ship" as const };
117:       }
118:       return item;
119:     });
120:     upsertOrder({
121:       ...order,
122:       items: updatedItems,
123:       status: getOrderRequestStatus(updatedItems),
124:     } as any);
125:   };
126: 
127:   const advanceToOnDelivery = () => {
128:     const updatedItems = order.items.map((item) => {
129:       const idx = getStageIndex(item.status);
130:       if (idx < getStageIndex("On Delivery")) {
131:         return { ...item, status: "On Delivery" as const };
132:       }
133:       return item;
134:     });
135:     upsertOrder({
136:       ...order,
137:       items: updatedItems,
138:       status: getOrderRequestStatus(updatedItems),
139:     } as any);
140:   };
141: 
142:   const advanceToDelivered = () => {
143:     const updatedItems = order.items.map((item) => {
144:       const idx = getStageIndex(item.status);
145:       if (idx < getStageIndex("Delivered")) {
146:         return { ...item, status: "Delivered" as const };
147:       }
148:       return item;
149:     });
150:     upsertOrder({
151:       ...order,
152:       items: updatedItems,
153:       status: getOrderRequestStatus(updatedItems),
154:     } as any);
155:   };
156: 
157:   const handleComplaintDecision = (decision: "approved" | "rejected") => {
158:     if (!complaint) return;
159:     resolveQuantityComplaint(order.id, {
160:       decision,
161:       reviewedBy: "Vendor Admin",
162:       reviewNote:
163:         vendorNote.trim() ||
164:         (decision === "approved"
165:           ? "Vendor approved the quantity revision."
166:           : "Vendor rejected the quantity revision."),
167:     });
168:   };
169: 
170:   const canAdvanceToProduction = lowestStage < getStageIndex("In Production");
171:   const canAdvanceToReadyToShip = lowestStage < getStageIndex("Ready to Ship");
172:   const canAdvanceToOnDelivery = lowestStage < getStageIndex("On Delivery");
173:   const canAdvanceToDelivered = lowestStage < getStageIndex("Delivered");
174: 
175:   const headerActions = (
176:     <>
177:       <Button asChild size="sm">
178:         <Link to={`/${role}/orders/${order.id}/delivery-note`}>
179:           <Printer className="h-4 w-4" />
180:           Delivery Note
181:         </Link>
182:       </Button>
183:       <Button asChild variant="outline" size="sm">
184:         <Link to={`/${role}/orders/${order.id}/packaging-labels`}>
185:           <Package className="h-4 w-4" />
186:           Labels
187:         </Link>
188:       </Button>
189:     </>
190:   );
191: 
192:   return (
193:     <div className="flex min-h-screen bg-background">
194:       <Sidebar role={role} />
195:       <ContentArea>
196:         <Header
197:           title={order.id}
198:           breadcrumbs={[
199:             { label: "All Orders", to: backPath },
200:             { label: order.id },
201:           ]}
202:           actions={headerActions}
203:         />
204: 
205:         <main className="p-4 sm:p-6 lg:p-8">
206:           <div className="mx-auto max-w-[1280px]">
207:             <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_389px]">
208:               <div className="space-y-6">
209:                 <Card className="border-border/70 shadow-sm">
210:                   <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/20">
211:                     <div className="flex flex-wrap items-center gap-2">
212:                       <StatusBadge status={order.status} />
213:                       <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.24em]">
214:                         OR Reference: {order.id}
215:                       </Badge>
216:                     </div>
217:                     <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
218:                       <Calendar className="h-4 w-4" />
219:                       Created: {order.createdDate}
220:                     </div>
221:                   </CardHeader>
222:                   <CardContent className="p-0">
223:                     <div className="flex items-start justify-between gap-4 px-6 py-6">
224:                       <div>
225:                         <CardTitle className="text-base">Order Information</CardTitle>
226:                         <CardDescription>Manage fulfillment progress for this order.</CardDescription>
227:                       </div>
228:                       {deliveryNote.missingRequiredFields.length > 0 ? (
229:                         <Badge variant="warning" className="rounded-full uppercase tracking-[0.24em]">
230:                           {deliveryNote.missingRequiredFields.length} missing field(s)
231:                         </Badge>
232:                       ) : (
233:                         <Badge variant="success" className="rounded-full uppercase tracking-[0.24em]">
234:                           Ready for print
235:                         </Badge>
236:                       )}
237:                     </div>
238: 
239:                     {deliveryNote.missingRequiredFields.length > 0 ? (
240:                       <div className="border-t border-border/70 px-6 py-4">
241:                         <Alert className="border-warning/30 bg-warning/10">
242:                           <AlertTitle>Missing data before print</AlertTitle>
243:                           <AlertDescription>Complete: {deliveryNote.missingRequiredFields.join(", ")}.</AlertDescription>
244:                         </Alert>
245:                       </div>
246:                     ) : null}
247: 
248:                     <div className="border-t border-border/70 divide-y divide-border/70">
249:                       <DetailRow label="Supplier" value={<span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">{order.supplier}<ArrowUpRight className="h-3.5 w-3.5 text-primary" /></span>} />
250:                       <DetailRow label="Customer PO Ref" value={<span className="text-sm font-medium text-foreground">{order.clientPO}</span>} />
251:                       <DetailRow label="Destination" value={<span className="text-sm font-medium text-foreground">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />
252:                       <DetailRow label="Deadline" value={<span className={cn("text-sm font-medium", order.deadline === "Overdue" ? "text-destructive" : "text-foreground")}>{order.deadline}</span>} />
253:                       <DetailRow label="Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.projectName}</span>} />
254:                       <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber}</span>} />
255:                       <DetailRow label="PIC Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.picProject}</span>} />
256:                       <DetailRow label="Deliver to" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.deliveryCompanyName}</span>} />
257:                       <DetailRow label="Address" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.address}</span>} />
258:                       <DetailRow label="PIC Client" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.picClient}</span>} />
259:                     </div>
260:                   </CardContent>
261:                 </Card>
262: 
263:                 <Card className="border-border/70 shadow-sm">
264:                   <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
265:                     <div>
266:                       <CardTitle className="text-base">Line Items</CardTitle>
267:                       <CardDescription>Item quantities and current fulfillment status</CardDescription>
268:                     </div>
269:                     <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
270:                       Total Qty: {totalOrdered}
271:                     </Badge>
272:                   </CardHeader>
273:                   <CardContent className="p-0">
274:                     <Table>
275:                       <TableHeader>
276:                         <TableRow>
277:                           <TableHead>Product Name</TableHead>
278:                           <TableHead>PO Line</TableHead>
279:                           <TableHead>Quantity</TableHead>
280:                           <TableHead>Delivered</TableHead>
281:                           <TableHead>Outstanding</TableHead>
282:                           <TableHead>Status</TableHead>
283:                         </TableRow>
284:                       </TableHeader>
285:                       <TableBody>
286:                         {order.items.map((item) => {
287:                           const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
288:                           return (
289:                             <TableRow key={item.id}>
290:                               <TableCell>
291:                                 <div>
292:                                   <p className="text-sm font-medium">{item.name}</p>
293:                                   <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.productCode}</p>
294:                                 </div>
295:                               </TableCell>
296:                               <TableCell className="font-mono text-sm">{item.poLineNumber}</TableCell>
297:                               <TableCell className="text-sm">{item.quantity} Qty</TableCell>
298:                               <TableCell className="text-sm">{deliveryLine?.deliveredQty ?? 0} Qty</TableCell>
299:                               <TableCell className="text-sm">{deliveryLine?.outstandingQty ?? item.quantity} Qty</TableCell>
300:                               <TableCell className="text-sm font-medium">{item.status}</TableCell>
301:                             </TableRow>
302:                           );
303:                         })}
304:                       </TableBody>
305:                     </Table>
306:                   </CardContent>
307:                 </Card>
308: 
309:                 <Card className="border-border/70 shadow-sm">
310:                   <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
311:                     <div>
312:                       <CardTitle className="text-base">Bulk Fulfillment Update</CardTitle>
313:                       <CardDescription>Advance all items through the fulfillment pipeline.</CardDescription>
314:                     </div>
315:                   </CardHeader>
316:                   <CardContent className="p-6 space-y-5">
317:                     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
318:                       <StageAdvanceButton
319:                         label="In Production"
320:                         icon={Play}
321:                         count={stageDistribution["In Production"] ?? 0}
322:                         disabled={!canAdvanceToProduction}
323:                         onClick={advanceToProduction}
324:                       />
325:                       <StageAdvanceButton
326:                         label="Ready to Ship"
327:                         icon={Package}
328:                         count={stageDistribution["Ready to Ship"] ?? 0}
329:                         disabled={!canAdvanceToReadyToShip}
330:                         onClick={advanceToReadyToShip}
331:                       />
332:                       <StageAdvanceButton
333:                         label="On Delivery"
334:                         icon={Truck}
335:                         count={stageDistribution["On Delivery"] ?? 0}
336:                         disabled={!canAdvanceToOnDelivery}
337:                         onClick={advanceToOnDelivery}
338:                       />
339:                       <StageAdvanceButton
340:                         label="Delivered"
341:                         icon={CheckCircle2}
342:                         count={stageDistribution["Delivered"] ?? 0}
343:                         disabled={!canAdvanceToDelivered}
344:                         onClick={advanceToDelivered}
345:                       />
346:                     </div>
347: 
348:                     <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
349:                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
350:                         <RotateCcw className="h-3.5 w-3.5" />
351:                         <span>Stage distribution:</span>
352:                       </div>
353:                       <div className="flex flex-wrap gap-2">
354:                         {STAGE_FLOW.filter((s) => s !== "Completed").map((stage) => {
355:                           const count = stageDistribution[stage] ?? 0;
356:                           if (count === 0) return null;
357:                           return (
358:                             <Badge key={stage} variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.2em]">
359:                               {stage}: {count}
360:                             </Badge>
361:                           );
362:                         })}
363:                       </div>
364:                     </div>
365:                   </CardContent>
366:                 </Card>
367: 
368:                 <Card className="border-border/70 shadow-sm">
369:                   <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
370:                     <div>
371:                       <CardTitle className="text-base">Fulfillment Progress</CardTitle>
372:                       <CardDescription>Overall progress across all stages</CardDescription>
373:                     </div>
374:                     <Button variant="ghost" size="sm" className="gap-1 px-0">
375:                       <ChevronDown className="h-4 w-4" />
376:                       {order.items.length} Items
377:                     </Button>
378:                   </CardHeader>
379:                   <CardContent className="p-6 space-y-4">
380:                     {STAGE_FLOW.filter((s) => s !== "Created" && s !== "Accepted" && s !== "Completed").map((stage) => {
381:                       const atStage = stageDistribution[stage] ?? 0;
382:                       return (
383:                         <ProgressRow
384:                           key={stage}
385:                           label={stage}
386:                           current={atStage}
387:                           total={order.items.length}
388:                           opacity={getStageIndex(stage) > highestStage}
389:                         />
390:                       );
391:                     })}
392:                   </CardContent>
393:                 </Card>
394: 
395:                 <Card className="border-border/70 shadow-sm">
396:                   <CardHeader className="border-b bg-muted/20">
397:                     <CardTitle className="text-base">Timeline Tracking</CardTitle>
398:                     <CardDescription>Workflow events for this order request</CardDescription>
399:                   </CardHeader>
400:                   <CardContent className="space-y-6 p-6">
401:                     <TimelineItem status="Created" actor="CUSTOMER (Brand Manager)" date={formatDateLabel(order.createdDate)} time={formatTimeLabel(order.createdDate)} isLast={false} />
402:                     <TimelineItem status="Accepted" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(order.items[0]?.status) >= getStageIndex("Accepted")} />
403:                     <TimelineItem status="In Production" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(order.items[0]?.status) >= getStageIndex("In Production")} />
404:                     <TimelineItem status="Ready to Ship" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(order.items[0]?.status) >= getStageIndex("Ready to Ship")} />
405:                     <TimelineItem status="On Delivery" actor="VENDOR (Supplier)" date={order.createdDate} time="-" active={getStageIndex(order.items[0]?.status) >= getStageIndex("On Delivery")} />
406:                     <TimelineItem status="Delivered" actor="VENDOR (Supplier)" date={order.createdDate} time="-" isLast active={getStageIndex(order.items[0]?.status) >= getStageIndex("Delivered")} />
407:                   </CardContent>
408:                 </Card>
409:               </div>
410: 
411:               <div className="space-y-6 xl:sticky xl:top-[73px] xl:self-start">
412:                 <Card className="border-border/70 shadow-sm">
413:                   <CardContent className="p-6">
414:                     <div className="grid gap-4">
415:                       <AlignmentStat label="Ordered Qty" value={`${totalOrdered} pcs`} />
416:                       <AlignmentStat label="Delivered Qty" value={`${totalDelivered} pcs`} />
417:                       <AlignmentStat label="Outstanding Qty" value={`${totalOutstanding} pcs`} />
418:                     </div>
419:                   </CardContent>
420:                 </Card>
421: 
422:                 <Card className="border-border/70 shadow-sm">
423:                   <CardHeader className="border-b bg-muted/20">
424:                     <CardTitle className="text-base">Fulfillment Summary</CardTitle>
425:                     <CardDescription>Current completion rates</CardDescription>
426:                   </CardHeader>
427:                   <CardContent className="space-y-4 p-6">
428:                     <SummaryStat
429:                       label="In Production"
430:                       current={stageDistribution["In Production"] ?? 0}
431:                       total={order.items.length}
432:                       color="bg-primary"
433:                     />
434:                     <SummaryStat
435:                       label="Ready to Ship"
436:                       current={stageDistribution["Ready to Ship"] ?? 0}
437:                       total={order.items.length}
438:                       color="bg-processing"
439:                     />
440:                     <SummaryStat
441:                       label="On Delivery"
442:                       current={stageDistribution["On Delivery"] ?? 0}
443:                       total={order.items.length}
444:                       color="bg-processing"
445:                     />
446:                     <SummaryStat
447:                       label="Delivered"
448:                       current={stageDistribution["Delivered"] ?? 0}
449:                       total={order.items.length}
450:                       color="bg-success"
451:                     />
452:                   </CardContent>
453:                 </Card>
454: 
455:                 <Card className="border-border/70 shadow-sm">
456:                   <CardHeader className="border-b bg-muted/20">
457:                     <CardTitle className="text-base">Internal Notes</CardTitle>
458:                   </CardHeader>
459:                   <CardContent className="p-6">
460:                     <p className="text-sm italic leading-6 text-muted-foreground">
461:                       {order.note?.trim() || "No internal notes for this order."}
462:                     </p>
463:                   </CardContent>
464:                 </Card>
465: 
466:                 {complaint ? (
467:                   <Card className="border-border/70 shadow-sm">
468:                     <CardHeader className="border-b bg-muted/20">
469:                       <CardTitle className="text-base">Complaint Review</CardTitle>
470:                       <CardDescription>Approve or reject the PMG quantity revision.</CardDescription>
471:                     </CardHeader>
472:                     <CardContent className="space-y-4 p-6">
473:                       <div className="flex items-center justify-between gap-3">
474:                         <div>
475:                           <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint ID</p>
476:                           <p className="mt-1 text-sm font-medium">{complaint.id}</p>
477:                         </div>
478:                         <StatusChip status={complaint.status} />
479:                       </div>
480: 
481:                       {complaintSummary ? (
482:                         <div className="grid gap-3 md:grid-cols-2">
483:                           <MiniStat label="Requested Qty" value={`${complaintSummary.totalRequested} pcs`} />
484:                           <MiniStat label="Actual Received" value={`${complaintSummary.totalActual} pcs`} />
485:                           <MiniStat label="Delta" value={`${complaintSummary.totalDelta} pcs`} />
486:                         </div>
487:                       ) : null}
488: 
489:                       <div className="space-y-2">
490:                         {complaint.items.map((item) => (
491:                           <div key={item.lineId} className="rounded-lg border border-border/60 bg-background p-3">
492:                             <div className="flex items-start justify-between gap-4">
493:                               <div>
494:                                 <p className="text-sm font-medium">{item.productName}</p>
495:                                 <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber}</p>
496:                               </div>
497:                               <div className="text-right text-xs text-muted-foreground">
498:                                 <p>Delivered: {item.systemDeliveredQty} pcs</p>
499:                                 <p>Actual: {item.actualReceivedQty} pcs</p>
500:                               </div>
501:                             </div>
502:                             <p className="mt-2 text-xs font-medium text-destructive">Missing {item.deltaQty} pcs</p>
503:                           </div>
504:                         ))}
505:                       </div>
506: 
507:                       <div className="space-y-2">
508:                         <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Remarks</p>
509:                         <p className="text-sm text-muted-foreground">{complaint.remarks}</p>
510:                       </div>
511: 
512:                       <Textarea
513:                         value={vendorNote}
514:                         onChange={(event) => setVendorNote(event.target.value)}
515:                         placeholder="Add vendor review note before approval or rejection."
516:                       />
517: 
518:                       {complaint.status === "pending" ? (
519:                         <div className="flex flex-col gap-3 sm:flex-row">
520:                           <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleComplaintDecision("rejected")}>
521:                             <XCircle className="h-4 w-4" />
522:                             Reject
523:                           </Button>
524:                           <Button className="w-full sm:w-auto" onClick={() => handleComplaintDecision("approved")}>
525:                             <CheckCircle2 className="h-4 w-4" />
526:                             Approve
527:                           </Button>
528:                         </div>
529:                       ) : (
530:                         <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
531:                           This complaint has already been reviewed.
532:                         </div>
533:                       )}
534:                     </CardContent>
535:                   </Card>
536:                 ) : null}
537:               </div>
538:             </div>
539:           </div>
540:         </main>
541:       </ContentArea>
542:     </div>
543:   );
544: }
545: 
546: function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
547:   return order.items.reduce((total, item) => total + item.quantity, 0);
548: }
549: 
550: function formatDateLabel(value: string) {
551:   if (!value) return "";
552:   return new Date(value).toLocaleDateString("en-US", {
553:     month: "long",
554:     day: "2-digit",
555:     year: "numeric",
556:   });
557: }
558: 
559: function formatTimeLabel(value: string) {
560:   if (!value) return "";
561:   return new Date(value).toLocaleTimeString("en-US", {
562:     hour: "2-digit",
563:     minute: "2-digit",
564:   });
565: }
566: 
567: function DetailRow({ label, value }: { label: string; value: ReactNode }) {
568:   return (
569:     <div className="flex items-start gap-4 px-6 py-3">
570:       <p className="w-32 text-sm text-muted-foreground shrink-0">{label}</p>
571:       <div className="flex-1 min-w-0 space-y-1">
572:         <div>{value}</div>
573:       </div>
574:     </div>
575:   );
576: }
577: 
578: function AlignmentStat({ label, value }: { label: string; value: string }) {
579:   return (
580:     <div className="rounded-lg border border-border/60 bg-background p-4">
581:       <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
582:       <p className="mt-2 text-sm font-semibold">{value}</p>
583:     </div>
584:   );
585: }
586: 
587: function MiniStat({ label, value }: { label: string; value: string }) {
588:   return (
589:     <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
590:       <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
591:       <p className="mt-1 text-sm font-medium">{value}</p>
592:     </div>
593:   );
594: }
595: 
596: function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
597:   const config =
598:     status === "approved"
599:       ? { icon: CheckCircle2, label: "Approved", className: "border-success/30 bg-success/10 text-success" }
600:       : status === "rejected"
601:         ? { icon: XCircle, label: "Rejected", className: "border-destructive/30 bg-destructive/10 text-destructive" }
602:         : { icon: ClipboardList, label: "Pending", className: "border-warning/30 bg-warning/10 text-warning" };
603:   const Icon = config.icon;
604: 
605:   return (
606:     <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]", config.className)}>
607:       <Icon className="h-3.5 w-3.5" />
608:       {config.label}
609:     </span>
610:   );
611: }
612: 
613: function SummaryStat({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
614:   const percentage = total > 0 ? (current / total) * 100 : 0;
615:   return (
616:     <div className="space-y-1.5">
617:       <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.24em]">
618:         <span className="text-muted-foreground">{label}</span>
619:         <span className={cn("font-bold", color.replace("bg-", "text-"))}>{current}/{total}</span>
620:       </div>
621:       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-border/50">
622:         <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
623:       </div>
624:     </div>
625:   );
626: }
627: 
628: function ProgressRow({ label, current, total, opacity = false }: { label: string; current: number; total: number; opacity?: boolean }) {
629:   const percentage = total > 0 ? (current / total) * 100 : 0;
630:   return (
631:     <div className={cn("space-y-1.5", opacity && "opacity-40")}>
632:       <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.24em]">
633:         <span>{label}</span>
634:         <span>{current}/{total}</span>
635:       </div>
636:       <Progress value={percentage} className="h-2" />
637:     </div>
638:   );
639: }
640: 
641: function TimelineItem({ status, actor, date, time, note, isLast = false, active = false }: { status: string; actor: string; date: string; time: string; note?: string; isLast?: boolean; active?: boolean }) {
642:   return (
643:     <div className="relative pl-8">
644:       <div className={cn("absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background shadow-sm", active ? "bg-primary" : "bg-border")} />
645:       {!isLast ? <div className="absolute left-2.5 top-6 h-full w-px bg-border" /> : null}
646:       <div className="space-y-1">
647:         <div className="flex items-center justify-between">
648:           <p className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>{status}</p>
649:           <span className="text-xs text-muted-foreground">{time}</span>
650:         </div>
651:         <p className="text-xs text-muted-foreground">{actor}</p>
652:         <p className="text-xs text-muted-foreground">{date}</p>
653:         {note ? <p className="mt-1 text-xs font-medium italic text-primary">"{note}"</p> : null}
654:       </div>
655:     </div>
656:   );
657: }
658: 
659: function StageAdvanceButton({
660:   label,
661:   icon: Icon,
662:   count,
663:   disabled,
664:   onClick,
665: }: {
666:   label: string;
667:   icon: React.ComponentType<{ className?: string }>;
668:   count: number;
669:   disabled: boolean;
670:   onClick: () => void;
671: }) {
672:   return (
673:     <Button
674:       variant="outline"
675:       disabled={disabled}
676:       onClick={onClick}
677:       className="flex-col h-auto gap-1.5 py-4"
678:     >
679:       <Icon className="h-5 w-5" />
680:       <span className="text-xs font-semibold">{label}</span>
681:       <span className="text-[10px] text-muted-foreground font-mono">{count} items</span>
682:     </Button>
683:   );
684: }

(End of file - total 684 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/OrderDetail.tsx"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/OrderDetail.tsx</path>
<type>file</type>
<content>
1: import { useMemo, useState, type ReactNode } from "react";
2: import { useParams, Link } from "react-router-dom";
3: import {
4:   ArrowUpRight,
5:   Calendar,
6:   ClipboardList,
7:   CheckCircle2,
8:   Edit3,
9:   Package,
10:   Printer,
11:   Send,
12:   Trash2,
13:   XCircle,
14:   ChevronDown,
15:   AlertTriangle,
16: } from "lucide-react";
17: 
18: import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
19: import { ContentArea } from "@/components/layout/ContentArea";
20: import { Header } from "@/components/layout/Header";
21: import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
22: import { Badge } from "@/components/ui/badge";
23: import { Button } from "@/components/ui/button";
24: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
25: import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
26: import { Input } from "@/components/ui/input";
27: import { Progress } from "@/components/ui/progress";
28: import { StatusBadge } from "@/components/ui/StatusBadge";
29: import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
30: import { generateDeliveryNote } from "@/lib/deliveryNote";
31: import { getBaseOrderStatus } from "@/lib/orderStatus";
32: import { raiseQuantityComplaint, useOrders } from "@/lib/orderStore";
33: import { cn } from "@/lib/utils";
34: import { Textarea } from "@/components/ui/textarea";
35: 
36: interface OrderDetailProps {
37:   role?: UserRole;
38: }
39: 
40: export function OrderDetail({ role = "admin" }: OrderDetailProps) {
41:   const { id } = useParams();
42:   const orders = useOrders();
43:   const order = orders.find((entry) => entry.id === id) ?? orders[0];
44:   const deliveryNote = generateDeliveryNote(order);
45:   const deliverySnapshot = deliveryNote.deliverySnapshot;
46:   const fulfillmentStatus = getBaseOrderStatus(order.status);
47:   const totalOrdered = getTotalQuantity(order);
48:   const totalDelivered = deliveryNote.lines.reduce((total, line) => total + line.deliveredQty, 0);
49:   const totalOutstanding = deliveryNote.lines.reduce((total, line) => total + line.outstandingQty, 0);
50:   const backPath = role === "admin" ? "/admin/orders" : `/${role}/orders`;
51:   const deliveryNotePath = role === "admin" ? `/admin/orders/${order.id}/delivery-note` : `/${role}/orders/${order.id}/delivery-note`;
52:   const packagingLabelsPath = role === "admin" ? `/admin/orders/${order.id}/packaging-labels` : `/${role}/orders/${order.id}/packaging-labels`;
53:   const complaint = order.complaint;
54:   const canRaiseComplaint = role === "admin" || role === "operator";
55:   const complaintItems = useMemo(
56:     () =>
57:       order.items.map((item) => {
58:         const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
59: 
60:         return {
61:           id: item.id,
62:           productName: item.name,
63:           poLineNumber: item.poLineNumber,
64:           orderedQty: item.quantity,
65:           systemDeliveredQty: deliveryLine?.deliveredQty ?? item.deliveredQuantity ?? 0,
66:           actualReceivedQty: complaint?.items.find((entry) => entry.lineId === item.id)?.actualReceivedQty ?? deliveryLine?.deliveredQty ?? item.deliveredQuantity ?? 0,
67:         };
68:       }),
69:     [complaint?.items, deliveryNote.lines, order.items],
70:   );
71:   const [isComplaintDialogOpen, setIsComplaintDialogOpen] = useState(false);
72:   const [complaintRemarks, setComplaintRemarks] = useState("");
73:   const [complaintDraftItems, setComplaintDraftItems] = useState(complaintItems);
74:   const complaintLocked = complaint?.status === "pending";
75: 
76:   const complaintSummary = useMemo(() => {
77:     if (!complaint) {
78:       return null;
79:     }
80: 
81:     const totalRequested = complaint.items.reduce((total, item) => total + item.systemDeliveredQty, 0);
82:     const totalActual = complaint.items.reduce((total, item) => total + item.actualReceivedQty, 0);
83:     const totalDelta = complaint.items.reduce((total, item) => total + item.deltaQty, 0);
84: 
85:     return { totalRequested, totalActual, totalDelta };
86:   }, [complaint]);
87: 
88:   const openComplaintDialog = () => {
89:     setComplaintDraftItems(complaintItems.map((item) => ({ ...item })));
90:     setComplaintRemarks(complaint?.remarks ?? "");
91:     setIsComplaintDialogOpen(true);
92:   };
93: 
94:   const submitComplaint = () => {
95:     raiseQuantityComplaint(order.id, {
96:       createdBy: role === "admin" ? "Admin / PMG" : "PMG User",
97:       remarks: complaintRemarks.trim() || "Delivery quantity discrepancy reported by PMG.",
98:       items: complaintDraftItems.map((item) => ({
99:         lineId: item.id,
100:         actualReceivedQty: item.actualReceivedQty,
101:       })),
102:     });
103:     setIsComplaintDialogOpen(false);
104:   };
105: 
106:   const adjustComplaintItem = (index: number, delta: number) => {
107:     setComplaintDraftItems((current) =>
108:       current.map((currentItem, currentIndex) =>
109:         currentIndex === index
110:           ? {
111:               ...currentItem,
112:               actualReceivedQty: clampQuantity(currentItem.actualReceivedQty + delta, currentItem.orderedQty),
113:             }
114:           : currentItem,
115:       ),
116:     );
117:   };
118: 
119:   const complaintTimeline = complaint
120:     ? [
121:         {
122:           status: "Complaint Raised",
123:           actor: `${complaint.createdBy}`,
124:           date: formatDateLabel(complaint.createdAt),
125:           time: formatTimeLabel(complaint.createdAt),
126:           note: complaint.remarks,
127:           active: true,
128:         },
129:         ...(complaint.reviewedAt
130:           ? [
131:               {
132:                 status: complaint.status === "approved" ? "Vendor Approved Revision" : "Vendor Rejected Revision",
133:                 actor: complaint.reviewedBy ?? "Vendor",
134:                 date: formatDateLabel(complaint.reviewedAt),
135:                 time: formatTimeLabel(complaint.reviewedAt),
136:                 note: complaint.reviewNote,
137:                 active: complaint.status === "approved",
138:               },
139:             ]
140:           : []),
141:         ...(complaint.status === "approved" && complaintSummary
142:           ? [
143:               {
144:                 status: "Quantity Adjusted",
145:                 actor: "VA Trace System",
146:                 date: complaint.reviewedAt ? formatDateLabel(complaint.reviewedAt) : "",
147:                 time: complaint.reviewedAt ? formatTimeLabel(complaint.reviewedAt) : "",
148:                 note: `Delivered quantity updated from ${complaintSummary.totalRequested} to ${complaintSummary.totalActual}.`,
149:                 active: false,
150:               },
151:             ]
152:           : []),
153:       ]
154:     : [];
155: 
156:   const headerActions = (
157:     <>
158:       <Button asChild size="sm">
159:         <Link to={deliveryNotePath}>
160:           <Printer className="h-4 w-4" />
161:           Delivery Note
162:         </Link>
163:       </Button>
164:       <Button asChild variant="outline" size="sm">
165:         <Link to={packagingLabelsPath}>
166:           <Package className="h-4 w-4" />
167:           Labels
168:         </Link>
169:       </Button>
170:       <Button variant="outline" size="sm">
171:         <Edit3 className="h-4 w-4" />
172:         Edit
173:       </Button>
174:       <Button variant="destructive" size="sm">
175:         <Trash2 className="h-4 w-4" />
176:         Cancel
177:       </Button>
178:       {canRaiseComplaint ? (
179:         <Button onClick={openComplaintDialog} variant={complaint ? "outline" : "default"} size="sm">
180:           <AlertTriangle className="h-4 w-4" />
181:           {complaint ? "Review" : "Raise Complaint"}
182:         </Button>
183:       ) : null}
184:     </>
185:   );
186: 
187:   return (
188:     <div className="flex min-h-screen bg-background">
189:       <Sidebar role={role} />
190:       <ContentArea>
191:         <Header
192:           title={order.id}
193:           breadcrumbs={[
194:             { label: "All Orders", to: backPath },
195:             { label: order.id },
196:           ]}
197:           actions={headerActions}
198:         />
199: 
200:         <main className="p-4 sm:p-6 lg:p-8">
201:           <div className="mx-auto max-w-[1280px]">
202:             <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_389px]">
203:             <div className="space-y-6">
204:               <Card className="border-border/70 shadow-sm">
205:                 <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/20">
206:                   <div className="flex flex-wrap items-center gap-2">
207:                     <StatusBadge status={order.status} />
208:                     <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.24em]">
209:                       OR Reference: {order.id}
210:                     </Badge>
211:                   </div>
212:                   <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
213:                     <Calendar className="h-4 w-4" />
214:                     Created: {order.createdDate}
215:                   </div>
216:                 </CardHeader>
217:                 <CardContent className="p-0">
218:                   <div className="flex items-start justify-between gap-4 px-6 py-6">
219:                     <div className="flex items-center justify-between gap-3">
220:                       <div>
221:                         <CardTitle className="text-base">Order to Delivery Alignment</CardTitle>
222:                         <CardDescription>Values below are derived from the same data used by the delivery note.</CardDescription>
223:                       </div>
224:                       {deliveryNote.missingRequiredFields.length > 0 ? (
225:                         <Badge variant="warning" className="rounded-full uppercase tracking-[0.24em]">
226:                           {deliveryNote.missingRequiredFields.length} missing field(s)
227:                         </Badge>
228:                       ) : (
229:                         <Badge variant="success" className="rounded-full uppercase tracking-[0.24em]">
230:                           Ready for print
231:                         </Badge>
232:                       )}
233:                     </div>
234:                   </div>
235: 
236:                   {deliveryNote.missingRequiredFields.length > 0 ? (
237:                     <div className="border-t border-border/70 px-6 py-4">
238:                       <Alert className="border-warning/30 bg-warning/10">
239:                         <AlertTitle>Missing data before print</AlertTitle>
240:                         <AlertDescription>Complete: {deliveryNote.missingRequiredFields.join(", ")}.</AlertDescription>
241:                       </Alert>
242:                     </div>
243:                   ) : null}
244: 
245:                   <div className="border-t border-border/70 divide-y divide-border/70">
246:                     <DetailRow label="Supplier" value={<span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">{order.supplier}<ArrowUpRight className="h-3.5 w-3.5 text-primary" /></span>} />
247:                     <DetailRow label="Customer PO Ref" value={<span className="text-sm font-medium text-foreground">{order.clientPO}</span>} />
248:                     <DetailRow label="Destination" value={<span className="text-sm font-medium text-foreground">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />
249:                     <DetailRow label="Deadline" value={<span className={cn("text-sm font-medium", order.deadline === "Overdue" ? "text-destructive" : "text-foreground")}>{order.deadline}</span>} />
250:                     <DetailRow label="Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.projectName}</span>} />
251:                     <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber}</span>} />
252:                     <DetailRow label="PIC Project" value={<span className="text-sm font-medium text-foreground">{deliveryNote.picProject}</span>} />
253:                     <DetailRow label="Deliver to" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.deliveryCompanyName}</span>} />
254:                     <DetailRow label="Address" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.address}</span>} />
255:                     <DetailRow label="PIC Client" value={<span className="text-sm font-medium text-foreground">{deliverySnapshot.picClient}</span>} />
256:                   </div>
257: 
258:                   {complaint ? (
259:                     <div className="border-t border-border/70 bg-muted/20 px-6 py-4">
260:                       <div className="flex flex-wrap items-center justify-between gap-3">
261:                         <div>
262:                           <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint Revision</p>
263:                           <p className="mt-1 text-sm font-medium text-foreground">{complaint.id}</p>
264:                         </div>
265:                         <StatusChip status={complaint.status} />
266:                       </div>
267:                       <div className="mt-4 grid gap-3 md:grid-cols-3">
268:                         <AlignmentStat label="Requested Qty" value={`${complaintSummary?.totalRequested ?? 0} pcs`} />
269:                         <AlignmentStat label="Actual Received" value={`${complaintSummary?.totalActual ?? 0} pcs`} />
270:                         <AlignmentStat label="Delta" value={`${complaintSummary?.totalDelta ?? 0} pcs`} />
271:                       </div>
272:                       <p className="mt-3 text-sm text-muted-foreground">{complaint.remarks}</p>
273:                     </div>
274:                   ) : null}
275:                 </CardContent>
276:               </Card>
277: 
278:               <Card className="border-border/70 shadow-sm">
279:                 <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
280:                   <div>
281:                     <CardTitle className="text-base">Line Items</CardTitle>
282:                     <CardDescription>Item quantities and delivery status</CardDescription>
283:                   </div>
284:                   <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
285:                     Total Qty: {totalOrdered}
286:                   </Badge>
287:                 </CardHeader>
288:                 <CardContent className="p-0">
289:                   <Table>
290:                     <TableHeader>
291:                       <TableRow>
292:                         <TableHead>Product Name</TableHead>
293:                         <TableHead>PO Line</TableHead>
294:                         <TableHead>Quantity</TableHead>
295:                         <TableHead>Delivered</TableHead>
296:                         <TableHead>Outstanding</TableHead>
297:                         <TableHead>Status</TableHead>
298:                       </TableRow>
299:                     </TableHeader>
300:                     <TableBody>
301:                       {order.items.map((item) => {
302:                         const deliveryLine = deliveryNote.lines.find((line) => line.id === item.id);
303:                         return (
304:                           <TableRow key={item.id}>
305:                             <TableCell>
306:                               <div>
307:                                 <p className="text-sm font-medium">{item.name}</p>
308:                                 <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.productCode}</p>
309:                               </div>
310:                             </TableCell>
311:                             <TableCell className="font-mono text-sm">{item.poLineNumber}</TableCell>
312:                             <TableCell className="text-sm">{item.quantity} Qty</TableCell>
313:                             <TableCell className="text-sm">{deliveryLine?.deliveredQty ?? 0} Qty</TableCell>
314:                             <TableCell className="text-sm">{deliveryLine?.outstandingQty ?? item.quantity} Qty</TableCell>
315:                             <TableCell className="text-sm font-medium">{item.status}</TableCell>
316:                           </TableRow>
317:                         );
318:                       })}
319:                     </TableBody>
320:                   </Table>
321:                 </CardContent>
322:                 {(fulfillmentStatus === "In Production" || fulfillmentStatus === "Ready to Ship" || fulfillmentStatus === "Overdue") ? (
323:                   <CardContent className="border-t bg-muted/20 p-6">
324:                     <div className="mb-4 flex items-center justify-between">
325:                       <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Fulfillment Progress</h4>
326:                       <Button variant="ghost" size="sm" className="gap-1 px-0">
327:                         <ChevronDown className="h-4 w-4" />
328:                         8 Progress Logs
329:                       </Button>
330:                     </div>
331:                     <div className="space-y-4">
332:                       <ProgressRow label="In Production" current={200} total={750} />
333:                       <ProgressRow label="Ready to Ship" current={100} total={750} />
334:                       <ProgressRow label="On Delivery" current={0} total={750} opacity />
335:                       <ProgressRow label="Delivered" current={0} total={750} opacity />
336:                     </div>
337:                   </CardContent>
338:                 ) : null}
339:               </Card>
340: 
341:               <Card className="border-border/70 shadow-sm">
342:                 <CardHeader className="border-b bg-muted/20">
343:                   <CardTitle className="text-base">Timeline Tracking</CardTitle>
344:                   <CardDescription>Workflow events for this order request</CardDescription>
345:                 </CardHeader>
346:                 <CardContent className="space-y-6 p-6">
347:                   <TimelineItem status="Created" actor="CUSTOMER (Brand Manager)" date="June 01, 2026" time="14:30" isLast />
348:                   <TimelineItem status="Assigned" actor="ADMIN (Procurement Manager)" date="June 02, 2026" time="09:15" />
349:                   <TimelineItem status="Accepted" actor="VENDOR (Supplier)" date="June 02, 2026" time="11:45" />
350:                   {complaintTimeline.map((entry, index) => (
351:                     <TimelineItem
352:                       key={`${entry.status}-${index}`}
353:                       status={entry.status}
354:                       actor={entry.actor}
355:                       date={entry.date}
356:                       time={entry.time}
357:                       note={entry.note}
358:                       active={entry.active}
359:                     />
360:                   ))}
361:                   {fulfillmentStatus === "Ready to Ship" ? (
362:                     <TimelineItem
363:                       status="Ready to Ship"
364:                       actor="VENDOR"
365:                       date="June 05, 2026"
366:                       time="10:00"
367:                       note="Auto-advanced (partial progress)"
368:                       active
369:                     />
370:                   ) : null}
371:                 </CardContent>
372:               </Card>
373:             </div>
374: 
375:             <div className="space-y-6 xl:sticky xl:top-[73px] xl:self-start">
376:               <Card className="border-border/70 shadow-sm">
377:                 <CardContent className="p-6">
378:                   <div className="grid gap-4">
379:                     <AlignmentStat label="Ordered Qty" value={`${totalOrdered} pcs`} />
380:                     <AlignmentStat label="Delivered Qty" value={`${totalDelivered} pcs`} />
381:                     <AlignmentStat label="Outstanding Qty" value={`${totalOutstanding} pcs`} />
382:                   </div>
383:                 </CardContent>
384:               </Card>
385: 
386:               <Card className="border-border/70 shadow-sm">
387:                 <CardHeader className="border-b bg-muted/20">
388:                   <CardTitle className="text-base">Internal Notes</CardTitle>
389:                 </CardHeader>
390:                 <CardContent className="p-6">
391:                   <p className="text-sm italic leading-6 text-muted-foreground">
392:                     {order.note?.trim() || "No internal notes for this order."}
393:                   </p>
394:                 </CardContent>
395:               </Card>
396: 
397:               {complaint ? (
398:                 <Card className="border-border/70 shadow-sm">
399:                   <CardHeader className="border-b bg-muted/20">
400:                     <CardTitle className="text-base">Complaint Audit Trail</CardTitle>
401:                     <CardDescription>Recorded revision history for this order</CardDescription>
402:                   </CardHeader>
403:                   <CardContent className="space-y-3 p-6">
404:                     {complaint.history.map((entry) => (
405:                       <div key={entry.id} className="rounded-lg border border-border/60 bg-background p-3">
406:                         <div className="flex items-center justify-between gap-3">
407:                           <p className="text-sm font-medium">{entry.action.replace(/-/g, " ")}</p>
408:                           <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
409:                         </div>
410:                         <p className="mt-1 text-xs text-muted-foreground">{entry.actor}</p>
411:                         {entry.note ? <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p> : null}
412:                       </div>
413:                     ))}
414:                   </CardContent>
415:                 </Card>
416:               ) : null}
417: 
418:             </div>
419:           </div>
420:           </div>
421:         </main>
422:       </ContentArea>
423: 
424:       <Dialog open={isComplaintDialogOpen} onOpenChange={setIsComplaintDialogOpen}>
425:         <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
426:           <DialogHeader>
427:             <DialogTitle>{complaint ? "Complaint Review" : "Raise Quantity Complaint"}</DialogTitle>
428:             <DialogDescription>
429:               {complaint
430:                 ? "Review the submitted actual received quantities and vendor response."
431:                 : "Record the actual received quantity for each item before sending the revision request to vendor."}
432:             </DialogDescription>
433:           </DialogHeader>
434: 
435:           <div className="space-y-4">
436:             <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
437:               <div className="grid gap-3 md:grid-cols-2">
438:                 <div>
439:                   <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Order</p>
440:                   <p className="mt-1 text-sm font-medium">{order.id}</p>
441:                 </div>
442:                 <div>
443:                   <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Complaint Status</p>
444:                   <div className="mt-2">
445:                     <StatusChip status={complaint?.status ?? "pending"} />
446:                   </div>
447:                 </div>
448:               </div>
449:             </div>
450: 
451:             <div className="space-y-3">
452:               {complaintDraftItems.map((item, index) => (
453:                 <div key={item.id} className="rounded-xl border border-border/60 p-4">
454:                   <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
455:                     <div className="space-y-1">
456:                       <p className="text-sm font-medium">{item.productName}</p>
457:                       <p className="text-xs text-muted-foreground">PO Line {item.poLineNumber}</p>
458:                     </div>
459:                     <div className="grid gap-3 sm:grid-cols-3">
460:                       <MiniStat label="Ordered" value={`${item.orderedQty} pcs`} />
461:                       <MiniStat label="System Delivered" value={`${item.systemDeliveredQty} pcs`} />
462:                       <MiniStat label="Delta" value={`${Math.max(item.systemDeliveredQty - item.actualReceivedQty, 0)} pcs`} />
463:                     </div>
464:                   </div>
465: 
466:                   <div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
467:                     <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Actual Received Qty</p>
468:                     <Input
469:                       type="number"
470:                       min={0}
471:                       max={item.orderedQty}
472:                       value={item.actualReceivedQty}
473:                       disabled={complaintLocked}
474:                       onChange={(event) => {
475:                         const nextValue = Number(event.target.value) || 0;
476:                         setComplaintDraftItems((current) =>
477:                           current.map((currentItem, currentIndex) =>
478:                             currentIndex === index
479:                               ? {
480:                                   ...currentItem,
481:                                   actualReceivedQty: clampQuantity(nextValue, currentItem.orderedQty),
482:                                 }
483:                               : currentItem,
484:                           ),
485:                         );
486:                       }}
487:                     />
488:                   </div>
489:                   {!complaintLocked ? (
490:                     <div className="mt-3 flex flex-wrap gap-2">
491:                       <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -5)}>
492:                         -5
493:                       </Button>
494:                       <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, -1)}>
495:                         -1
496:                       </Button>
497:                       <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 1)}>
498:                         +1
499:                       </Button>
500:                       <Button type="button" variant="outline" size="sm" onClick={() => adjustComplaintItem(index, 5)}>
501:                         +5
502:                       </Button>
503:                     </div>
504:                   ) : null}
505:                 </div>
506:               ))}
507:             </div>
508: 
509:             <div className="space-y-2">
510:               <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Remarks</p>
511:               <Textarea
512:                 value={complaintRemarks}
513:                 disabled={complaintLocked}
514:                 onChange={(event) => setComplaintRemarks(event.target.value)}
515:                 placeholder="Explain the discrepancy and expected correction."
516:               />
517:             </div>
518:           </div>
519: 
520:           <DialogFooter className="gap-2 sm:gap-0">
521:             <Button variant="outline" onClick={() => setIsComplaintDialogOpen(false)}>
522:               Close
523:             </Button>
524:             {!complaintLocked ? (
525:               <Button onClick={submitComplaint}>
526:                 <Send className="h-4 w-4" />
527:                 Submit Complaint
528:               </Button>
529:             ) : null}
530:           </DialogFooter>
531:         </DialogContent>
532:       </Dialog>
533:     </div>
534:   );
535: }
536: 
537: function getTotalQuantity(order: { items: Array<{ quantity: number }> }) {
538:   return order.items.reduce((total, item) => total + item.quantity, 0);
539: }
540: 
541: function clampQuantity(value: number, max: number) {
542:   if (!Number.isFinite(value)) {
543:     return 0;
544:   }
545: 
546:   return Math.max(0, Math.min(Math.round(value), max));
547: }
548: 
549: function formatDateLabel(value: string) {
550:   return new Date(value).toLocaleDateString("en-US", {
551:     month: "long",
552:     day: "2-digit",
553:     year: "numeric",
554:   });
555: }
556: 
557: function formatTimeLabel(value: string) {
558:   return new Date(value).toLocaleTimeString("en-US", {
559:     hour: "2-digit",
560:     minute: "2-digit",
561:   });
562: }
563: 
564: function DetailRow({ label, value }: { label: string; value: ReactNode }) {
565:   return (
566:     <div className="flex items-start gap-4 px-6 py-3">
567:       <p className="w-32 text-sm text-muted-foreground shrink-0">{label}</p>
568:       <div className="flex-1 min-w-0 space-y-1">
569:         <div>{value}</div>
570:       </div>
571:     </div>
572:   );
573: }
574: 
575: function AlignmentStat({ label, value }: { label: string; value: string }) {
576:   return (
577:     <div className="rounded-lg border border-border/60 bg-background p-4">
578:       <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
579:       <p className="mt-2 text-sm font-semibold">{value}</p>
580:     </div>
581:   );
582: }
583: 
584: function MiniStat({ label, value }: { label: string; value: string }) {
585:   return (
586:     <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
587:       <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
588:       <p className="mt-1 text-sm font-medium">{value}</p>
589:     </div>
590:   );
591: }
592: 
593: function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
594:   const config =
595:     status === "approved"
596:       ? { icon: CheckCircle2, label: "Approved", className: "border-success/30 bg-success/10 text-success" }
597:       : status === "rejected"
598:         ? { icon: XCircle, label: "Rejected", className: "border-destructive/30 bg-destructive/10 text-destructive" }
599:         : { icon: ClipboardList, label: "Pending", className: "border-warning/30 bg-warning/10 text-warning" };
600:   const Icon = config.icon;
601: 
602:   return (
603:     <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]", config.className)}>
604:       <Icon className="h-3.5 w-3.5" />
605:       {config.label}
606:     </span>
607:   );
608: }
609: 
610: function ProgressRow({ label, current, total, opacity = false }: { label: string; current: number; total: number; opacity?: boolean }) {
611:   const percentage = (current / total) * 100;
612:   return (
613:     <div className={cn("space-y-1.5", opacity && "opacity-40")}>
614:       <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.24em]">
615:         <span>{label}</span>
616:         <span>{current}/{total}</span>
617:       </div>
618:       <Progress value={percentage} className="h-2" />
619:     </div>
620:   );
621: }
622: 
623: function TimelineItem({ status, actor, date, time, note, isLast = false, active = false }: { status: string; actor: string; date: string; time: string; note?: string; isLast?: boolean; active?: boolean }) {
624:   return (
625:     <div className="relative pl-8">
626:       <div className={cn("absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background shadow-sm", active ? "bg-primary" : "bg-border")} />
627:       {!isLast ? <div className="absolute left-2.5 top-6 h-full w-px bg-border" /> : null}
628:       <div className="space-y-1">
629:         <div className="flex items-center justify-between">
630:           <p className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>{status}</p>
631:           <span className="text-xs text-muted-foreground">{time}</span>
632:         </div>
633:         <p className="text-xs text-muted-foreground">{actor}</p>
634:         <p className="text-xs text-muted-foreground">{date}</p>
635:         {note ? <p className="mt-1 text-xs font-medium italic text-primary">“{note}”</p> : null}
636:       </div>
637:     </div>
638:   );
639: }

(End of file - total 639 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/VendorDashboard.tsx"
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/VendorDashboard.tsx</path>
<type>file</type>
<content>
1: import { useMemo, useState } from "react";
2: import { ArrowUpRight, Eye, Play } from "lucide-react";
3: import { Link } from "react-router-dom";
4: 
5: import { Sidebar } from "@/components/layout/Sidebar";
6: import { ContentArea } from "@/components/layout/ContentArea";
7: import { Header } from "@/components/layout/Header";
8: import { Badge } from "@/components/ui/badge";
9: import { Button } from "@/components/ui/button";
10: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
11: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
12: import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
13: import { StatusBadge } from "@/components/ui/StatusBadge";
14: import { startProduction, useOrders, type StoredOrder } from "@/lib/orderStore";
15: import { getBaseOrderStatus } from "@/lib/orderStatus";
16: import { cn } from "@/lib/utils";
17: 
18: type VendorTab = "Pending" | "Production" | "Shipping" | "History";
19: 
20: export function VendorDashboard() {
21:   const [activeTab, setActiveTab] = useState<VendorTab>("Production");
22:   const orders = useOrders();
23: 
24:   const metrics = useMemo(() => {
25:     const pending = orders.filter((o) => {
26:       const base = getBaseOrderStatus(o.status);
27:       return base === "Created" || base === "Waiting";
28:     }).length;
29:     const inProduction = orders.filter((o) => {
30:       const base = getBaseOrderStatus(o.status);
31:       return base === "In Production" || base === "Accepted";
32:     }).length;
33:     const ready = orders.filter((o) => getBaseOrderStatus(o.status) === "Ready to Ship").length;
34:     const shipping = orders.filter((o) => getBaseOrderStatus(o.status) === "On Delivery").length;
35:     const completed = orders.filter((o) => {
36:       const base = getBaseOrderStatus(o.status);
37:       return base === "Completed" || base === "Delivered";
38:     }).length;
39: 
40:     return [
41:       { label: "Pending", value: String(pending).padStart(2, "0"), change: "Awaiting confirmation", color: "text-warning" },
42:       { label: "In Production", value: String(inProduction).padStart(2, "0"), change: "In progress", color: "text-primary" },
43:       { label: "Ready", value: String(ready).padStart(2, "0"), change: "Ready to dispatch", color: "text-processing" },
44:       { label: "Shipping", value: String(shipping).padStart(2, "0"), change: "On delivery", color: "text-processing" },
45:       { label: "Completed", value: String(completed).padStart(2, "0"), change: "Last 30 days", color: "text-success" },
46:     ];
47:   }, [orders]);
48: 
49:   const pendingOrders = useMemo(() => getOrdersForTab("Pending", orders), [orders]);
50:   const productionOrders = useMemo(() => getOrdersForTab("Production", orders), [orders]);
51:   const shippingOrders = useMemo(() => getOrdersForTab("Shipping", orders), [orders]);
52:   const historyOrders = useMemo(() => getOrdersForTab("History", orders), [orders]);
53: 
54:   return (
55:     <div className="flex min-h-screen bg-background">
56:       <Sidebar role="vendor" />
57:       <ContentArea>
58:         <Header title="Vendor Dashboard" />
59: 
60:         <main className="space-y-8 p-4 sm:p-6 lg:p-8">
61:           <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
62:             {metrics.map((metric, index) => (
63:               <Card key={metric.label} className="group border-border/70 shadow-sm transition-colors hover:border-primary/40">
64:                 <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
65:                   <div>
66:                     <CardDescription>{metric.label}</CardDescription>
67:                     <CardTitle className={`text-3xl ${metric.color}`}>{metric.value}</CardTitle>
68:                   </div>
69:                   <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
70:                 </CardHeader>
71:                 <CardContent className="flex items-center justify-between pt-0">
72:                   <p className="text-xs text-muted-foreground">{metric.change}</p>
73:                   <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
74:                     #{String(index + 1).padStart(2, "0")}
75:                   </Badge>
76:                 </CardContent>
77:               </Card>
78:             ))}
79:           </section>
80: 
81:           <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VendorTab)} className="space-y-4">
82:             <TabsList className="grid w-full grid-cols-4">
83:               <TabsTrigger value="Pending">Pending</TabsTrigger>
84:               <TabsTrigger value="Production">In Production</TabsTrigger>
85:               <TabsTrigger value="Shipping">Shipping</TabsTrigger>
86:               <TabsTrigger value="History">History</TabsTrigger>
87:             </TabsList>
88: 
89:             <TabsContent value="Pending">
90:               <VendorOrderTable orders={pendingOrders} tab="Pending" />
91:             </TabsContent>
92:             <TabsContent value="Production">
93:               <VendorOrderTable orders={productionOrders} tab="Production" />
94:             </TabsContent>
95:             <TabsContent value="Shipping">
96:               <VendorOrderTable orders={shippingOrders} tab="Shipping" />
97:             </TabsContent>
98:             <TabsContent value="History">
99:               <VendorOrderTable orders={historyOrders} tab="History" />
100:             </TabsContent>
101:           </Tabs>
102:         </main>
103:       </ContentArea>
104:     </div>
105:   );
106: }
107: 
108: function VendorOrderTable({ orders, tab }: { orders: StoredOrder[]; tab: VendorTab }) {
109:   if (orders.length === 0) {
110:     return (
111:       <Card className="border-border/70 shadow-sm">
112:         <CardContent className="flex flex-col items-center justify-center py-16">
113:           <div className="mx-auto max-w-sm space-y-2 text-center">
114:             <p className="text-sm font-medium">No orders found</p>
115:             <p className="text-sm text-muted-foreground">
116:               {tab === "Pending"
117:                 ? "No orders awaiting confirmation."
118:                 : tab === "Production"
119:                   ? "No orders in production."
120:                   : tab === "Shipping"
121:                     ? "No orders in shipping."
122:                     : "No completed orders."}
123:             </p>
124:           </div>
125:         </CardContent>
126:       </Card>
127:     );
128:   }
129: 
130:   return (
131:     <Card className="border-border/70 py-0 shadow-sm">
132:       <CardContent className="p-0">
133:         <Table>
134:           <TableHeader>
135:             <TableRow>
136:               <TableHead>Order ID</TableHead>
137:               <TableHead>Campaign</TableHead>
138:               <TableHead>Client PO</TableHead>
139:               <TableHead>Created</TableHead>
140:               <TableHead>Deadline</TableHead>
141:               <TableHead>Status</TableHead>
142:               <TableHead className="text-right">Action</TableHead>
143:             </TableRow>
144:           </TableHeader>
145:           <TableBody>
146:             {orders.map((order) => {
147:               const deadlineInfo = getDeadlineInfo(order.deadline, order.createdDate);
148:               return (
149:                 <TableRow key={order.id}>
150:                   <TableCell>
151:                     <Link to={`/vendor/update/${order.id}`} className="font-mono text-xs text-primary hover:underline">
152:                       {order.id}
153:                     </Link>
154:                   </TableCell>
155:                   <TableCell className="text-sm font-medium">{order.campaign}</TableCell>
156:                   <TableCell className="text-sm">{order.clientPO}</TableCell>
157:                   <TableCell className="text-sm text-muted-foreground">{formatCreatedDate(order.createdDate)}</TableCell>
158:                   <TableCell
159:                     className={cn(
160:                       "text-sm",
161:                       deadlineInfo.isOverdue
162:                         ? "font-semibold text-destructive"
163:                         : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3
164:                           ? "font-semibold text-warning"
165:                           : "text-muted-foreground",
166:                     )}
167:                   >
168:                     {deadlineInfo.label}
169:                   </TableCell>
170:                   <TableCell>
171:                     <StatusBadge status={order.status} labelMap={{ Created: "Assigned" }} />
172:                   </TableCell>
173:                   <TableCell className="text-right">
174:                     {tab === "Pending" && (
175:                       <Button size="sm" onClick={() => startProduction(order.id)}>
176:                         <Play className="mr-1 h-3.5 w-3.5" />
177:                         Start Production
178:                       </Button>
179:                     )}
180:                     {(tab === "Production" || tab === "Shipping") && (
181:                       <Button size="sm" variant="outline" asChild>
182:                         <Link to={`/vendor/update/${order.id}`}>Update Progress</Link>
183:                       </Button>
184:                     )}
185:                     {tab === "History" && (
186:                       <Button size="sm" variant="ghost" asChild>
187:                         <Link to={`/vendor/update/${order.id}`}>
188:                           <Eye className="mr-1 h-3.5 w-3.5" />
189:                           View
190:                         </Link>
191:                       </Button>
192:                     )}
193:                   </TableCell>
194:                 </TableRow>
195:               );
196:             })}
197:           </TableBody>
198:         </Table>
199:       </CardContent>
200:     </Card>
201:   );
202: }
203: 
204: function getOrdersForTab(tab: VendorTab, orders: StoredOrder[]) {
205:   switch (tab) {
206:     case "Pending":
207:       return orders.filter((order) => {
208:         const base = getBaseOrderStatus(order.status);
209:         return base === "Created" || base === "Waiting";
210:       });
211:     case "Production":
212:       return orders.filter((order) => {
213:         const base = getBaseOrderStatus(order.status);
214:         return base === "In Production" || base === "Accepted";
215:       });
216:     case "Shipping":
217:       return orders.filter((order) => {
218:         const base = getBaseOrderStatus(order.status);
219:         return base === "Ready to Ship" || base === "On Delivery";
220:       });
221:     case "History":
222:       return orders.filter((order) => {
223:         const base = getBaseOrderStatus(order.status);
224:         return base === "Completed" || base === "Delivered";
225:       });
226:   }
227: }
228: 
229: function formatCreatedDate(date: string) {
230:   const parsed = new Date(date);
231:   if (Number.isNaN(parsed.getTime())) {
232:     return date;
233:   }
234:   return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
235: }
236: 
237: function getDeadlineInfo(deadline: string, createdDate?: string) {
238:   const now = new Date();
239:   const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
240: 
241:   const parsedDate = new Date(deadline);
242:   if (!Number.isNaN(parsedDate.getTime()) && deadline.includes(parsedDate.getFullYear().toString())) {
243:     const diffMs = normalizeDate(parsedDate).getTime() - normalizeDate(now).getTime();
244:     const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
245:     if (diffDays > 0) {
246:       return { label: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`, isOverdue: false, daysLeft: diffDays };
247:     }
248:     if (diffDays === 0) {
249:       return { label: "Due today", isOverdue: false, daysLeft: 0 };
250:     }
251:     const overdue = Math.abs(diffDays);
252:     return { label: `${overdue} day${overdue !== 1 ? "s" : ""} overdue`, isOverdue: true, daysLeft: null };
253:   }
254: 
255:   if (deadline === "Overdue" && createdDate) {
256:     const parsedCreated = new Date(createdDate);
257:     if (!Number.isNaN(parsedCreated.getTime())) {
258:       const daysSince = Math.floor(
259:         (normalizeDate(now).getTime() - normalizeDate(parsedCreated).getTime()) / (1000 * 60 * 60 * 24),
260:       );
261:       return { label: `${daysSince} days overdue`, isOverdue: true, daysLeft: null };
262:     }
263:   }
264:   if (deadline === "Overdue") {
265:     return { label: "Overdue", isOverdue: true, daysLeft: null };
266:   }
267:   const daysLeftMatch = deadline.match(/(\d+)/);
268:   const daysLeft = daysLeftMatch ? Number(daysLeftMatch[1]) : null;
269:   return { label: deadline, isOverdue: false, daysLeft };
270: }

(End of file - total 270 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 34.3s)

_Thinking:_

Now I have a thorough understanding of the codebase. Let me also look at the importStore to understand how bulk import creates orders and their SO numbers.

Let me plan all the changes needed:

## Requirements Analysis

1. **SO Number Auto-generation when vendor triggers "In Production":**
   - Currently, SO number is manually entered in `AdminCreateOrder` and `CreateOrder` forms
   - Need to auto-generate it when status becomes "In Production"
   - The generation should happen in `startProduction()` in `orderStore.ts` and in `advanceToProduction()` in `UpdateProgress.tsx`

2. **SO Number stored in data-seeds wired with order data:**
   - Currently `soNumber` is part of the `Order` interface directly
   - The user wants it in "data-seeds" - I think they mean it should be associated with or derived from the sales point seed data in some way
   - Actually, re-reading: "sales order number datanya disimpan di data-seeds yang di wire dengan data order" - the SO number data is stored in data-seeds that are wired to order data
   - I think the intent is: the SO number should be auto-generated and stored as part of the order, which is linked to the sales point data

3. **"Destination" and "Deliver to" and "Address" fields should align with data seed sales point:**
   - Currently, `getSalesPointDeliveryProfile()` in `deliveryNote.ts` already resolves these from sales point seed
   - But the `baseSalesPoints` data doesn't have `deliveryCompanyName`, `deliveryLocationName`, `address`, `phone`, `picClient` populated - they all use fallbacks
   - We need to properly populate these fields in the seed data so they come from the actual sales point data

4. **UI information architecture should be clear:**
   - The position of Destination, Deliver to, and Address should be grouped logically
   - Currently in OrderDetail.tsx (line 248-255), they are scattered: Destination, SO Number, Deliver to, Address
   - Should group delivery info together

Let me think about the actual implementation:

### Changes needed:

#### 1. `mockData.ts` - Add SO number generation function and populate delivery fields
- Add a function to generate SO numbers
- Add delivery fields to `SalesPointMapping` properly
- Populate `deliveryCompanyName`, `deliveryLocationName`, `address` in `baseSalesPoints`

#### 2. `orderStore.ts` - Auto-generate SO number when status becomes "In Production"
- Modify `startProduction()` to generate SO number if not already set
- Add `generateSoNumber()` function

#### 3. `UpdateProgress.tsx` - Auto-generate SO number in `advanceToProduction()`
- Add SO number generation in the advance function

#### 4. `AdminCreateOrder.tsx` - Remove SO number field
- Remove the `soNumber` input
- Remove related validation

#### 5. `CreateOrder.tsx` - Remove SO number field  
- Remove the `soNumber` input
- Remove related validation

#### 6. `OrderDetail.tsx` - Group delivery info together, reorder the detail rows
- Group Destination, Deliver to, Address, PIC Client together
- Move SO Number to a different logical group

Wait, actually, re-reading the user's request more carefully:

"saya mau sales order number itu datanya tergenerate ketika vendor mentrigger update fullfilment "in production"."

So the SO number is auto-generated when vendor triggers "In Production" status.

"sales order number datanya disimpan di data-seeds yang di wire dengan data order"

The SO number data is stored in data-seeds that are wired with order data. This likely means the generated SO number should be persisted to the order (which it already is via localStorage), but there should also be some seed data structure that tracks generated SO numbers.

Actually, I think "data-seeds" just refers to the seed data in `mockData.ts`. So the SO number should be stored on the order itself (as it currently is), but auto-generated.

"data "destination" dan "deliver to" serta "address" di order detail seharusnya align dengan data seed sales point"

Destination, deliver to, and address should align with the sales point seed data. Currently they use fallbacks because the fields aren't populated in the base data.

"jadi arsitektur informasi data yang ditampilkan harus mudah dipahami terutama posisi data di UI"

The information architecture should be easy to understand, especially data position in UI.

Let me now implement these changes.

### Step 1: Add `generateSoNumber()` function to `mockData.ts`
The SO number format should be clear. Current seed data uses `SO123928`, `SO178056`, etc. Let me use a format like `SO-YYYY-XXXXX` based on order creation date and a counter or hash.

Actually, looking at the seed data, they use format `SO570001`, `SO570002`, etc. So just `SO` + 6 digits.

### Step 2: Modify `startProduction()` in `orderStore.ts`
When advancing to "In Production", generate the SO number if it's not already set.

### Step 3: Modify `advanceToProduction()` in `UpdateProgress.tsx`
Same thing - generate SO number when advancing to "In Production".

### Step 4: Remove SO Number from `AdminCreateOrder.tsx` and `CreateOrder.tsx`
Remove the input field and validation.

### Step 5: Populate delivery fields in `baseSalesPoints`
Add `deliveryCompanyName`, `deliveryLocationName`, `address` fields to each entry.

Actually, this would be quite verbose since there are ~100 entries. Let me think of a better approach.

Since the delivery company is always "PT. HM. Sampoerna Tbk" (client), and the delivery location is `PT HMS ${salesPointName}`, and the address comes from shipping address in the seed, maybe I should:
- Use a mapping function that automatically derives these from the sales point seed data

Actually looking more carefully at the existing code:
```typescript
deliveryCompanyName: salesPoint.deliveryCompanyName ?? "PT. HM. Sampoerna Tbk",
deliveryLocationName: salesPoint.deliveryLocationName ?? `PT HMS ${salesPoint.salesPoint}`,
address: salesPoint.address ?? salesPoint.shippingAddress.alamat ?? `${salesPoint.salesPoint}, ${salesPoint.region}, ${salesPoint.zone}`,
```

The fallbacks already align with sales point seed data via `shippingAddress.alamat`. The `deliveryCompanyName` is always "PT. HM. Sampoerna Tbk" (same for all). The `deliveryLocationName` is `PT HMS ${salesPoint.salesPoint}`.

So the data already aligns with sales point seeds via the fallback chain. The issue is that the current `baseSalesPoints` don't explicitly have these fields, but the fallbacks work fine.

However, for the "missing fields" validation, it checks:
```typescript
if (!salesPoint.deliveryCompanyName) missing.push("Deliver-to company");
if (!salesPoint.deliveryLocationName) missing.push("Deliver-to location");
if (!salesPoint.address) missing.push("Deliver-to address");
```

Since the fallback values are set in `getSalesPointDeliveryProfile()`, these would never be empty strings, so this validation would never fire. But the user might want to have these explicitly in the seed data.

Actually, I think the user's intent is simpler than I'm making it:
1. Auto-generate SO number when vendor sets to "In Production"
2. The delivery info (destination, deliver to, address) should clearly come from the sales point seed and be displayed properly in the UI

Let me focus on the key changes:

### Key Changes:

1. **`mockData.ts`**: Add `generateSoNumber()` function
2. **`orderStore.ts`**: Auto-generate SO in `startProduction()`
3. **`UpdateProgress.tsx`**: Auto-generate SO in `advanceToProduction()`
4. **`AdminCreateOrder.tsx`**: Remove SO number field & validation
5. **`CreateOrder.tsx`**: Remove SO number field & validation
6. **`OrderDetail.tsx`**: Reorganize detail rows - group destination info, move SO number after it flows logically
7. **`ManualOrderDraft`**: Make soNumber optional (or remove it)

Wait, the `ManualOrderDraft` has `soNumber: string`. If we remove it from the form, we should make it optional in the draft and handle it in `createManualOrder()`.

Let me also check the `ManualOrderDraft` interface since `createManualOrder` uses it.

OK, let me also check `importStore.ts` - bulk import orders also need to handle SO number.

Let me look at the importStore to check how it handles soNumber.

Actually, let me look at the key places and plan the changes precisely. Let me also check for any validation that expects soNumber to be present.

Looking at `deliveryNote.ts`:
```typescript
if (!order.soNumber) missing.push("SO Number");
```

If we auto-generate SO when entering production, but orders in "Created" or "Accepted" status don't have SO numbers yet, the delivery note would show a missing field. That's fine - the delivery note is typically printed when the order is "Ready to Ship" or later, by which time the SO number would have been generated.

But what about the OrderDetail and UpdateProgress pages? They show "SO Number" in the detail rows. For orders without SO numbers (before production), it would show empty. Let me handle this by showing "-" or "Pending" for orders that haven't reached "In Production" yet.

Let me plan the full implementation:

### 1. Add `generateSoNumber()` to `mockData.ts`

```typescript
export function generateSoNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `SO${year}${random}`;
}
```

Or simpler, like the existing seed pattern:
```typescript
export function generateSoNumber(orderId: string): string {
  const numericSeed = orderId.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `SO${numericSeed}`;
}
```

Actually, this creates a deterministic SO based on order ID. Or maybe we should use a timestamp-based approach:

```typescript
let soCounter = 0;
export function generateSoNumber(): string {
  soCounter++;
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `SO${timestamp}${String(soCounter).padStart(4, "0")}`;
}
```

But the counter resets on page reload. Let me use a random approach like the OR number:

```typescript
export function generateSoNumber(): string {
  return `SO${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
}
```

### 2. Modify `orderStore.ts` `startProduction()`

```typescript
export function startProduction(orderId: string) {
  const existingOrders = readStoredOrders();
  const nextOrders: StoredOrder[] = existingOrders.map((order) => {
    if (order.id !== orderId) return order;

    const updatedItems = order.items.map((item) => {
      if (item.status === "Created" || item.status === "Waiting" || item.status === "Accepted") {
        return { ...item, status: "In Production" as const };
      }
      return item;
    });

    return {
      ...order,
      items: updatedItems,
      status: getOrderRequestStatus(updatedItems),
      soNumber: order.soNumber || generateSoNumber(),
    };
  });

  writeStoredOrders(nextOrders);
}
```

### 3. Modify `UpdateProgress.tsx` `advanceToProduction()`

```typescript
const advanceToProduction = () => {
  const updatedItems = order.items.map((item) => {
    const idx = getStageIndex(item.status);
    if (idx < getStageIndex("In Production")) {
      return { ...item, status: "In Production" as const };
    }
    return item;
  });
  upsertOrder({
    ...order,
    items: updatedItems,
    status: getOrderRequestStatus(updatedItems),
    soNumber: order.soNumber || generateSoNumber(),
  } as any);
};
```

But I also need to import `generateSoNumber` in both files and export it from `mockData.ts`.

### 4. Remove SO Number from `AdminCreateOrder.tsx`

Remove:
- `soNumber` state
- `soNumber` input field
- `if (!soNumber.trim()) errors.push("SO Number is required.");`
- In `handleSubmit`, remove `soNumber` from `createManualOrder` call

But wait - `ManualOrderDraft` has `soNumber: string` as required. I'd need to change it to be optional.

Actually looking more carefully, the `AdminCreateOrder` form should keep the Client PO Ref and remove the SO Number. The SO Number field was for the sales order number which should now be auto-generated.

### 5. Remove SO Number from `CreateOrder.tsx`

Same as above - remove soNumber state, field, validation.

### 6. `ManualOrderDraft` - Make `soNumber` optional

```typescript
export interface ManualOrderDraft {
  campaign: string;
  clientPO: string;
  soNumber?: string;  // optional, auto-generated
  supplier: string;
  salesPointId: string;
  picProjectName: string;
  picProjectEmail: string;
  deadline: string;
  createdDate?: string;
  sourceType?: "manual";
  note?: string;
  items: ManualOrderLineDraft[];
}
```

And in `createManualOrder()`:
```typescript
soNumber: draft.soNumber?.trim() || "",  // will be generated later when entering production
```

### 7. Reorganize `OrderDetail.tsx` - Group delivery info

Current order:
```
Supplier
Customer PO Ref
Destination
Deadline
Project
SO Number
PIC Project
Deliver to
Address
PIC Client
```

New order - group delivery info together:
```
Supplier
Customer PO Ref
Project
Deadline
PIC Project

--- Delivery Info (grouped) ---
Destination
Deliver to
Address
PIC Client

--- Reference ---
SO Number
```

Actually, looking at the code, the detail rows are rendered as a flat list. I can rearrange them in a logical order:

```
Supplier
Customer PO Ref
Project
Deadline
PIC Project
SO Number
--- Shipping/Delivery section ---
Destination  
Deliver to
Address
PIC Client
```

Let me rearrange them as:
```
Supplier
Customer PO Ref
Project
Deadline
SO Number
PIC Project
Destination
Deliver to
Address
PIC Client
```

Wait, I need to think about this more carefully. The user wants:
- "destination", "deliver to", "address" should align with data seed sales point
- Information architecture should be clear about data positions

So grouping delivery info together makes sense. Let me group them and optionally add a section title.

Let me also look at `UpdateProgress.tsx` to rearrange the same info there.

OK, also need to handle the `ManualOrderDraft` change in the `importStore.ts`. Let me check what happens there.

Actually, let me search for uses of `ManualOrderDraft` to see if the `soNumber` field change will cause issues.

The `ManualOrderDraft` is used in:
1. `createManualOrder(draft: ManualOrderDraft)` in `orderStore.ts`
2. `AdminCreateOrder.tsx` - passes `soNumber` in the draft
3. `CreateOrder.tsx` - passes `soNumber` in the draft

Since both forms currently pass `soNumber`, and we're making it optional, they can just stop passing it.

Wait, `importStore.ts` uses `createManualOrder` too? Let me check. Actually, looking at the importStore.ts reference from the exploration, it bulk imports orders. Let me check if it uses ManualOrderDraft or creates orders differently.

Let me check by reading the importStore briefly.

Actually, I know from the exploration that `importStore.ts` has `appendOrders()` and `createManualOrder()` usage. Let me check how it handles SO numbers.

Let me look at a quick grep for soNumber in the codebase.

OK let me also look at the importStore to see how SO numbers are handled there.

Actually, I should just proceed with my plan and read the importStore file.

Let me now create the todo list and start implementing.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Add generateSoNumber() function to mockData.ts",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Remove SO Number field from AdminCreateOrder.tsx",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Remove SO Number field from client/CreateOrder.tsx",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Remove SO Number from deliveryNote.ts missing fields check",
      "status": "pending",
      "priority": "low"
    },
    {
      "content": "Check importStore.ts for SO number handling",
      "status": "pending",
      "priority": "low"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add generateSoNumber() function to mockData.ts",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from AdminCreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from client/CreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Remove SO Number from deliveryNote.ts missing fields check",
    "status": "pending",
    "priority": "low"
  },
  {
    "content": "Check importStore.ts for SO number handling",
    "status": "pending",
    "priority": "low"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.6s)

_Thinking:_

Let me first check the importStore for SO number handling, then proceed with all the changes.

**Tool: grep**

**Input:**
```json
{
  "pattern": "soNumber|so_number|SO.?Number",
  "include": "*.ts*",
  "path": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib"
}
```

**Output:**
```
Found 21 matches
/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts:
  Line 42:   soNumber: string;

  Line 228:     soNumber: draft.soNumber.trim(),


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts:
  Line 52:   soNumber: string;

  Line 76:     soNumber: "SO123928",

  Line 98:     soNumber: "SO178056",

  Line 120:     soNumber: "SO998271",

  Line 142:     soNumber: "SO772615",

  Line 163:     soNumber: "SO445162",

  Line 185:     soNumber: "SO570001",

  Line 206:     soNumber: "SO570002",

  Line 227:     soNumber: "SO570003",

  Line 248:     soNumber: "SO570004",

  Line 269:     soNumber: "SO570005",

  Line 290:     soNumber: "SO570006",

  Line 311:     soNumber: "SO570007",

  Line 332:     soNumber: "SO570008",

  Line 353:     soNumber: "SO570009",


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/importStore.ts:
  Line 1341:       soNumber: "",


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/deliveryNote.ts:
  Line 52:   soNumber: string;

  Line 176:     soNumber: order.soNumber,

  Line 269:   if (!order.soNumber) missing.push("SO Number");

```

**Tool: grep**

**Input:**
```json
{
  "pattern": "soNumber",
  "include": "*.ts*",
  "path": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages"
}
```

**Output:**
```
Found 14 matches
/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx:
  Line 254:                       <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber}</span>} />


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/OrderDetail.tsx:
  Line 251:                     <DetailRow label="SO Number" value={<span className="text-sm font-medium text-foreground">{deliveryNote.soNumber}</span>} />


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx:
  Line 35:   const [soNumber, setSoNumber] = useState("");

  Line 103:     if (!soNumber.trim()) errors.push("SO Number is required.");

  Line 129:     soNumber,

  Line 210:       soNumber,

  Line 289:                       <Input id="so-number" placeholder="e.g. SO123928" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />

  Line 442:                     <ReviewRow label="SO Number" value={soNumber || "Missing"} />


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/client/CreateOrder.tsx:
  Line 23:   const [soNumber, setSoNumber] = useState("");

  Line 50:     if (!soNumber.trim()) errors.push("SO Number is required.");

  Line 63:   }, [campaignName, clientPO, deadline, items, selectedSalesPoint, soNumber]);

  Line 98:       soNumber,

  Line 165:                   <FormInput id="so-number" label="SO Number" placeholder="e.g. SO123928" required value={soNumber} onChange={setSoNumber} />


/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/shared/DeliveryNotePrint.tsx:
  Line 92:                 <KeyValue label="SO Number" value={deliveryNote.soNumber} />

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 2.8s)

_Thinking:_

Now I have a clear picture. Let me also check the importStore to see how it creates orders.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/importStore.ts",
  "offset": 1300,
  "limit": 80
}
```

**Output:**
```
<path>/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/importStore.ts</path>
<type>file</type>
<content>
1300: 
1301:   return Object.values(groupedRows).map((rows) => {
1302:     const firstRow = rows[0];
1303:     const vendor = firstRow.assignment!;
1304:     const salesPointId = firstRow.match.salesPointId ?? firstRow.raw.wcode;
1305:     const clientBinding = firstRow.match.clientId
1306:       ? {
1307:           clientId: firstRow.match.clientId,
1308:           clientName: firstRow.match.clientName,
1309:           clientEntityName: firstRow.match.clientEntityName,
1310:         }
1311:       : getSalesPointClientBinding(salesPointId);
1312:     const sourcePoNumber = firstRow.raw.poNumber;
1313:     const topProjectName = rows.reduce<Record<string, number>>((accumulator, row) => {
1314:       const key = row.raw.brandNamePo || row.raw.brand || "Imported Project";
1315:       accumulator[key] = (accumulator[key] ?? 0) + 1;
1316:       return accumulator;
1317:     }, {});
1318:     const campaign = Object.entries(topProjectName).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Imported Project";
1319:     const id = `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
1320:     const items = rows.map((row) => ({
1321:       id: makeId("ITEM"),
1322:       productCode: row.match.productCode ?? row.raw.itemCode,
1323:       poLineNumber: row.raw.poLine,
1324:       name: row.match.productName ?? row.raw.itemName,
1325:       quantity: row.quantity,
1326:       deliveredQuantity: 0,
1327:       status: "Created" as const,
1328:       sourceBatchId: batch.id,
1329:       sourceRowId: row.id,
1330:       sourcePoNumber: row.raw.poNumber,
1331:       brandNamePo: row.raw.brandNamePo,
1332:     }));
1333: 
1334:     return {
1335:       id,
1336:       campaign: `Imported ${campaign}`,
1337:       status: getOrderRequestStatus(items),
1338:       createdDate: toIsoDate(),
1339:       deadline: "14 days left",
1340:       clientPO: sourcePoNumber,
1341:       soNumber: "",
1342:       supplier: vendor.vendorName,
1343:       salesPointId,
1344:       clientId: clientBinding?.clientId ?? undefined,
1345:       clientName: clientBinding?.clientName ?? undefined,
1346:       clientEntityName: clientBinding?.clientEntityName ?? undefined,
1347:       picProject: {
1348:         name: "",
1349:         email: "",
1350:       },
1351:       sourceType: "bulk_po_import" as const,
1352:       importBatchId: batch.id,
1353:       importRowIds: rows.map((row) => row.id),
1354:       importGroupKey: makeImportGroupKey(batch, rows),
1355:       assignedVendorId: vendor.vendorId,
1356:       dispatchRunId,
1357:       importPoNumbers: [sourcePoNumber],
1358:       items,
1359:     } satisfies StoredOrder;
1360:   });
1361: }
1362: 
1363: function dispatchAssignedRows(batchId: string): DispatchResult {
1364:   const batch = getBatchById(batchId);
1365: 
1366:   if (!batch) {
1367:     return {
1368:       createdOrders: [],
1369:       createdOrderIds: [],
1370:       skippedExistingOrderIds: [],
1371:       skippedRowIds: [],
1372:       unresolvedAssignedCount: 0,
1373:       pendingDuplicateCount: 0,
1374:       remainingUnassignedCount: 0,
1375:     };
1376:   }
1377: 
1378:   const createdAt = new Date().toISOString();
1379:   const createdBy = "Admin Dispatch Workspace";

(Showing lines 1300-1379 of 1801. Use offset=1380 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 13.7s)

_Thinking:_

The importStore creates orders with `soNumber: ""` (empty string). This aligns with our plan - SO number will be auto-generated when the order goes into production.

Now let me also check the StoredOrder interface used in importStore. It uses `StoredOrder` (which extends Omit<Order, "items">). Since `Order.soNumber` is `string`, the importStore just sets it to empty.

Now let me plan all the changes carefully:

### 1. `mockData.ts`
- Add `generateSoNumber()` function (exported)

### 2. `orderStore.ts`
- Change `ManualOrderDraft.soNumber` from `string` to `string` (keep it but not required in form)
- Actually, better to keep it as required but let `createManualOrder` pass empty string if not provided in the form
- Import `generateSoNumber` from mockData
- Modify `startProduction()` to auto-generate SO number
- In `createManualOrder()`, set `soNumber: draft.soNumber?.trim() || ""`

Wait, `ManualOrderDraft.soNumber` is currently `string` (required). If we make it truly optional in forms, we should change it to optional:

```typescript
export interface ManualOrderDraft {
  ...
  soNumber?: string;  // optional, auto-generated when entering production
  ...
}
```

### 3. `UpdateProgress.tsx`
- Import `generateSoNumber` from mockData
- Modify `advanceToProduction()` to generate SO number

### 4. `AdminCreateOrder.tsx`
- Remove `soNumber` state
- Remove SO Number input field
- Remove SO Number validation
- Remove SO Number from Review section
- Remove `soNumber` from `createManualOrder` call

### 5. `CreateOrder.tsx`
- Remove `soNumber` state
- Remove SO Number input field
- Remove SO Number validation
- Remove `soNumber` from `createManualOrder` call

### 6. `OrderDetail.tsx` - Reorganize detail rows
Current order:
1. Supplier
2. Customer PO Ref
3. Destination
4. Deadline
5. Project
6. SO Number
7. PIC Project
8. Deliver to
9. Address
10. PIC Client

New order (logically grouped):
1. Supplier
2. Customer PO Ref
3. Project
4. Deadline
5. SO Number
6. PIC Project
--- Delivery section ---
7. Destination
8. Deliver to
9. Address
10. PIC Client

Actually, the user wants "destination", "deliver to", and "address" to be aligned. Let me group them together and also make the labels clearer by prefixing with "Sales Point" context.

Wait, actually, re-reading the user's request:
"data "destination" dan "deliver to" serta "address" di order detail seharusnya align dengan data seed sales point"

So these three should be placed together and should clearly show they come from the sales point seed data. The current display already shows this, just the ordering is a bit scattered.

Let me reorder to:
1. Supplier
2. Customer PO Ref  
3. Project
4. Deadline
5. SO Number
6. PIC Project
--- Gap or visual separator ---
7. Destination (wcode · deliveryLocationName)
8. Deliver to (deliveryCompanyName)
9. Address
10. PIC Client

The key change is grouping Destination, Deliver to, and Address together consecutively.

### 7. `UpdateProgress.tsx` - Same reordering

### 8. `deliveryNote.ts` - Remove SO Number from missing fields check
Since SO number is now auto-generated when entering production, orders before "In Production" won't have SO numbers. The delivery note is for print (post-production), so by then they should have it. But it shouldn't block printing as a "missing field". 

Actually, let me reconsider. The `getMissingRequiredFields` function includes `if (!order.soNumber) missing.push("SO Number")`. If an order is "Accepted" and someone tries to print a delivery note, it would show SO Number as missing. But the delivery note is typically printed when Ready to Ship, by which time the SO number should exist.

However, to be safe and consistent, I should remove it from the missing fields check since it's now auto-generated.

Let me now implement all the changes.

Actually wait, for the deliveryNote.ts, the `soNumber` in the delivery note object (Line 176: `soNumber: order.soNumber`) would be empty for pre-production orders. This is fine because delivery notes shouldn't be printed before production anyway.

But I should still remove it from the missing fields check because:
1. It's auto-generated by the system, not a field to be manually filled
2. If somehow a delivery note is generated before production, it's OK to show empty SO number

Let me proceed.

Let me also check if there are any other places that reference `soNumber` in forms or validation...

The search results show:
- `AdminCreateOrder.tsx` - has soNumber form field
- `CreateOrder.tsx` - has soNumber form field
- `OrderDetail.tsx` - displays SO Number
- `UpdateProgress.tsx` - displays SO Number
- `DeliveryNotePrint.tsx` - displays SO Number
- `deliveryNote.ts` - uses soNumber
- `importStore.ts` - sets soNumber to ""

The `DeliveryNotePrint.tsx` at line 92 just displays it, no changes needed.

OK, let me start implementing. I'll do this efficiently.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "priority": "high",
      "content": "Add generateSoNumber() function to mockData.ts",
      "status": "in_progress"
    },
    {
      "priority": "high",
      "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from AdminCreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from client/CreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Remove SO Number from deliveryNote.ts missing fields check",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Check importStore.ts for SO number handling",
      "status": "completed"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add generateSoNumber() function to mockData.ts",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from AdminCreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from client/CreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Remove SO Number from deliveryNote.ts missing fields check",
    "status": "pending",
    "priority": "low"
  },
  {
    "content": "Check importStore.ts for SO number handling",
    "status": "completed",
    "priority": "low"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.0s)

_Thinking:_

Let me now implement everything. I'll start with mockData.ts to add generateSoNumber(), then proceed to the other files.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts",
  "oldString": "export function getSalesPointClientBinding(salesPointId: string) {",
  "newString": "let soCounter = 0;\n\nexport function generateSoNumber(): string {\n  soCounter++;\n  const date = new Date();\n  const mm = String(date.getMonth() + 1).padStart(2, \"0\");\n  const dd = String(date.getDate()).padStart(2, \"0\");\n  const seq = String(soCounter).padStart(4, \"0\");\n  return `SO${mm}${dd}${seq}`;\n}\n\nexport function getSalesPointClientBinding(salesPointId: string) {"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.5s)

_Thinking:_

Wait, the counter resets on app reload. Let me think about this...

Actually, using a counter that resets is problematic. Let me use a timestamp-based approach like the OR number:

```typescript
export function generateSoNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `SO${y}${mm}${dd}${random}`;
}
```

This generates: `SO2606101234` (SO + year + month + day + 4-digit random).

Actually, even better to keep it simple and avoid counter:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/mockData.ts",
  "oldString": "let soCounter = 0;\n\nexport function generateSoNumber(): string {\n  soCounter++;\n  const date = new Date();\n  const mm = String(date.getMonth() + 1).padStart(2, \"0\");\n  const dd = String(date.getDate()).padStart(2, \"0\");\n  const seq = String(soCounter).padStart(4, \"0\");\n  return `SO${mm}${dd}${seq}`;\n}",
  "newString": "export function generateSoNumber(): string {\n  const date = new Date();\n  const y = date.getFullYear();\n  const mm = String(date.getMonth() + 1).padStart(2, \"0\");\n  const dd = String(date.getDate()).padStart(2, \"0\");\n  const random = Math.floor(Math.random() * 900000 + 100000);\n  return `SO${y}${mm}${dd}${random}`;\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.1s)

_Thinking:_

Good. Now let me update the orderStore.ts.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "priority": "high",
      "content": "Add generateSoNumber() function to mockData.ts",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
      "status": "in_progress"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from AdminCreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from client/CreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Remove SO Number from deliveryNote.ts missing fields check",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Check importStore.ts for SO number handling",
      "status": "completed"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add generateSoNumber() function to mockData.ts",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from AdminCreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from client/CreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Remove SO Number from deliveryNote.ts missing fields check",
    "status": "pending",
    "priority": "low"
  },
  {
    "content": "Check importStore.ts for SO number handling",
    "status": "completed",
    "priority": "low"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.7s)

_Thinking:_

Let me make the changes to orderStore.ts now.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts",
  "oldString": "import {\n  getSalesPointClientBinding,\n  mockOrders,\n  type ComplaintHistoryEntry,\n  type ComplaintLineItem,\n  type ComplaintStatus,\n  type Order,\n  type OrderComplaint,\n  type OrderLine,\n} from \"@/lib/mockData\";",
  "newString": "import {\n  generateSoNumber,\n  getSalesPointClientBinding,\n  mockOrders,\n  type ComplaintHistoryEntry,\n  type ComplaintLineItem,\n  type ComplaintStatus,\n  type Order,\n  type OrderComplaint,\n  type OrderLine,\n} from \"@/lib/mockData\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.1s)

_Thinking:_

Now make `soNumber` optional in `ManualOrderDraft`:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts",
  "oldString": "export interface ManualOrderDraft {\n  campaign: string;\n  clientPO: string;\n  soNumber: string;\n  supplier: string;",
  "newString": "export interface ManualOrderDraft {\n  campaign: string;\n  clientPO: string;\n  soNumber?: string;\n  supplier: string;"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.1s)

_Thinking:_

Now update `createManualOrder` to handle optional soNumber:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts",
  "oldString": "    soNumber: draft.soNumber.trim(),",
  "newString": "    soNumber: draft.soNumber?.trim() || \"\","
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.1s)

_Thinking:_

Now modify `startProduction()` to auto-generate SO number:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/lib/orderStore.ts",
  "oldString": "export function startProduction(orderId: string) {\n  const existingOrders = readStoredOrders();\n  const nextOrders: StoredOrder[] = existingOrders.map((order) => {\n    if (order.id !== orderId) {\n      return order;\n    }\n\n    const updatedItems = order.items.map((item) => {\n      if (item.status === \"Created\" || item.status === \"Waiting\" || item.status === \"Accepted\") {\n        return { ...item, status: \"In Production\" as const };\n      }\n\n      return item;\n    });\n\n    return {\n      ...order,\n      items: updatedItems,\n      status: getOrderRequestStatus(updatedItems),\n    };\n  });\n\n  writeStoredOrders(nextOrders);\n}",
  "newString": "export function startProduction(orderId: string) {\n  const existingOrders = readStoredOrders();\n  const nextOrders: StoredOrder[] = existingOrders.map((order) => {\n    if (order.id !== orderId) {\n      return order;\n    }\n\n    const updatedItems = order.items.map((item) => {\n      if (item.status === \"Created\" || item.status === \"Waiting\" || item.status === \"Accepted\") {\n        return { ...item, status: \"In Production\" as const };\n      }\n\n      return item;\n    });\n\n    return {\n      ...order,\n      items: updatedItems,\n      status: getOrderRequestStatus(updatedItems),\n      soNumber: order.soNumber || generateSoNumber(),\n    };\n  });\n\n  writeStoredOrders(nextOrders);\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.0s)

_Thinking:_

Now let me update the `UpdateProgress.tsx` to auto-generate SO in `advanceToProduction()` and reorganize the detail rows:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "priority": "high",
      "content": "Add generateSoNumber() function to mockData.ts",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
      "status": "in_progress"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from AdminCreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "high",
      "content": "Remove SO Number field from client/CreateOrder.tsx",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "medium",
      "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Remove SO Number from deliveryNote.ts missing fields check",
      "status": "pending"
    },
    {
      "priority": "low",
      "content": "Check importStore.ts for SO number handling",
      "status": "completed"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add generateSoNumber() function to mockData.ts",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Make ManualOrderDraft.soNumber optional & update createManualOrder()",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in startProduction() (orderStore.ts)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Auto-generate SO number in advanceToProduction() (UpdateProgress.tsx)",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from AdminCreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Remove SO Number field from client/CreateOrder.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Reorganize OrderDetail.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Reorganize UpdateProgress.tsx - group delivery info together logically",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Remove SO Number from deliveryNote.ts missing fields check",
    "status": "pending",
    "priority": "low"
  },
  {
    "content": "Check importStore.ts for SO number handling",
    "status": "completed",
    "priority": "low"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.2s)

_Thinking:_

Now edit `UpdateProgress.tsx`:
1. Import `generateSoNumber` 
2. Add SO generation in `advanceToProduction()`
3. Reorganize detail rows

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx",
  "oldString": "import { generateDeliveryNote } from \"@/lib/deliveryNote\";\nimport { getBaseOrderStatus, getOrderRequestStatus } from \"@/lib/orderStatus\";",
  "newString": "import { generateDeliveryNote } from \"@/lib/deliveryNote\";\nimport { generateSoNumber } from \"@/lib/mockData\";\nimport { getBaseOrderStatus, getOrderRequestStatus } from \"@/lib/orderStatus\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.8s)

_Thinking:_

Wait, the import from `mockData` may need to be checked. The `mockData.ts` exports `generateSoNumber` at the end of the file (level with other exports like `getSalesPointClientBinding`). But the import is from `"@/lib/mockData"` which means it imports everything that's exported from `mockData.ts`. Let me check if `generateSoNumber` is properly exported.

Looking at the edit I made to mockData.ts, I added `generateSoNumber` as a named export right before `getSalesPointClientBinding`. That should work fine.

Now update `advanceToProduction()`:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx",
  "oldString": "  const advanceToProduction = () => {\n    const updatedItems = order.items.map((item) => {\n      const idx = getStageIndex(item.status);\n      if (idx < getStageIndex(\"In Production\")) {\n        return { ...item, status: \"In Production\" as const };\n      }\n      return item;\n    });\n    upsertOrder({\n      ...order,\n      items: updatedItems,\n      status: getOrderRequestStatus(updatedItems),\n    } as any);\n  };",
  "newString": "  const advanceToProduction = () => {\n    const updatedItems = order.items.map((item) => {\n      const idx = getStageIndex(item.status);\n      if (idx < getStageIndex(\"In Production\")) {\n        return { ...item, status: \"In Production\" as const };\n      }\n      return item;\n    });\n    upsertOrder({\n      ...order,\n      items: updatedItems,\n      status: getOrderRequestStatus(updatedItems),\n      soNumber: order.soNumber || generateSoNumber(),\n    } as any);\n  };"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.0s)

_Thinking:_

Now reorganize the detail rows in `UpdateProgress.tsx` to group delivery info:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/vendor/UpdateProgress.tsx",
  "oldString": "                      <DetailRow label=\"Supplier\" value={<span className=\"inline-flex items-center gap-1.5 text-sm font-medium text-foreground\">{order.supplier}<ArrowUpRight className=\"h-3.5 w-3.5 text-primary\" /></span>} />\n                      <DetailRow label=\"Customer PO Ref\" value={<span className=\"text-sm font-medium text-foreground\">{order.clientPO}</span>} />\n                      <DetailRow label=\"Destination\" value={<span className=\"text-sm font-medium text-foreground\">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />\n                      <DetailRow label=\"Deadline\" value={<span className={cn(\"text-sm font-medium\", order.deadline === \"Overdue\" ? \"text-destructive\" : \"text-foreground\")}>{order.deadline}</span>} />\n                      <DetailRow label=\"Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.projectName}</span>} />\n                      <DetailRow label=\"SO Number\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.soNumber}</span>} />\n                      <DetailRow label=\"PIC Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.picProject}</span>} />\n                      <DetailRow label=\"Deliver to\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.deliveryCompanyName}</span>} />\n                      <DetailRow label=\"Address\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.address}</span>} />\n                      <DetailRow label=\"PIC Client\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.picClient}</span>} />",
  "newString": "                      <DetailRow label=\"Supplier\" value={<span className=\"inline-flex items-center gap-1.5 text-sm font-medium text-foreground\">{order.supplier}<ArrowUpRight className=\"h-3.5 w-3.5 text-primary\" /></span>} />\n                      <DetailRow label=\"Customer PO Ref\" value={<span className=\"text-sm font-medium text-foreground\">{order.clientPO}</span>} />\n                      <DetailRow label=\"Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.projectName}</span>} />\n                      <DetailRow label=\"Deadline\" value={<span className={cn(\"text-sm font-medium\", order.deadline === \"Overdue\" ? \"text-destructive\" : \"text-foreground\")}>{order.deadline}</span>} />\n                      <DetailRow label=\"SO Number\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.soNumber || \"—\"}</span>} />\n                      <DetailRow label=\"PIC Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.picProject}</span>} />\n                      <DetailRow label=\"Destination\" value={<span className=\"text-sm font-medium text-foreground\">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />\n                      <DetailRow label=\"Deliver to\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.deliveryCompanyName}</span>} />\n                      <DetailRow label=\"Address\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.address}</span>} />\n                      <DetailRow label=\"PIC Client\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.picClient}</span>} />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.7s)

_Thinking:_

Now update `OrderDetail.tsx` with same reordering:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/OrderDetail.tsx",
  "oldString": "                    <DetailRow label=\"Supplier\" value={<span className=\"inline-flex items-center gap-1.5 text-sm font-medium text-foreground\">{order.supplier}<ArrowUpRight className=\"h-3.5 w-3.5 text-primary\" /></span>} />\n                    <DetailRow label=\"Customer PO Ref\" value={<span className=\"text-sm font-medium text-foreground\">{order.clientPO}</span>} />\n                    <DetailRow label=\"Destination\" value={<span className=\"text-sm font-medium text-foreground\">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />\n                    <DetailRow label=\"Deadline\" value={<span className={cn(\"text-sm font-medium\", order.deadline === \"Overdue\" ? \"text-destructive\" : \"text-foreground\")}>{order.deadline}</span>} />\n                    <DetailRow label=\"Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.projectName}</span>} />\n                    <DetailRow label=\"SO Number\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.soNumber}</span>} />\n                    <DetailRow label=\"PIC Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.picProject}</span>} />\n                    <DetailRow label=\"Deliver to\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.deliveryCompanyName}</span>} />\n                    <DetailRow label=\"Address\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.address}</span>} />\n                    <DetailRow label=\"PIC Client\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.picClient}</span>} />",
  "newString": "                    <DetailRow label=\"Supplier\" value={<span className=\"inline-flex items-center gap-1.5 text-sm font-medium text-foreground\">{order.supplier}<ArrowUpRight className=\"h-3.5 w-3.5 text-primary\" /></span>} />\n                    <DetailRow label=\"Customer PO Ref\" value={<span className=\"text-sm font-medium text-foreground\">{order.clientPO}</span>} />\n                    <DetailRow label=\"Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.projectName}</span>} />\n                    <DetailRow label=\"Deadline\" value={<span className={cn(\"text-sm font-medium\", order.deadline === \"Overdue\" ? \"text-destructive\" : \"text-foreground\")}>{order.deadline}</span>} />\n                    <DetailRow label=\"SO Number\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.soNumber || \"—\"}</span>} />\n                    <DetailRow label=\"PIC Project\" value={<span className=\"text-sm font-medium text-foreground\">{deliveryNote.picProject}</span>} />\n                    <DetailRow label=\"Destination\" value={<span className=\"text-sm font-medium text-foreground\">{`${deliverySnapshot.wcode} · ${deliverySnapshot.deliveryLocationName}`}</span>} />\n                    <DetailRow label=\"Deliver to\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.deliveryCompanyName}</span>} />\n                    <DetailRow label=\"Address\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.address}</span>} />\n                    <DetailRow label=\"PIC Client\" value={<span className=\"text-sm font-medium text-foreground\">{deliverySnapshot.picClient}</span>} />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 2.9s)

_Thinking:_

Now remove SO Number from `AdminCreateOrder.tsx`:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx",
  "oldString": "  const [soNumber, setSoNumber] = useState(\"\");",
  "newString": ""
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.1s)

_Thinking:_

Now remove validation for soNumber:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx",
  "oldString": "    if (!soNumber.trim()) errors.push(\"SO Number is required.\");",
  "newString": ""
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.5s)

_Thinking:_

Now remove soNumber from the dependency array:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx",
  "oldString": "  }, [\n    campaignName,\n    clientPO,\n    customDeadline,\n    deadlineLabel,\n    items,\n    picProjectEmail,\n    picProjectName,\n    selectedSalesPoint,\n    selectedSupplierRecord,\n    soNumber,\n  ]);",
  "newString": "  }, [\n    campaignName,\n    clientPO,\n    customDeadline,\n    deadlineLabel,\n    items,\n    picProjectEmail,\n    picProjectName,\n    selectedSalesPoint,\n    selectedSupplierRecord,\n  ]);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.2s)

_Thinking:_

Now remove soNumber from the createManualOrder call:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/perdanahary/Documents/Projects/Officebee/VA Trace/src/pages/admin/AdminCreateOrder.tsx",
  "oldString": "    const order = createManualOrder({\n      campaign: campaignName,\n      clientPO,\n      soNumber,",
  "newString": "    const order = createManualOrder({\n      campaign: campaignName,\n      clientPO,"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 49.3s)

---

