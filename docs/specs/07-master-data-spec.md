# Master Data Functional Specification

## 1. Business Purpose

Master Data provides reusable, governed records for Clients, Projects, Vendors, Products, Sales Points, Sales Point Contacts, Users, and related reference data. V2 depends on master data quality because Sales Point Allocation, Shipment Batch, Delivery Notes, shipping labels, and POD verification must reference durable entities rather than free-text values.

## 2. Actors

| Actor | Responsibilities |
| --- | --- |
| Admin | Create, update, deactivate, export, and audit master records. |
| Operator | Use and update allowed operational master data, especially Sales Point matching during import. |
| Analyst | View and export master records. |
| Vendor | View own vendor profile and shipment-related destination context. |
| Client | View client/project/Sales Point context when exposed. |

## 3. Preconditions

- Admin user has master data permissions.
- Required reference hierarchies are defined: Zone, Region, Area, Sub Area.
- Product and Sales Point uniqueness rules are configured.
- User role and ownership model are defined.
- Import mapping rules exist for matching Sales Points and Products.

## 4. Workflow

1. Admin opens the relevant master data list: Sales Points, Suppliers/Vendors, Products, Brands, Clients, Users, or Projects through order context.
2. User searches, filters, and opens an existing record or starts a new one.
3. User enters required fields and optional operational metadata.
4. System validates uniqueness, required fields, relationships, and active/inactive constraints.
5. User saves the record.
6. Downstream workflows reference the master record by ID/code.
7. When master data changes after shipment/document generation, existing documents retain their generated snapshots while future workflows use current master data.
8. Audit captures all changes and deactivations.

## 5. Status Lifecycle

General master records:

| Status | Meaning |
| --- | --- |
| Active | Available for new orders, allocations, shipments, and user assignment. |
| Inactive | Preserved for history but not selectable for new workflows. |
| Draft | Optional state for incomplete records not available operationally. |
| Needs review | Imported or matched record requires Admin confirmation. |

Sales Point data quality states:

| State | Meaning |
| --- | --- |
| Complete | Required address and contact data exists. |
| Missing contact | No valid contact/PIC/phone where required. |
| Missing address | Address or geography is incomplete. |
| Delivery instruction missing | Optional but operationally relevant delivery instructions absent. |
| Repeated issue | Recent POD or delivery exceptions exist. |

## 6. Validation Rules

- Client name is required and must be unique within active clients where configured.
- Project must reference a Client.
- Vendor name is required; vendor users must map to one vendor.
- Product code/material code must be unique within the product namespace.
- Product must have name/description and unit of measure.
- Sales Point code/WCode must be unique within client or global namespace according to configuration.
- Sales Point must include Zone, Region, Area, Sub Area when geography is required.
- Sales Point address is required before dispatch unless waived by Admin.
- Sales Point Contact name and phone/email are required where contact policy applies.
- Users require role, status, and ownership scope.
- Inactive records remain visible in historical data but are not selectable for new operational records.
- Records referenced by orders, allocations, batches, DNs, or POD cannot be hard-deleted; they can be deactivated.

## 7. UI Components

- Master data list pages with Card + Table.
- FilterSection for search and geography filters.
- Detail pages for Sales Points, Clients, Products, Suppliers, Users.
- Create/edit dialogs or pages.
- Sales Point Detail tabs: Profile, Contacts, Allocations, Shipment History, POD History, Notes.
- Missing data badges/alerts.
- Contact table.
- Operational history tables.
- Export CSV actions.
- Audit/history tab or timeline.

## 8. Table Columns

Sales Points list:

| Column | Notes |
| --- | --- |
| Zone | Geography hierarchy. |
| Region | Geography hierarchy. |
| Area | Geography hierarchy. |
| Sub Area | Geography hierarchy. |
| WCode | Sales Point code. |
| Sales Point | Destination name. |
| Client | Associated client. |
| Entity | Store/entity classification. |
| PIC | Primary contact. |
| Phone | Contact phone. |
| Delivery instruction state | Complete/missing/issue. |
| Action | Open detail, edit, view shipments, export. |

Product list:

| Column | Notes |
| --- | --- |
| Product code/material code | Primary product identifier. |
| Product name | POSM name. |
| Brand/client | Ownership context when applicable. |
| Specification | Material details. |
| Unit | Unit of measure. |
| Status | Active/inactive. |
| Action | View, edit, export. |

Vendor/Supplier list:

| Column | Notes |
| --- | --- |
| Vendor name | Execution partner. |
| Contact | Primary contact. |
| Email/phone | Communication. |
| Active orders | Operational count. |
| Active batches | Logistics count. |
| Status | Active/inactive. |
| Action | View, edit, export. |

User list:

| Column | Notes |
| --- | --- |
| Name | User display name. |
| Email | Login/contact. |
| Role | Admin, Operator, Analyst, Client, Vendor. |
| Ownership scope | Client/vendor binding if applicable. |
| Status | Active/inactive. |
| Last activity | Optional audit metric. |
| Action | View, edit, deactivate. |

## 9. Filters

- Text search by name, code, WCode, PIC, phone, note.
- Client.
- Vendor.
- Brand.
- Product status.
- User role.
- User status.
- Zone, Region, Area, Sub Area.
- Missing contact.
- Missing address.
- Delivery issue/recent POD exception.
- Active/inactive.
- Import match status.

## 10. User Actions

| Action | Actor | Result |
| --- | --- | --- |
| Create master record | Admin | Adds reusable operational entity. |
| Edit master record | Admin, delegated Operator | Updates future workflow source data. |
| Deactivate record | Admin | Prevents new selection while preserving history. |
| Add Sales Point contact | Admin, delegated Operator | Adds receiver/logistics contact. |
| Confirm import match | Admin, Operator | Links imported value to master record. |
| Export CSV | Admin, Analyst, Operator | Exports visible master data. |
| View operational history | Admin, Operator, Analyst | Shows allocations, shipments, POD by master record. |
| Edit vendor profile | Vendor | Updates own profile fields if permitted. |
| Manage users | Admin | Creates, updates, deactivates user access. |

## 11. Calculations

- Sales Point allocated quantity = sum of allocation quantities for selected period/context.
- Sales Point shipped quantity = sum of shipment item quantities for selected period/context.
- Sales Point received quantity = sum of verified POD quantities for selected period/context.
- Sales Point POD issue count = count of rejected, correction, variance, or missing POD records.
- Vendor active order count = assigned non-completed/non-cancelled orders.
- Vendor active batch count = batches not closed.
- Product usage count = number of order lines referencing product.
- Master data completeness score = percentage of required fields present for a record or dataset.

## 12. Edge Cases

- Sales Point code changes after historical shipments exist; history must remain linked.
- Sales Point merged/renamed due to duplicate import.
- Product code imported with client-specific alias.
- Vendor user changes vendor ownership.
- Client becomes inactive while historical orders remain visible.
- Project is created during order creation.
- Sales Point has multiple contacts with different roles.
- Address is temporarily missing but urgent order needs drafting.
- Deactivated product appears in historical order detail.
- Imported row matches multiple Sales Points with similar names.

## 13. Error Handling

- Block hard delete for records referenced by operational entities.
- Show duplicate validation before save.
- Show relationship violation when deactivating a record with active operational dependency.
- Warn that document snapshots will not retroactively change when master data is edited.
- Require Admin confirmation for merge/remap actions.
- Show import match errors with row-level details.
- Preserve form input when save fails.
- Block user creation without role and ownership scope.
- Prevent inactive records from being selected in new orders unless Admin override permits.

## 14. Audit Trail Requirements

Audit must record:

- Master record created, edited, deactivated, reactivated.
- Field-level previous/new values for critical fields.
- Sales Point contact additions, edits, removals.
- Import match confirmations and remaps.
- Duplicate merge decisions.
- User role/scope/status changes.
- Vendor profile changes.
- Admin overrides for incomplete data use.

Each event must include actor, role, timestamp, entity type, entity ID/code, previous value, new value, source screen, and reason where required.

## 15. Future Extension Points

- Master data approval workflow.
- Bulk import/export with staging and rollback.
- Address geocoding.
- Sales Point hierarchy management UI.
- Client-specific product catalog.
- Vendor capability matrix by region/product.
- Duplicate detection and merge suggestions.
- External master data sync with SAP/Coupa/client systems.
