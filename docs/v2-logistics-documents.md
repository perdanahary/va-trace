# V2 Logistics Documents

## Shipment Batch as Source of Truth

Delivery Notes are generated from Shipment Batches. Packaging labels, receiver snapshots, shipped quantities, and POD records all bind back to a shipment batch.

Order-level delivery documents are compatibility views only. They should resolve to the current or first shipment batch before rendering.

## Shipment Batch Contents

A Shipment Batch contains:

- Batch ID
- Order Request ID
- Batch number
- Status
- Sales Point IDs
- Shipment items
- Dispatch date
- Delivery Note ID
- Delivery confirmations

## Shipment Item Contents

A shipment item contains:

- Order line ID
- Product code
- Sales Point ID
- Shipped quantity
- Received quantity

## Delivery Note Contents

A Delivery Note contains:

- DN number
- Shipment Batch ID
- PO number
- SO number
- Project name
- Sender snapshot
- Delivery destination snapshot
- Shipment item lines
- Signature fields
- Delivery Note lifecycle status

## POD Workflow

POD records are Delivery Confirmations attached to a Shipment Batch.

The POD workflow is:

1. Shipment Batch is dispatched.
2. Receiver signs or stamps Delivery Note.
3. Vendor uploads scanned DN and POD photos.
4. Admin verifies or rejects the POD.
5. Received quantities update allocations and distribution status.
