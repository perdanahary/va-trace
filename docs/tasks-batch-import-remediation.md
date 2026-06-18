# Tasks: Batch Import Remediation

## Phase 1 — Remove dead code

- [ ] T1.1 Delete `src/modules/data-cleaner/` directory (4 files)
      **File:** `src/modules/data-cleaner/index.ts`
      **File:** `src/modules/data-cleaner/types.ts`
      **File:** `src/modules/data-cleaner/utils/parser.ts`
      **File:** `src/modules/data-cleaner/utils/cleaning.ts`
      **Verify:** `npm run build` passes, `grep -r data-cleaner src/` returns nothing

## Phase 2 — Fix critical bugs

- [ ] T2.1 Fix duplicate key format mismatch in seed data
      **File:** `src/lib/importStore.ts:898`
      **Fix:** Regenerate 3 seed rows to use correct 7-part `buildMandatoryDuplicateKey()` format
      **Fields:** `poNumber|poLine|wcode|salesPoint|itemCode|itemName|quantity`

- [ ] T2.2 Remove hardcoded `DEMO_VENDOR_ID`
      **File:** `src/pages/admin/ImportDispatchWorkspace.tsx:41,230`
      **Fix:** Delete constant + `suppliers.find()` fallback + "Assign demo vendor" JSX box

- [ ] T2.3 Add dispatch confirmation dialog
      **File:** `src/pages/admin/ImportDispatchWorkspace.tsx` `handleDispatch()`
      **Fix:** Wrap in `<Dialog>` from shadcn with dispatch summary before proceeding

## Phase 3 — Structural refactor

### 3.A Extract seed data from importStore

- [ ] T3.A.1 Create `src/lib/importSeedData.ts`
      **Content:** Export `buildInitialBatches()` + all seed PO/row data from importStore.ts (lines 832–1151)

- [ ] T3.A.2 Slim `src/lib/importStore.ts`
      **Fix:** Remove `buildInitialBatches()` and `resetImportBatchStorageForDemo()` (~300 lines)
      **Fix:** Import `buildInitialBatches` from `importSeedData`
      **Verify:** `npm run build`

### 3.B Extract inline components from ImportDispatchWorkspace

- [ ] T3.B.1 Create `src/pages/admin/import-tabs/types.ts`
      **Content:** `TabPanelProps` interface with batch/summary/dispatch callbacks

- [ ] T3.B.2 Create `src/pages/admin/import-tabs/IssueGroupsTab.tsx`
      **Content:** Issue resolver panel (moved from ImportDispatchWorkspace)

- [ ] T3.B.3 Create `src/pages/admin/import-tabs/AssignmentGroupsTab.tsx`
      **Content:** Assignment groups with per-group progress cards

- [ ] T3.B.4 Create `src/pages/admin/import-tabs/RawRowsTab.tsx`
      **Content:** Row-level table with search/filter/state blocks

- [ ] T3.B.5 Create `src/pages/admin/import-tabs/ORPreviewTab.tsx`
      **Content:** Pre-dispatch preview summary

- [ ] T3.B.6 Create `src/pages/admin/import-tabs/ImportLogTab.tsx`
      **Content:** Dispatch run log with metrics

- [ ] T3.B.7 Create `src/pages/admin/import-tabs/AssignmentRulePanel.tsx`
      **Content:** Rule editor side panel

- [ ] T3.B.8 Slim `src/pages/admin/ImportDispatchWorkspace.tsx` to ~400 lines
      **Fix:** Import and delegate to tab components
      **Fix:** Remove inline tab switch cases
      **Verify:** All 5 tabs render correctly, `npm run build`

## Phase 4 — Feature additions

- [ ] T4.1 Single-batch delete
      **Store:** Add `deleteBatch(batchId)` to `importStore.ts`
      **UI:** Add trash icon per batch row in workspace header

- [ ] T4.2 Row-level inline edit
      **Store:** Add `updateRowField(batchId, rowId, field, value)`
      **UI:** Edit toggle in RawRowsTab, inputs for editable cells

- [ ] T4.3 Undo last dispatch
      **Store:** Add `undoLastDispatch(batchId) → {reversedCount}`
      **UI:** "Undo" button in ImportLogTab per dispatch entry

- [ ] T4.4 Export/import assignment rules
      **Store:** `exportRules(batchId) → JSON`, `importRules(batchId, json)`
      **UI:** Download/upload buttons in AssignmentRulePanel

## Tracking

| Phase | Tasks | Dependencies | Est. effort |
|-------|-------|-------------|-------------|
| 1     | 1     | None        | 5 min       |
| 2     | 3     | None        | 20 min      |
| 3.A   | 2     | None        | 15 min      |
| 3.B   | 8     | 3.A         | 45 min      |
| 4     | 4     | 2, 3.B      | 60 min      |
| **Total** | **18** | | **~2.5 hrs** |
