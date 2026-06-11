# Delivery Note Functional Specification

## 1. Business Purpose

Delivery Notes are official batch-scoped logistics documents. They communicate what was shipped, from whom, to which Sales Point destinations, under which Order Request and Shipment Batch, and provide fields for receiver confirmation, signature, date, and stamp.

In V2, Delivery Notes are never the default source of truth at the order level. One Shipment Batch may generate one Delivery Note, and one Order Request may therefore have multiple Delivery Notes.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Vendor | Generate/print DN, obtain signature, upload signed DN as POD evidence. |
| Admin | Generate/print DN, review document status, verify signed DN through POD. |
| Operator | Prepare and print DNs when delegated. |
| Analyst | View DN register and document history. |
| Client | View verified delivery documents when exposed. |

## 3. Preconditions

- Shipment Batch exists with at least one shipment item.
- Batch has valid source Order Request, Client, Vendor, Project, and Sales Point data.
- Destination snapshot fields are available: Sales Point code/name, address, contacts, delivery instructions where applicable.
- DN number can be generated uniquely.
- User has document permissions for the batch.

## 4. Workflow

1. User opens Shipment Batch Detail or Order Detail Delivery Notes tab.
2. If no DN exists for the batch, user generates DN.
3. System assigns DN number and snapshots sender, recipient, order, batch, and item data.
4. User opens DN print view.
5. User prints the DN.
6. Printed DN travels with shipment and is signed/stamped by receiver.
7. Vendor uploads signed DN during POD upload.
8. Admin reviews signed DN during POD verification.
9. DN status advances through uploaded, verified, and closed according to POD outcome and batch closure.
10. Order-level Delivery Notes tab lists every batch DN separately.

## 5. Status Lifecycle

| Status | Meaning |
| --- | --- |
| `GENERATED` | DN record and number exist for a batch. |
| `PRINTED` | DN print action has been recorded. |
| `SIGNED` | Signed document exists or Vendor marks signed before upload where supported. |
| `UPLOADED` | Signed DN file has been uploaded as POD evidence. |
| `VERIFIED` | Admin accepted signed DN during POD verification. |
| `CLOSED` | Batch and document are administratively complete. |

Rules:

- `GENERATED` precedes print.
- `UPLOADED` requires a file attachment.
- `VERIFIED` requires Admin verification.
- `CLOSED` requires batch closure or document closure policy.
- Rejected POD does not move DN to `VERIFIED`.

## 6. Validation Rules

- One Shipment Batch can have only one active Delivery Note.
- DN number must be unique.
- DN must include Shipment Batch ID and Order ID.
- DN item lines must be sourced from Shipment Batch items, not total order lines.
- Shipped quantity on DN must equal batch shipped quantity by item line.
- Outstanding quantity on DN must be relative to order allocation context.
- DN print must not merge multiple batches into one default document.
- Legacy order-level DN routes must ask user to select a batch when multiple batches exist.
- Uploaded signed DN file must be an allowed file type and within configured size limits.
- Admin verification must validate that uploaded signed DN corresponds to the batch/DN being verified.

## 7. UI Components

- Delivery Notes Register table.
- Order Detail Delivery Notes tab.
- Shipment Batch Detail Delivery Note section.
- Delivery Note print view with A4 portrait layout.
- Batch selector dialog for order-level compatibility routes.
- Document status badge.
- QR/barcode display.
- Print button and back-to-batch action.
- POD evidence drawer showing signed DN preview.

## 8. Table Columns

Delivery Notes Register:

| Column | Notes |
| --- | --- |
| DN number | Unique document number. |
| Shipment Batch ID | Owning batch. |
| Order ID | Source demand. |
| Client PO | External reference. |
| Vendor | Execution partner. |
| Sales Point count | Distinct destinations in batch. |
| Shipped quantity | Quantity on batch/DN. |
| Generated at | DN creation timestamp. |
| Printed at | Latest print timestamp. |
| Uploaded at | Signed DN upload timestamp. |
| DN status | Document lifecycle. |
| POD status | Verification state. |
| Action | Print, open batch, view POD, export. |

Delivery Note item lines:

| Column | Notes |
| --- | --- |
| PO line | Order line reference. |
| Material code | Product/SKU. |
| Description | Product description/specification. |
| Ordered quantity | Original demand context. |
| Allocated quantity | Sales Point allocation context when relevant. |
| Shipped quantity | Quantity in the batch. |
| Outstanding quantity | Allocation remaining after this batch. |
| Unit | Unit of measure. |
| Remarks | Shipment note. |

## 9. Filters

- Search by DN number, batch ID, order ID, client PO, Sales Point code/name.
- DN status.
- POD status.
- Vendor.
- Client.
- Project.
- Printed date range.
- Uploaded date range.
- Missing POD.
- Exception only.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Generate DN | Vendor, Admin, Operator | Creates batch-scoped DN. |
| Print DN | Vendor, Admin, Operator | Opens/prints A4 document and records print event. |
| Open batch | All permitted users | Navigates to owning Shipment Batch. |
| View POD | Admin, Vendor, Analyst | Opens POD evidence tied to DN. |
| Upload signed DN | Vendor | Adds signed file during POD workflow. |
| Verify signed DN | Admin | Accepts document evidence through POD verification. |
| Export register | Admin, Analyst, Operator | Exports document list and statuses. |

## 11. Calculations

- DN shipped quantity = sum of shipment item quantities for the owning batch.
- DN Sales Point count = count of distinct Sales Points in the owning batch.
- DN outstanding quantity per line = allocation quantity minus cumulative shipped quantity after the batch.
- DN print count = number of recorded print events.
- DN aging = current date/time minus generated/printed/uploaded timestamp depending on status.
- Missing POD flag = DN is printed/dispatched but no signed DN/POD submission exists after configured threshold.

## 12. Edge Cases

- Order has one batch and one DN; legacy route may open that DN directly.
- Order has multiple batches and multiple DNs; legacy route must show batch selector.
- Batch contains multiple Sales Points; DN must clearly list destinations or destination sections.
- Batch includes partial quantities; DN shows batch shipped quantity and outstanding allocation.
- Sales Point master data changes after DN generation; DN keeps generated snapshot unless regenerated by authorized correction.
- DN printed before batch dispatch.
- DN uploaded with poor image quality or wrong document; Admin rejects through POD verification.
- Compatibility batch generated from legacy order data has a default DN flagged in audit.

## 13. Error Handling

- Block DN generation when batch has no shipment items.
- Block duplicate DN generation for the same batch unless regenerating through controlled correction.
- Show clear message when order-level route cannot choose a default batch.
- Preserve user context if print view fails to load.
- Show missing required document fields before print.
- Reject upload when file type/size is invalid.
- Reject verification when DN number does not match the batch.
- Log print failure or blocked popup only when detectable by the app; otherwise provide retry.

## 14. Audit Trail Requirements

Audit must record:

- DN generated and generated by.
- DN number assigned.
- Snapshot version of sender, destination, order, and item data.
- DN printed, including actor and timestamp.
- Signed DN uploaded, replaced, or removed.
- POD verification decision affecting DN status.
- DN regenerated/corrected with reason.
- DN closed.
- Legacy route batch selection when relevant for compatibility tracking.

Each event must include actor, role, timestamp, source screen, document ID, batch ID, and reason where required.

## 15. Future Extension Points

- Digital signature capture.
- Receiver portal for DN confirmation.
- QR scan validation of DN authenticity.
- Multi-language DN templates.
- Client-specific document templates.
- Courier-integrated delivery manifest.
- Document versioning with watermark for regenerated DNs.
- Automated signed-DN OCR checks.
