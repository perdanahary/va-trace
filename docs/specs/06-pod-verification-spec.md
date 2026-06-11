# POD Verification Functional Specification

## 1. Business Purpose

Proof of Delivery Verification confirms that shipped goods were received at Sales Points. Vendors upload signed Delivery Notes and POD photos with claimed received quantities; Admin verifies, rejects, or requests corrections. Only verified POD updates received quantities and derived distribution status.

POD belongs to Shipment Batch and Sales Point, not directly to an Order Request.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Vendor | Upload signed DN, POD photos, receiver details, received quantities, and corrections. |
| Admin | Verify, reject, request correction, and update received quantities. |
| Operator | View POD and coordinate corrections when delegated. |
| Analyst | View POD metrics and compliance. |
| Client | View verified POD status/evidence when exposed. |

## 3. Preconditions

- Shipment Batch exists and is dispatched or otherwise eligible for POD.
- Delivery Note exists for the batch when DN workflow is required.
- Shipment items exist with shipped quantities.
- Vendor has access to the batch.
- Admin has verification permission.
- File upload policy and evidence requirements are configured.

## 4. Workflow

1. Vendor opens Vendor Shipment Detail or Vendor POD Upload route.
2. Vendor enters receiver name, received date, Sales Point, received quantities per shipment item, and remarks.
3. Vendor uploads signed Delivery Note.
4. Vendor uploads POD photos when required.
5. Vendor saves draft or submits POD for verification.
6. Submitted POD appears in Admin POD Verification queue.
7. Admin opens detail drawer with signed DN preview, photo gallery, receiver fields, submitted notes, and quantity comparison.
8. Admin verifies, rejects with reason, or requests correction.
9. If verified, system updates shipment item received quantities and derived allocation/order distribution status.
10. If rejected or correction requested, system preserves previous received quantities and returns the item to Vendor action queue.
11. Vendor resubmits corrected POD when requested.

## 5. Status Lifecycle

| Status | Meaning |
| --- | --- |
| Draft | Vendor has started POD but not submitted. |
| Pending verification | Vendor submitted POD and Admin has not decided. |
| Verified | Admin accepted evidence and quantities. |
| Rejected | Admin rejected evidence or quantities with reason. |
| Correction requested | Admin requires Vendor to revise submission. |
| Closed | POD is complete and batch/document closure has occurred. |

Rules:

- Draft is visible to Vendor and permitted Admin viewers but should not affect received quantities.
- Pending verification does not update received quantities.
- Verified updates received quantities.
- Rejected and correction requested do not update received quantities.
- Resubmission creates a new review event while retaining previous history.

## 6. Validation Rules

- Signed DN is required unless explicitly waived by policy.
- At least one POD photo is required when configured.
- Receiver name is required.
- Received date is required and cannot be in the future unless Admin override permits.
- Received quantity is required for each shipment item included in POD.
- Received quantity cannot be negative.
- Received quantity above shipped quantity must be flagged as overage and require Admin decision.
- Submission must reference the correct Shipment Batch and DN.
- Rejection requires a reason.
- Request correction requires a reason or correction instruction.
- Vendor cannot verify POD.
- Admin verification must be idempotent and must not double-count quantities on repeated action.

## 7. UI Components

- Vendor POD Upload page.
- Vendor Shipment Detail POD Upload tab.
- Admin POD Verification queue.
- POD evidence detail drawer.
- Signed DN preview.
- POD photo gallery.
- Quantity comparison table.
- Admin decision form.
- Rejection/correction reason field.
- POD status badge.
- Variance badge.
- Batch/order navigation links.

## 8. Table Columns

Admin POD queue:

| Column | Notes |
| --- | --- |
| POD ID | Unique evidence record. |
| Batch ID | Owning shipment batch. |
| DN number | Related Delivery Note. |
| Order ID | Source Order Request. |
| Vendor | Submitting vendor. |
| Sales Point | Destination. |
| Receiver name | Reported receiver. |
| Received date | Reported date. |
| Submitted by | Vendor user. |
| Submitted at | Submission timestamp. |
| Expected shipped quantity | Batch shipped quantity. |
| Claimed received quantity | Vendor-entered quantity. |
| Variance | Claimed received minus expected shipped. |
| Evidence count | Signed DN plus photos. |
| Verification status | Pending, verified, rejected, correction. |
| Action | Open evidence, verify, reject, request correction. |

Vendor POD item table:

| Column | Notes |
| --- | --- |
| Sales Point | Destination. |
| Product | Shipment item product. |
| Shipped quantity | Expected quantity. |
| Received quantity | Vendor claim. |
| Variance | Calculated after entry. |
| Remarks | Vendor delivery note. |

## 9. Filters

- Search by POD ID, batch ID, DN number, order ID, Sales Point.
- Vendor.
- Client.
- Project.
- Status: draft, pending, verified, rejected, correction.
- Variance type: none, shortage, overage.
- Evidence type: signed DN, photo.
- Missing signed DN.
- Missing photo.
- Submitted date range.
- Received date range.
- Aging threshold.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Save POD draft | Vendor | Stores incomplete evidence without submission. |
| Submit POD | Vendor | Sends evidence to Admin queue. |
| Replace evidence | Vendor | Updates draft or correction submission. |
| Open evidence | Admin, Vendor, Analyst | Reviews signed DN/photos and quantities. |
| Verify POD | Admin | Accepts evidence and updates received quantities. |
| Reject POD | Admin | Rejects evidence with reason; quantities unchanged. |
| Request correction | Admin | Returns to Vendor with correction instruction. |
| Update received quantities | Admin | Applies verified values or approved correction. |
| Resubmit POD | Vendor | Sends corrected evidence for new verification. |
| Export POD queue | Admin, Analyst | Exports status and compliance fields. |

## 11. Calculations

- Expected shipped quantity = sum of shipment item quantities covered by POD.
- Claimed received quantity = sum of Vendor-entered received quantities.
- Verified received quantity = Admin-accepted received quantity.
- Variance = claimed or verified received quantity minus shipped quantity.
- Shortage = shipped quantity minus verified received quantity when verified received is lower.
- Overage = verified received quantity minus shipped quantity when positive.
- POD compliance rate = verified POD count divided by dispatched batch count.
- POD aging = current date/time minus dispatch date or submission date, depending on report.
- Batch receipt progress = verified received quantity divided by shipped quantity.

## 12. Edge Cases

- Vendor uploads signed DN but no photos when photos are required.
- Vendor enters received quantity lower than shipped quantity.
- Vendor enters received quantity above shipped quantity.
- POD covers some Sales Points in a multi-Sales Point batch but not all.
- Receiver name differs from Sales Point contact.
- Signed DN image is unreadable or wrong DN.
- Vendor resubmits after rejection.
- Admin verifies with partial received quantity and leaves shortage unresolved.
- Admin rejects after previously verified submission due to correction policy; must not corrupt received totals.
- Delivery occurred but POD is missing after threshold.

## 13. Error Handling

- Block submission when required receiver, date, signed DN, or quantities are missing.
- Block invalid files by type or size.
- Show inline variance warnings before submission.
- Require Admin reason for rejection or correction.
- Preserve submitted evidence when verification action fails.
- Prevent duplicate verification from double-applying received quantities.
- Show conflict if shipment item quantities changed after POD draft started.
- Show unauthorized access when Vendor opens another Vendor's batch.
- Keep rejected evidence visible for audit and correction history.

## 14. Audit Trail Requirements

Audit must record:

- POD draft created.
- Evidence files uploaded, replaced, removed.
- Receiver details and received date changes.
- Received quantity claims by item.
- POD submitted.
- Admin verification decision.
- Rejection/correction reasons.
- Resubmission history.
- Verified received quantity updates.
- Distribution status changes caused by verification.
- Batch closure linked to POD completion.

Each event must include actor, role, timestamp, batch ID, DN number, Sales Point, previous/new quantities, reason/comment, and source screen.

## 15. Future Extension Points

- Mobile camera capture for POD.
- OCR matching of signed DN number and receiver fields.
- Geotagged POD photos.
- Receiver OTP or digital signature.
- Automated POD quality scoring.
- WhatsApp reminder for missing POD.
- Client-visible POD portal.
- Installation confirmation after delivery.
