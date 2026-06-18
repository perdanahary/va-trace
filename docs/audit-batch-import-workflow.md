# Audit: Batch Import Workflow

> Date: 2026-06-18
> Scope: Full review of the bulk PO import feature — upload, parse, match, assign, dispatch.

---

## Current Architecture

| File | Lines | Purpose |
|---|---|---|
| `src/lib/importStore.ts` | 1849 | Core store: upload, parse, match, assign, dispatch, IndexedDB persistence |
| `src/pages/admin/ImportDispatchWorkspace.tsx` | 2365 | Main workspace UI: 5 tabs, assignment rules, issue resolution |
| `src/pages/shared/ImportUploadPage.tsx` | 246 | Upload drop-zone + batch list |
| `src/modules/data-cleaner/` | ~4 files | **UNUSED** — not imported anywhere |

### Workflow Flow

```
Upload (.xlsx) → Parse (SheetJS + header detection) → Match (product/salesPoint/client)
  → Assign (rules engine or manual) → Dispatch (creates StoredOrder[] per PO::SalesPoint::ClientId::VendorId group)
```

### Persistence

- **IndexedDB** (`va-trace-import-batches-db`, store `batches`) with legacy localStorage migration
- In-memory `cachedBatches` with `useSyncExternalStore` for React reactivity
- Custom DOM event `va-trace-import-batches:change` for cross-component updates
- Serial `enqueueWrite()` to prevent concurrent IndexedDB writes

### Routes

| Route | Component | Role |
|---|---|---|
| `/admin/imports` | `ImportDispatchWorkspace` | Admin |
| `/operator/imports` | `ImportDispatchWorkspace` | Operator |
| `/client/imports` | `ImportUploadPage` | Client |

---

## Issues Found

### Structural

1. **`ImportDispatchWorkspace.tsx` is 2365 lines** — too large for a single component. All 5 tab panels + 12 helper components (`BatchMetric`, `WorkflowStep`, `PreviewGroupList`, `StateBlock`, `FilterSelect`, `EmptyTableState`, `IssueActionCard`, `AssignmentGroupCard`, `FlowProgressRow`, `QueueStat`, `ImportRowTableRow`, `FlagBadge`, `MiniAction`) are inline in the same file.

2. **`importStore.ts` is 1849 lines** — mixes persistence layer (IndexedDB), domain logic (duplicate detection, matching, dispatch), and ~300 lines of hardcoded seed data (`buildInitialBatches`).

3. **`data-cleaner/` module is dead code** — never imported anywhere in the codebase. Contains a 5-step wizard (upload → sheet-select → preview-clean → map-columns → confirm-export) with column type detection and cleaning ops, but nothing wires it into the import flow.

### Bugs

4. **Duplicate key format mismatch in seed data** — The `duplicateKey` at line 898 is `"5701713444|1|wh059|tposm-sc-001|10"` (5 pipe-separated values) but `buildMandatoryDuplicateKey()` builds a 7-part key: `poNumber|poLine|wcode|salesPoint|itemCode|itemName|quantity`. Seed data rows have incorrect duplicate keys that won't match the actual function output.

5. **`batchLinkBase` wrong for operator role** — `ImportUploadPage.tsx:29`:
   ```ts
   const batchLinkBase = userRole === "client" ? "/admin/imports" : `/${userRole}/imports`;
   ```
   When `userRole` is `"client"`, it links to `/admin/imports` (correct — client can't see their own workspace). But when `userRole` is `"operator"`, it links to `/operator/imports`. This is correct behavior, but the upload page is only rendered for client role via the fallback in `ImportDispatchWorkspace` (`if (!batch || !summary) return <ImportUploadPage userRole={userRole} />`), so the operator path is never exercised through normal flow.

6. **Hardcoded demo vendor shortcut** — `DEMO_VENDOR_ID = "SUP-004"` is hardcoded at line 41 and the "Assign demo vendor" button is visible in the assignment panel for all users in all environments.

7. **No dispatch confirmation dialog** — `handleDispatch()` fires immediately on button click with no confirmation. A misclick creates Order Requests with no undo path.

### UX Gaps

8. **"Item code not found" has no inline resolution** — The only action buttons for unresolved issues navigate away to `/admin/products` or `/admin/products/new`, losing the entire workspace context (filters, selections, scroll position).

9. **Assignment Groups tab misaligned with dispatch logic** — Groups rows by `region · brand · category` for assignment, but dispatch groups by `PO::SalesPoint::ClientId::VendorId`. The OR Preview tab shows a different grouping than what was used for assignment, which is confusing.

10. **No batch-level delete** — The only way to remove a batch is "Clear queue and start over" which deletes ALL batches. There's no way to delete a single batch.

11. **No row-level edit** — Once uploaded, row values (PO number, quantity, item code) are read-only. Operators must re-upload the entire file to fix a typo.

### Missing Features

12. **No undo after dispatch** — Dispatched rows can't be reverted. The `dispatchRuns` log tracks what happened but provides no rollback.

13. **No multi-sheet support** — Only the first worksheet is imported. The upload page says "Only the first worksheet is imported" with no sheet selector.

14. **No progress feedback during upload** — For large files, the upload shows a spinner with no progress percentage or row count.

15. **No export/import of assignment rules** — Rules are batch-scoped and can't be saved as templates or copied between batches.

---

## Proposed Remediation

### Phase 1 — Cleanup (remove dead code)

| Action | File |
|---|---|
| Delete `src/modules/data-cleaner/` directory | `types.ts`, `utils/parser.ts`, `utils/cleaning.ts`, `index.ts` |

### Phase 2 — Refactor structure

| Action | File |
|---|---|
| Extract tab components | `src/pages/admin/import-tabs/IssueGroupsTab.tsx` |
| | `src/pages/admin/import-tabs/AssignmentGroupsTab.tsx` |
| | `src/pages/admin/import-tabs/RawRowsTab.tsx` |
| | `src/pages/admin/import-tabs/ORPreviewTab.tsx` |
| | `src/pages/admin/import-tabs/ImportLogTab.tsx` |
| Extract sidebar panel | `src/pages/admin/import-tabs/AssignmentRulePanel.tsx` |
| Extract seed data | `src/lib/importSeedData.ts` |
| Slim `ImportDispatchWorkspace.tsx` | Tab orchestration + state only (~400 lines) |
| Slim `importStore.ts` | Remove seed data (~300 lines saved) |

### Phase 3 — Fix bugs

| Issue | Fix |
|---|---|
| Duplicate key format in seed data | Regenerate seed rows with correct 7-part keys |
| `batchLinkBase` operator path | Verify operator fallback renders correctly; add explicit operator route if needed |
| Demo vendor shortcut | Remove `DEMO_VENDOR_ID` and the "Assign demo vendor" box entirely |
| No dispatch confirmation | Add a `Dialog` confirmation before `handleDispatch` fires |

### Phase 4 — Add missing features

| Feature | Scope |
|---|---|
| Single-batch delete | Add `deleteBatch(batchId)` to `importStore` + trash icon in workspace header |
| Row-level inline edit | Add `updateRowField(batchId, rowId, field, value)` to store + edit mode toggle in `ImportRowTableRow` |
| Undo last dispatch | Add `undoLastDispatch(batchId)` — removes created orders, reverts row statuses |
| Export/import assignment rules | `exportRules(batch)` → JSON download, `importRules(batch, json)` → apply |

---

## Priority Recommendation

**Phase 1 + 3 first** — lowest effort, highest impact (remove dead code, fix bugs).

**Phase 2 second** — structural refactor enables easier future work.

**Phase 4 last** — feature additions on a clean foundation.
