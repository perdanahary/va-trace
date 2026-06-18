# Implementation Plan: Batch Import Remediation

> Based on audit: `docs/audit-batch-import-workflow.md`
> Audit re-verified: 2026-06-18 — all findings confirmed current.
> Dead code (`data-cleaner/`) still orphaned, seed data still inline, `DEMO_VENDOR_ID` still hardcoded.

---

## Execution Order

### Phase 1 — Remove dead code

**Files to delete:**
```
src/modules/data-cleaner/index.ts
src/modules/data-cleaner/types.ts
src/modules/data-cleaner/utils/
```

**Risk:** None — no imports reference this module. Safe to delete.

**Verification:** `npm run build` passes.

---

### Phase 2 — Fix critical bugs

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Duplicate key format in seed rows | `importStore.ts:898` | Regenerate 3 seed rows with correct 7-part key: `poNumber\|poLine\|wcode\|salesPoint\|itemCode\|itemName\|quantity` |
| 2 | `DEMO_VENDOR_ID` hardcoded | `ImportDispatchWorkspace.tsx:41,230` | Remove constant + `suppliers.find()` fallback, remove "Assign demo vendor" box in JSX |
| 3 | No dispatch confirmation | `ImportDispatchWorkspace.tsx` `handleDispatch()` | Wrap dispatch in `<Dialog>` with summary before firing `handleDispatch()` |

---

### Phase 3 — Structural refactor

#### A. Extract seed data from `importStore.ts`

**New file:** `src/lib/importSeedData.ts`

Export `buildInitialBatches(): ImportBatch[]` and all seed PO/row data.

**Change to `importStore.ts`:**
- Remove `buildInitialBatches()` (~300 lines)
- Remove `resetImportBatchStorageForDemo()`
- Import from `importSeedData`

#### B. Extract tab panels from `ImportDispatchWorkspace.tsx`

**New file:** `src/pages/admin/import-tabs/IssueGroupsTab.tsx`
- Move `<EmptyTableState>` (conditional render for unresolved-issues)
- `<IssueActionCard>` content
- Move resolver functions bound to the issue type

**New file:** `src/pages/admin/import-tabs/AssignmentGroupsTab.tsx`
- `<AssignmentGroupCard>` content
- `<FlowProgressRow>` per-group
- `<FlagBadge>` + `<MiniAction>` inline components

**New file:** `src/pages/admin/import-tabs/RawRowsTab.tsx`
- `<ImportRowTableRow>` grid
- `<FilterSelect>` + inline `<StateBlock>` for row status
- Search/filter logic for raw rows

**New file:** `src/pages/admin/import-tabs/ORPreviewTab.tsx`
- `<PreviewGroupList>` content
- Pre-dispatch summary cards

**New file:** `src/pages/admin/import-tabs/ImportLogTab.tsx`
- `<BatchMetric>` list + `<QueueStat>` cards for each `dispatchRuns` entry

**New file:** `src/pages/admin/import-tabs/AssignmentRulePanel.tsx`
- Side panel for assignment rules (currently inline in the AssignmentGroups tab section)

**New file:** `src/pages/admin/import-tabs/types.ts`
- Shared types across tabs (props interface, callback signatures)

**Slim `ImportDispatchWorkspace.tsx` to ~400 lines:**
- Tab orchestration (tab state, conditional render)
- Store connection (`useImportBatches`, selected batch)
- Delegation to tab components

### Phase 4 — Feature additions

#### Delete single batch
- **Store:** Add `deleteBatch(batchId: string): void` to `importStore.ts`
- **UI:** Add trash icon per batch row in the workspace header batch selector

#### Row-level inline edit
- **Store:** Add `updateRowField(batchId: string, rowId: string, field: keyof ImportRow, value: string): void`
- **UI:** Add edit-mode toggle on `RawRowsTab` — cells become inputs when active

#### Undo last dispatch
- **Store:** Add `undoLastDispatch(batchId: string): { reversedCount: number }`
  - Removes created OrderRequests (if V2) or marks them as reversed (if V1)
  - Reverts row statuses from `dispatched` → `matched`
- **UI:** "Undo" button in `ImportLogTab` next to each dispatch entry

#### Export/import assignment rules
- **Store:** `exportRules(batchId): string` (JSON blob), `importRules(batchId, json): void`
- **UI:** Download button in `AssignmentRulePanel`, upload button with file input

---

## Component Tree (after refactor)

```
ImportDispatchWorkspace (~400 lines)
├── ImportUploadPage (fallback, when no batch selected)
├── WorkspaceHeader
│   ├── BatchSelector (dropdown)
│   ├── BatchDeleteButton [Phase 4]
│   └── SummaryStats
├── TabBar (5 tabs)
├── IssueGroupsTab
│   ├── EmptyTableState
│   └── IssueActionCard []
├── AssignmentGroupsTab
│   ├── AssignmentGroupCard []
│   │   ├── FlowProgressRow
│   │   └── MiniAction
│   └── FlagBadge
├── RawRowsTab
│   ├── FilterSelect
│   ├── StateBlock
│   └── ImportRowTableRow []
├── ORPreviewTab
│   └── PreviewGroupList []
├── ImportLogTab
│   ├── BatchMetric []
│   └── QueueStat []
└── AssignmentRulePanel (side panel)
```

---

## Dependency Graph

```
Phase 1 (delete dead code)
    └── no deps
Phase 2 (bug fixes)
    ├── 2.1 Duplicate key fix  ── no deps
    ├── 2.2 DEMO_VENDOR_ID     ── no deps
    └── 2.3 Dispatch confirm   ── no deps
Phase 3 (refactor)
    ├── 3.A Extract seed data  ── no deps
    └── 3.B Extract tabs       ── after 3.A (both touch importStore.ts)
Phase 4 (features)
    ├── 4.1 Delete single batch── after Phase 2 (importStore exposed)
    ├── 4.2 Row edit           ── after 3.B (RawRowsTab extracted)
    ├── 4.3 Undo dispatch      ── after 2.3 (dispatch confirmed)
    └── 4.4 Rules export/import── after 3.B (AssignmentRulePanel extracted)
```

---

## Verification Steps

Each phase:
1. `npm run build` — no type errors
2. `npm run lint` — no warnings
3. Manual check in dev: upload a test .xlsx, verify parse → match → assign → dispatch
4. Toggle all 5 tabs — no crashes

After Phase 4:
5. Delete a single batch from workspace header — confirm removed
6. Edit a row field — confirm store updates, visual reflects change
7. Dispatch, then undo in log tab — confirm rows revert
8. Export rules, re-import — confirm rules apply
