# Low-Fidelity Wireframes V2

## Wireframe Conventions

- Wireframes are structural only.
- Existing shell remains: left sidebar, top header, content area.
- Tables, filters, tabs, cards, dialogs, and badges should use existing shadcn/ui primitives.
- `[...]` indicates controls or grouped components.
- `|` indicates table columns.

## Admin Dashboard

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: Dashboard                  [Date] [Export]     |
|                        +-------------------------------------------------------|
| Dashboard              |                                                       |
| Orders                 | [Production Cards]                                    |
| - All Orders           | +------------+ +------------+ +------------+          |
| - Order Tracking       | | In Prod    | | QC         | | Ready Dist |          |
| - Create OR            | +------------+ +------------+ +------------+          |
| - Imports              |                                                       |
| Logistics              | [Distribution Cards]                                  |
| - Shipment Batches     | +------------+ +------------+ +------------+          |
| - Delivery Notes       | | Allocated  | | Shipped    | | Received   |          |
| - POD Verification     | +------------+ +------------+ +------------+          |
| Sales Points           |                                                       |
| Suppliers              | [POD Queue]                    [Shipment Exceptions]  |
| Products               | | POD | Batch | Vendor | Age | | Batch | Reason |    |
| Clients                | |-----|-------|--------|-----| |-------|--------|    |
| Users                  |                                                       |
| Inbox                  | [Recent Shipment Batches]                             |
|                        | | Batch | Order | SP Count | Status | POD | Action | |
+--------------------------------------------------------------------------------+
```

Primary scan path:

- Top cards separate production and distribution.
- POD and exception queues are above recent lists because they require action.

## Admin All Orders

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: All Order Requests       [Create OR] [Export] |
|                        +-------------------------------------------------------|
|                        | [Search order, PO, project, vendor, Sales Point]      |
|                        | [Filters]                                             |
|                        |                                                       |
|                        | Filter Section                                        |
|                        | [Client] [Project] [Vendor] [Prod Status]             |
|                        | [Dist Status] [Progress] [Deadline] [POD Exception]   |
|                        |                                                       |
|                        | +---------------------------------------------------+ |
|                        | | Client PO | OR | Client | Project | Vendor | ...  | |
|                        | |-----------|----|--------|---------|--------|------| |
|                        | | PO-001    | OR | HMS    | VEEV    | HH     | ...  | |
|                        | |           |    |        |         |        |      | |
|                        | | Prod Status | Dist Status | Progress | Action     | |
|                        | +---------------------------------------------------+ |
|                        |                                                       |
|                        | [Previous] Page 1 of N [Next]                         |
+--------------------------------------------------------------------------------+
```

Required table actions:

- Open details.
- Create shipment batch.
- View shipment batches.
- View delivery notes.
- View labels.
- View POD.

## Admin Order Detail

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: OR-2026-816972                                |
|                        | All Orders > OR-2026-816972                           |
|                        | [Create Batch] [Print Docs] [Raise Exception] [...]   |
|                        +-------------------------------------------------------|
|                        |                                                       |
|                        | [Status Strip]                                        |
|                        | Production: READY_FOR_DISTRIBUTION                    |
|                        | Distribution: PARTIALLY_DISTRIBUTED                   |
|                        | Delivery Progress: 420 / 750 received                 |
|                        |                                                       |
|                        | +----------------------------------+ +--------------+ |
|                        | | Tabs                             | | Summary      | |
|                        | | [Overview][Allocations][Prod]    | | Ordered 750  | |
|                        | | [Batches][DN][POD][Audit]        | | Alloc 750    | |
|                        | |                                  | | Shipped 520  | |
|                        | | Selected Tab Content             | | Received 420 | |
|                        | |                                  | | Outstanding  | |
|                        | | Allocation Table or Batch Table  | | POD Issues 2 | |
|                        | |                                  | +--------------+ |
|                        | +----------------------------------+                  |
+--------------------------------------------------------------------------------+
```

## Order Detail - Allocations Tab

```text
+--------------------------------------------------------------------------------+
| Allocations                                                   [Add to Batch]    |
| [Search Sales Point or product] [Zone] [Region] [Area] [Status] [POD]          |
|                                                                                |
| | SP Code | Sales Point | Product | Alloc | Shipped | Received | Out. | POD | |
| |---------|-------------|---------|-------|---------|----------|------|-----| |
| | WH055   | Jakarta Bar | P-001   | 100   | 60      | 50       | 40   | Var | |
| | WH071   | Jakarta Sel | P-001   | 80    | 80      | 80       | 0    | OK  | |
|                                                                                |
| Row actions: [Add to Batch] [View SP] [Batch History]                           |
+--------------------------------------------------------------------------------+
```

Partial shipment behavior:

- `Outstanding = allocated - shipped`.
- Add to Batch defaults to outstanding but allows a lower quantity.

Partial delivery behavior:

- `Received < Shipped` displays variance and marks POD review if not resolved.

## Create Shipment Batch Dialog

```text
+---------------------------------------------------------------+
| Create Shipment Batch                             [Close]      |
|                                                               |
| Source Order: OR-2026-816972                                  |
| Vendor: HH Global                                             |
|                                                               |
| [Search allocation] [Zone] [Region] [Area] [Product]           |
|                                                               |
| | Select | SP | Product | Outstanding | Batch Qty | Note |     |
| |--------|----|---------|-------------|-----------|------|     |
| | [x]    | WH | P-001   | 40          | [20]      | ...  |     |
| | [ ]    | WH | P-002   | 10          | [10]      | ...  |     |
|                                                               |
| Batch Summary                                                 |
| Sales Points: 4 | Lines: 12 | Quantity: 220                   |
|                                                               |
| [Save Draft] [Create and Generate Delivery Note]               |
+---------------------------------------------------------------+
```

Validation:

- Batch quantity cannot exceed outstanding allocation quantity.
- Batch can include multiple Sales Points.
- Batch can include partial quantities.

## Shipment Batches List

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: Shipment Batches            [Create Batch]     |
|                        +-------------------------------------------------------|
|                        | [Search batch, order, DN, Sales Point] [Filters]      |
|                        |                                                       |
|                        | [Vendor] [Client] [Project] [Batch Status]            |
|                        | [DN Status] [POD Status] [Dispatch Date] [Partial]    |
|                        |                                                       |
|                        | | Batch | OR | Vendor | SPs | Ship | Rec | Status |  |
|                        | |-------|----|--------|-----|------|-----|--------|  |
|                        | | B-001 | OR | HH     | 12  | 520  | 420 | Part   |  |
|                        |                                                       |
|                        | Row actions: Open, Print DN, Print Labels, POD        |
+--------------------------------------------------------------------------------+
```

## Shipment Batch Detail

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: SHP-2026-0001                                 |
|                        | Shipment Batches > SHP-2026-0001                      |
|                        | [Print DN] [Print Labels] [Verify POD] [Close Batch]  |
|                        +-------------------------------------------------------|
|                        |                                                       |
|                        | +----------------------------------+ +--------------+ |
|                        | | Batch Summary                    | | Document     | |
|                        | | Order: OR-2026-816972            | | DN: Generated| |
|                        | | Vendor: HH Global                | | Labels: 42   | |
|                        | | Status: IN_TRANSIT               | | POD: Pending | |
|                        | | Dispatch: 2026-06-01             | +--------------+ |
|                        | +----------------------------------+                  |
|                        |                                                       |
|                        | [Items] [Delivery Note] [Labels] [POD] [Audit]        |
|                        |                                                       |
|                        | | SP | Product | Shipped | Received | Variance | POD | |
|                        | |----|---------|---------|----------|----------|-----| |
|                        | | WH | P-001   | 60      | 50       | -10      | Pend| |
+--------------------------------------------------------------------------------+
```

## Delivery Note Print

```text
+--------------------------------------------------------------------------------+
| Header: Delivery Note DN-2026-0001                        [Print Delivery Note] |
+--------------------------------------------------------------------------------+
|                                                                                |
|                           A4 PRINT AREA                                        |
| +----------------------------------------------------------------------------+ |
| | QR        hhglobal                    Delivery Note       DO Number: DN... | |
| |                                                                            | |
| | Sender                                  Recipient / Deliver To             | |
| | PMG / Vendor Snapshot                   Sales Point Snapshot               | |
| |                                                                            | |
| | PO No: ...     SO No: ...     Project: ...     Batch: SHP-2026-0001        | |
| |                                                                            | |
| | | PO Line | Material | Description | Ordered | Shipped | Outstanding |    | |
| | |---------|----------|-------------|---------|---------|-------------|    | |
| |                                                                            | |
| | Note                                                                       | |
| |                                                                            | |
| | Delivered by: ___________________ Received by: ___________________         | |
| | Date / Signature / Stamp / Name                                            | |
| +----------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------+
```

Document rules:

- One Delivery Note per Shipment Batch.
- Order-level routes must ask for a batch when multiple DNs exist.
- DN shows shipped quantity from the batch, not total order delivered quantity.

## Shipping Labels Print

```text
+--------------------------------------------------------------------------------+
| Header: Shipping Labels SHP-2026-0001                         [Print Labels]   |
+--------------------------------------------------------------------------------+
|                                                                                |
| +------------------------+ +------------------------+ +----------------------+ |
| | QR / Barcode           | | QR / Barcode           | | QR / Barcode         | |
| | Label: LBL-001         | | Label: LBL-002         | | Label: LBL-003       | |
| | Batch: SHP-2026-0001   | | Batch: SHP-2026-0001   | | Batch: SHP-2026...   | |
| | DN: DN-2026-0001       | | DN: DN-2026-0001       | | DN: DN-2026-0001     | |
| | OR: OR-2026-816972     | | OR: OR-2026-816972     | | OR: OR-2026-816972   | |
| | Product: P-001         | | Product: P-002         | | Product: P-003       | |
| | Qty: 20 pcs            | | Qty: 10 pcs            | | Qty: 5 pcs           | |
| | To: WH055 Jakarta Bar  | | To: WH055 Jakarta Bar  | | To: WH071 Jakarta    | |
| +------------------------+ +------------------------+ +----------------------+ |
+--------------------------------------------------------------------------------+
```

Label rules:

- Labels are generated from shipment batch items.
- Labels include Sales Point identity.
- Labels are printable before dispatch after batch is ready.

## Admin POD Verification Queue

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: POD Verification                              |
|                        +-------------------------------------------------------|
|                        | [Search POD, batch, DN, order, Sales Point] [Filters] |
|                        |                                                       |
|                        | [Status] [Vendor] [Client] [Variance] [Date]          |
|                        |                                                       |
|                        | | POD | Batch | DN | SP | Receiver | Exp | Rec | Var | |
|                        | |-----|-------|----|----|----------|-----|-----|-----| |
|                        | | POD | SHP   | DN | WH | Budi     | 60  | 50  | -10 | |
|                        |                                                       |
|                        | Detail Drawer                                         |
|                        | +---------------------------------------------------+ |
|                        | | Signed DN Preview | Photo Gallery                 | |
|                        | | Receiver fields   | Quantity comparison          | |
|                        | | Admin notes       | [Verify] [Reject] [Request] | |
|                        | +---------------------------------------------------+ |
+--------------------------------------------------------------------------------+
```

Verification rules:

- Verify updates received quantities.
- Reject preserves previous received quantities.
- Request correction sends the batch back to Vendor POD Upload.

## Sales Points List

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: Sales Points                 [Add] [Export]    |
|                        +-------------------------------------------------------|
|                        | [Search Sales Point, WCode, PIC, note] [Filters]      |
|                        | [Zone] [Region] [Area] [Sub Area] [Client]            |
|                        |                                                       |
|                        | | Zone | Region | Area | Sub Area | WCode | SP | PIC | |
|                        | |------|--------|------|----------|-------|----|-----| |
|                        |                                                       |
|                        | Row actions: Open Detail, Edit, View Shipments        |
+--------------------------------------------------------------------------------+
```

## Sales Point Detail

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: WH055 - Jakarta Barat                         |
|                        | Sales Points > WH055                                  |
|                        | [Edit] [Add Contact]                                  |
|                        +-------------------------------------------------------|
|                        |                                                       |
|                        | +----------------------------------+ +--------------+ |
|                        | | Profile                          | | Metrics      | |
|                        | | Zone / Region / Area             | | Allocated    | |
|                        | | Address                          | | Shipped      | |
|                        | | Delivery Instructions            | | Received     | |
|                        | +----------------------------------+ | POD Issues   | |
|                        |                                      +--------------+ |
|                        | [Contacts] [Allocations] [Shipments] [POD History]    |
|                        |                                                       |
|                        | | Date | OR | Batch | Product | Alloc | Ship | Rec | |
+--------------------------------------------------------------------------------+
```

## Vendor Dashboard

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: Vendor Dashboard                              |
|                        +-------------------------------------------------------|
| My Orders              | [Work Queue Cards]                                    |
| Shipment Batches       | +------------+ +------------+ +------------+          |
| POD Uploads            | | Pending    | | Ready Dist | | POD Due    |          |
| Inbox                  | +------------+ +------------+ +------------+          |
| My Profile             |                                                       |
|                        | [Ready for Shipment]       [Rejected POD]             |
|                        | | OR | Ready Qty | Action | | Batch | Reason |       |
|                        |                                                       |
|                        | [Active Shipment Batches]                             |
|                        | | Batch | OR | SP Count | Status | POD | Action |    |
+--------------------------------------------------------------------------------+
```

## Vendor My Orders

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: My Orders                       [Export]       |
|                        +-------------------------------------------------------|
|                        | [Search order, PO, project] [Filters]                 |
|                        | [Production Status] [Distribution Status] [POD]       |
|                        |                                                       |
|                        | | Client PO | OR | Project | Deadline | Prod | Dist | |
|                        | |-----------|----|---------|----------|------|------| |
|                        | | PO-001    | OR | VEEV    | 2026...  | QC   | Part | |
|                        |                                                       |
|                        | Row actions: Start Production, Update, Create Batch    |
+--------------------------------------------------------------------------------+
```

## Vendor Order Workbench

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: OR-2026-816972                                |
|                        | My Orders > OR-2026-816972                            |
|                        | [Update Production] [Create Batch]                    |
|                        +-------------------------------------------------------|
|                        |                                                       |
|                        | [Overview] [Production] [Eligible Allocations]        |
|                        | [Shipment Batches] [Delivery Notes] [POD Uploads]     |
|                        |                                                       |
|                        | Eligible Allocations                                  |
|                        | | SP | Product | Alloc | Shipped | Out. | Ready | Qty | |
|                        | |----|---------|-------|---------|------|-------|-----| |
|                        | | WH | P-001   | 100   | 60      | 40   | 40    | [20]| |
|                        |                                                       |
|                        | [Save Batch Draft] [Generate DN]                      |
+--------------------------------------------------------------------------------+
```

## Vendor Shipment Detail and POD Upload

```text
+--------------------------------------------------------------------------------+
| Sidebar                | Header: SHP-2026-0001                                 |
|                        | Shipment Batches > SHP-2026-0001                      |
|                        | [Print DN] [Print Labels] [Submit POD]                |
|                        +-------------------------------------------------------|
|                        |                                                       |
|                        | [Items] [Documents] [POD Upload] [Admin Feedback]     |
|                        |                                                       |
|                        | POD Upload                                             |
|                        | [Receiver Name] [Received Date]                       |
|                        | [Upload Signed Delivery Note]                         |
|                        | [Upload POD Photos]                                   |
|                        |                                                       |
|                        | | SP | Product | Shipped | Received Qty | Remarks |   |
|                        | |----|---------|---------|--------------|---------|   |
|                        | | WH | P-001   | 60      | [50]         | [...]   |   |
|                        |                                                       |
|                        | [Save Draft] [Submit for Verification]                |
+--------------------------------------------------------------------------------+
```

## Mobile Pattern

```text
+--------------------------------------+
| Header: Page Title        [Menu]     |
+--------------------------------------+
| [Primary Action] [More]              |
| [Search]                             |
| [Filters]                            |
|                                      |
| Table scroll container               |
| | Key columns stay left-aligned |    |
|                                      |
| Detail pages stack:                  |
| 1. Status summary                    |
| 2. Primary tab content               |
| 3. Metrics rail                      |
| 4. Audit and notes                   |
+--------------------------------------+
```

Mobile density rules:

- Keep operational tables horizontally scrollable instead of converting high-volume shipment data into oversized cards.
- Keep primary action visible in the header.
- Put less frequent actions under an overflow menu.
