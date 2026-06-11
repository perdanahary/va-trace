# Page Entity Matrix

## Entity Legend

| Entity | Meaning |
| --- | --- |
| Client | PMG customer. |
| Project | Campaign or activity. |
| Vendor | Production and distribution partner. |
| Order Request | Demand-level order. |
| Order Item | POSM material line. |
| Production Job | Manufacturing execution. |
| Sales Point | Delivery destination. |
| Sales Point Contact | Receiver or logistics contact. |
| Sales Point Allocation | Planned quantity for a Sales Point and item. |
| Shipment Batch | Physical shipment event. |
| Shipment Item | Quantity shipped for an allocation line. |
| Delivery Note | Official batch-scoped logistics document. |
| Shipping Label | Printed package label generated from batch items. |
| Delivery Confirmation | POD record attached to a batch and Sales Point. |
| User | Internal or external app user. |
| Message | Inbox or collaboration item. |

## Matrix Key

| Mark | Meaning |
| --- | --- |
| R | Read. |
| C | Create. |
| U | Update. |
| V | Verify or approve. |
| P | Print. |
| X | Export. |

## Admin Pages

| Page | Client | Project | Vendor | Order Request | Order Item | Production Job | Sales Point | Sales Point Contact | Allocation | Shipment Batch | Shipment Item | Delivery Note | Shipping Label | Delivery Confirmation | User | Message |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | R | R | R | R | R | R | R |  | R | R | R | R | R | R |  | R |
| All Orders | R | R | R | R/X | R | R | R |  | R | R | R | R | R | R |  |  |
| Order Detail - Overview | R | R | R | R/U | R | R | R | R | R | R | R | R | R | R |  |  |
| Order Detail - Allocations | R | R | R | R | R |  | R | R | R/U | R | R |  |  | R |  |  |
| Order Detail - Production | R | R | R | R | R | R |  |  |  |  |  |  |  |  |  |  |
| Order Detail - Shipment Batches | R | R | R | R | R |  | R |  | R | R/C/U | R/C/U | R/P | R/P | R |  |  |
| Order Detail - Delivery Notes | R | R | R | R | R |  | R | R | R | R | R | R/P/X | R | R |  |  |
| Order Detail - POD | R | R | R | R | R |  | R | R | R | R/U | R/U | R | R | R/V/U |  |  |
| Create OR | R | C/R | R | C | C |  | R | R | C |  |  |  |  |  |  |  |
| Imports | R | R | R/U | C/R | C/R |  | R/U | R | C/R/U |  |  |  |  |  |  |  |
| Shipment Batches | R | R | R | R | R |  | R |  | R | R/C/U/X | R | R/P | R/P | R |  |  |
| Shipment Batch Detail | R | R | R | R | R |  | R | R | R/U | R/U | R/U | R/P | R/P | R/V/U |  |  |
| Delivery Notes Register | R | R | R | R | R |  | R | R | R | R | R | R/P/X | R | R |  |  |
| Delivery Note Print | R | R | R | R | R |  | R | R | R | R | R | R/P |  |  |  |  |
| Shipping Labels Print | R | R | R | R | R |  | R | R | R | R | R | R | R/P |  |  |  |
| POD Verification | R | R | R | R | R |  | R | R | R/U | R/U | R/U | R | R | R/V/U/X |  |  |
| Sales Points | R |  |  |  |  |  | R/C/U/X | R | R | R | R |  |  | R |  |  |
| Sales Point Detail | R | R | R | R | R |  | R/U | R/C/U | R | R | R | R | R | R |  |  |
| Suppliers |  |  | R/C/U/X | R |  |  |  |  |  | R |  |  |  |  |  |  |
| Products | R | R |  | R | R/C/U/X |  |  |  | R | R | R |  |  |  |  |  |
| Brands | R | R |  |  | R |  |  |  |  |  |  |  |  |  |  |  |
| Clients | R/C/U/X | R |  | R |  |  | R | R | R |  |  |  |  |  |  |  |
| Users |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R/C/U/X |  |
| Inbox | R | R | R | R |  |  | R |  |  | R |  | R |  | R | R | R/U |

## Vendor Pages

| Page | Client | Project | Vendor | Order Request | Order Item | Production Job | Sales Point | Sales Point Contact | Allocation | Shipment Batch | Shipment Item | Delivery Note | Shipping Label | Delivery Confirmation | User | Message |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vendor Dashboard | R | R | R | R | R | R | R |  | R | R | R | R | R | R |  | R |
| My Orders | R | R | R | R | R | R/U | R |  | R | R | R | R | R | R |  |  |
| Order Workbench - Overview | R | R | R | R | R | R/U | R | R | R | R | R | R | R | R |  |  |
| Order Workbench - Production | R | R | R | R | R/U | R/U |  |  |  |  |  |  |  |  |  |  |
| Order Workbench - Eligible Allocations | R | R | R | R | R | R | R | R | R | C/R/U | C/R/U |  |  |  |  |  |
| Order Workbench - Shipment Batches | R | R | R | R | R |  | R |  | R | R/C/U | R/C/U | R/P | R/P | R |  |  |
| Vendor Shipment Batches | R | R | R | R | R |  | R |  | R | R/U/X | R | R/P | R/P | R |  |  |
| Vendor Shipment Detail | R | R | R | R | R |  | R | R | R | R/U | R/U | R/P | R/P | C/R/U |  |  |
| Vendor POD Upload | R | R | R | R | R |  | R | R | R | R/U | R/U | R | R | C/R/U |  |  |
| Delivery Note Print | R | R | R | R | R |  | R | R | R | R | R | R/P |  |  |  |  |
| Shipping Labels Print | R | R | R | R | R |  | R | R | R | R | R | R | R/P |  |  |  |
| Vendor Profile |  |  | R/U |  |  |  |  |  |  |  |  |  |  |  | R |  |
| Vendor Inbox | R | R | R | R |  | R | R |  |  | R |  | R |  | R | R | R/U |

## Operator and Analyst Pages

| Page | Client | Project | Vendor | Order Request | Order Item | Production Job | Sales Point | Allocation | Shipment Batch | Delivery Note | Shipping Label | Delivery Confirmation | User |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Operator Dashboard | R | R | R | R | R | R | R | R | R | R | R | R |  |
| Operator All Orders | R | R | R | R/X | R | R | R | R | R | R | R | R |  |
| Operator Create OR | R | C/R | R | C | C |  | R | C |  |  |  |  |  |
| Operator Imports | R | R | R/U | C/R | C/R |  | R/U | C/R/U |  |  |  |  |  |
| Operator Order Detail | R | R | R | R/U | R | R | R | R/U | R/C/U | R/P | R/P | R/U |  |
| Analyst Dashboard | R | R | R | R | R | R | R | R | R | R | R | R | R |
| Analyst All Orders | R | R | R | R/X | R | R | R | R | R | R | R | R | R |
| Analyst Order Detail | R | R | R | R | R | R | R | R | R | R | R | R | R |
| Analyst Users |  |  |  |  |  |  |  |  |  |  |  |  | R |

## Client Pages

| Page | Client | Project | Vendor | Order Request | Order Item | Production Job | Sales Point | Sales Point Contact | Allocation | Shipment Batch | Delivery Note | Shipping Label | Delivery Confirmation | Message |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Client Dashboard | R | R | R | R | R | R | R |  | R | R | R |  | R | R |
| Create Order | R | R |  | C | C |  | R | R | C |  |  |  |  |  |
| Client Imports | R | R |  | C/R | C/R |  | R | R | C/R |  |  |  |  |  |
| Order Tracking | R | R | R | R | R | R | R |  | R | R | R |  | R |  |
| Inbox | R | R | R | R |  |  | R |  |  | R | R |  | R | R/U |

## Entity Ownership Rules

| Entity | Primary Owner | UI Rule |
| --- | --- | --- |
| Order Request | Admin, Operator, Client | Created as demand; do not mutate delivery status directly from order-level controls. |
| Order Item | Admin, Operator, Vendor for progress | Production progress can update item readiness; shipment quantities come from batches. |
| Sales Point | Admin | Must be searchable and reusable; never store only free-text destination on shipments. |
| Sales Point Allocation | Admin, Operator | Vendor can select eligible outstanding quantities into batches but should not change original allocation without approval. |
| Shipment Batch | Vendor or Admin | Batch is the source of truth for dispatch, DN, labels, and POD. |
| Delivery Note | Generated by system from Shipment Batch | Print and upload state belongs to the batch document. |
| Shipping Label | Generated by system from Shipment Batch items | One label or label set per shipped line/package; labels include batch and Sales Point identity. |
| Delivery Confirmation | Vendor creates, Admin verifies | Verification updates received quantities and derived statuses. |

## Derived Status Dependencies

| Derived Field | Inputs | Displayed On |
| --- | --- | --- |
| Production Status | Production Job and Order Item readiness. | Dashboard, All Orders, Order Detail, Vendor Orders. |
| Distribution Status | Allocated, shipped, and received quantities. | Dashboard, All Orders, Order Detail, Sales Point Detail. |
| Delivery Progress | Sales Point Allocation totals and Shipment Batch received quantities. | Dashboard, All Orders, Order Detail right rail. |
| Shipment Batch Status | Batch lifecycle and delivery confirmations. | Shipment lists, Shipment Detail, Order Detail. |
| Delivery Note Status | Generated, printed, uploaded, verified, closed. | Delivery Notes register, Shipment Detail, Order Detail. |
| POD Status | Delivery Confirmation verification state. | POD queues, Shipment Detail, Sales Point Detail. |
