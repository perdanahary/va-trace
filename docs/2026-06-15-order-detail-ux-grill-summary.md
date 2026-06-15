# Order Detail UX Refactor — Grill Session Q&A Record

- **Date:** 2026-06-15
- **Purpose:** Documenting alignment decisions made during the `/grill-me` interactive interview session prior to drafting the implementation plan, including all options considered.

---

### Question 1: Header Primary Actions
**Question:** What should the primary action in the header be when the order is 'Not Started' and jobs are 'Submitted'?

* **Options Considered:**
  * [x] **Option A (Recommended):** Hide the primary action button entirely (or show 'Amend Order' if permitted by policy) and display a status indicator showing the order is locked for production, since the vendor is already committed to manufacturing them.
  * [ ] **Option B:** Keep the 'Create Shipment Batch' button visible but disabled, with a clear tooltip/popover explaining that no items have been marked 'Ready' by the vendor yet.
  * [ ] **Option C:** Dynamically switch the primary action to 'Amend Order' (to adjust deadline/priority) or 'Resolve Allocation Issues' (if there are blocked allocations in the sidebar), and demote the batch creation to a hidden state.
* **Context/Rationale:** 
  The vendor cannot reject jobs once assigned. Therefore, the Admin does not need to nudge them or trigger a manual acceptance follow-up. Since production hasn't completed, creating a shipment batch is invalid. The UI will show a status label indicating the order is locked for production, removing the primary action button.

---

### Question 2: Content Tab Consolidation
**Question:** How should we structure the content tabs in the 'Not Started' and 'Submitted' states?

* **Options Considered:**
  * [x] **Option A (Recommended):** Dynamically simplify the tabs: show only 'Overview', 'Allocations & Jobs' (combining allocations and production jobs), and 'Audit History'. Hide 'Documents' and 'Compliance' entirely until shipment activity begins.
  * [ ] **Option B:** Keep all tabs visible but disable 'Documents' and 'Compliance' (making them unclickable) with a tooltip explaining that they unlock when the first shipment batch is created.
  * [ ] **Option C:** Keep all tabs active, but design a unified, illustrative empty state for 'Documents' and 'Compliance' that clearly explains the lifecycle dependency (e.g., 'No Delivery Notes yet. They will appear here once shipment batches are created').
* **Context/Rationale:** 
  In this phase, the Documents and Compliance tabs are completely empty. Rather than displaying empty tables and generic text, hiding them keeps the Admin focused on current active tasks (reviewing allocations and production status) and reduces cognitive clutter.

---

### Question 3: Sidebar Streamlining
**Question:** How should we streamline the sidebar components (Documents, Exceptions) in the early phase?

* **Options Considered:**
  * [x] **Option A (Recommended):** Hide both the 'Documents' and 'Exceptions & Complaints' cards entirely from the sidebar, since they contain only zero/default values and their related tabs are hidden.
  * [ ] **Option B:** Keep them visible but collapsed by default, allowing the user to expand them if they explicitly want to inspect them.
  * [ ] **Option C:** Consolidate them into a single, compact 'Fulfillment Prep' card that only highlights whether allocations are fully approved and vendor jobs are acknowledged, rather than showing empty document counts.
* **Context/Rationale:** 
  Similar to the content tabs, these sidebar cards offer no useful information when the order is just submitted (0 documents generated, 0 exceptions active). Hiding them streamlines the At-a-Glance panel to show only the essential order metadata, focus card, and internal notes.

---

### Question 4: Production Progress Visualization
**Question:** How should the Production Progress be visualized on the Overview tab?

* **Options Considered:**
  * [x] **Option A (Recommended):** Replace the 'Delivery progress' card entirely with a 'Production Pipeline' stepper (Submitted ➔ Accepted ➔ Printing ➔ QC ➔ Ready). Once items start being marked as ready, show a secondary progress bar for 'Ready for Shipping' (e.g., '500/2500 pcs ready').
  * [ ] **Option B:** Keep the 'Delivery progress' bar card but add the 'Production Pipeline' stepper directly above it, maintaining both visual indicators.
  * [ ] **Option C:** Render a unified, combined progress bar showing two colored segments: one for 'In Production' quantity and another for 'Ready' quantity, with status badges below.
* **Context/Rationale:** 
  The default "Delivery progress" bar is always at 0% during the production phase, providing zero visual utility. Replacing it with a clear, phase-aware stepper shows the actual progress of manufacturing. Once production output starts being generated, a secondary progress bar will dynamically appear to show prep-for-dispatch progress.
