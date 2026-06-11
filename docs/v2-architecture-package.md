# V2 Architecture Package

## POSM Production & Distribution Management Platform

Version: 2.0

---

# 1. DOMAIN OVERVIEW

## Business Context

PMG creates POSM requests that are executed by vendors.

Vendors:

* Produce POSM materials
* Distribute materials
* Deliver to Sales Points
* Generate Delivery Notes
* Upload Proof of Delivery

The platform must support:

* Multiple clients
* Multiple vendors
* Thousands of sales points
* Partial production
* Partial shipment
* Multiple shipment batches
* Multiple delivery notes per order
* Proof of delivery tracking
* Future installation verification

---

# 2. CORE BUSINESS ENTITIES

## Client

Represents PMG customer.

Examples:

* HM Sampoerna
* Coca-Cola
* Nestle

Relationships:

Client
→ Projects
→ Sales Points
→ Orders

---

## Project

Campaign or activity.

Examples:

* VEEV Launch 2026
* Ramadhan Program
* Retail Branding Q3

Relationships:

Project
→ Order Requests

---

## Sales Point

Primary delivery destination.

Examples:

* PT HMS Medan 1
* DPC Meulaboh
* Banda Aceh Distribution Point

Hierarchy:

Zone
→ Region
→ Area
→ Sub Area
→ Sales Point

Contains:

* Address
* Contacts
* Delivery Instructions

---

## Sales Point Contact

Contacts attached to a Sales Point.

Examples:

* ARA
* SRE
* SPV DPC

Contains:

* Name
* Email
* Phone
* Role

---

## Vendor

Production and distribution partner.

Examples:

* HH Global
* Vendor A
* Vendor B

Responsibilities:

* Production
* Distribution
* Delivery Notes
* POD Upload

---

## Order Request

Business request from PMG.

Represents demand.

Contains:

* Project
* Vendor
* POSM items
* Sales Point allocations

Does NOT represent shipment.

---

## Order Item

POSM material.

Examples:

* Banner
* Poster
* Sticker
* Snap Frame

Contains:

* SKU
* Material Code
* Specifications
* Quantity

---

## Production Job

Manufacturing execution.

Tracks:

* Printing
* Finishing
* QC

Generated from Order Request.

---

## Sales Point Allocation

Allocation layer between order and sales point.

Represents:

Sales Point X receives Y quantity.

Supports:

* Partial shipping
* Partial delivery

---

## Shipment Batch

Physical shipment event.

Examples:

Batch 1
Batch 2
Batch 3

Contains:

* Sales Points
* Items
* Quantities

Can generate one Delivery Note.

---

## Delivery Note

Official logistics document.

Generated from Shipment Batch.

Contains:

* DN Number
* Receiver
* Items
* Quantities
* Signature

Example:

DEL202603110018

---

## Delivery Confirmation

Proof that shipment was received.

Contains:

* Receiver Name
* Date
* Signature
* Stamp
* Scanned DN
* POD Photos

---

## Installation Confirmation (Future)

Optional future phase.

Tracks:

* Installed
* Not Installed
* Installation Photos

---

# 3. ORDER LIFECYCLE

## Production Status

NEW

SUBMITTED

ACCEPTED

PRINTING

FINISHING

QUALITY_CONTROL

READY_FOR_DISTRIBUTION

COMPLETED

CANCELLED

---

## Distribution Status

NOT_STARTED

PARTIALLY_DISTRIBUTED

FULLY_DISTRIBUTED

PARTIALLY_RECEIVED

FULLY_RECEIVED

EXCEPTION

---

## Completion Rule

Order can only become COMPLETED when:

Production Status = COMPLETED

AND

All Allocated Quantities Received

---

# 4. SHIPMENT LIFECYCLE

Shipment Batch

DRAFT

READY

DISPATCHED

IN_TRANSIT

PARTIALLY_RECEIVED

FULLY_RECEIVED

CLOSED

---

# 5. DELIVERY NOTE LIFECYCLE

GENERATED

PRINTED

SIGNED

UPLOADED

VERIFIED

CLOSED

---

# 6. DATA RELATIONSHIPS

Client
1:N Project

Client
1:N Sales Point

Project
1:N Order Request

Order Request
1:N Order Item

Order Request
1:N Production Job

Order Request
1:N Sales Point Allocation

Order Request
1:N Shipment Batch

Shipment Batch
1:1 Delivery Note

Shipment Batch
1:N Shipment Item

Shipment Batch
1:N Shipment Sales Point

Sales Point
1:N Delivery Confirmation

Delivery Note
1:N Delivery Confirmation

---

# 7. REPORTING MODEL

Production Metrics

* Orders In Production
* Orders In QC
* Production Lead Time

Distribution Metrics

* Distributed Quantity
* Received Quantity
* Delivery Success Rate

Sales Point Metrics

* Total Sales Points
* Delivered Sales Points
* Pending Sales Points

Vendor Metrics

* Production SLA
* Distribution SLA
* POD Compliance

---

# 8. FUTURE-PROOF FEATURES

Phase 2

* POD photo upload
* Installation photo upload
* Geo-tagging
* Delivery route tracking

Phase 3

* Courier integration
* WhatsApp notifications
* Sales Point portal

Phase 4

* Coupa integration
* SAP integration
* Vendor performance scoring

---
