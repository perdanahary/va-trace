# Plan: Intuitive "Update Production" Modal — Progressive Quantity Fields

## Problem

The Update Production modal currently shows **all 4 quantity fields** (Produced, QC passed, Ready, Completed) in a 2×2 grid whenever the job status isn't SUBMITTED. This is confusing — most status transitions only need 1–2 fields.

## Solution: Progressive disclosure based on target status

Only show the quantity fields that are **relevant to the selected target status**:

| Target Status | Fields Shown |
|---|---|
| `ACCEPTED` | None (status-only) |
| `PRINTING` / `FINISHING` | Produced |
| `QUALITY_CONTROL` | Produced, QC passed |
| `READY_FOR_DISTRIBUTION` | Produced, QC passed, Ready |
| `COMPLETED` | Produced, QC passed, Ready, Completed |

Hidden fields retain their values (auto-capped from `handleStatusChange`), so the DTO payload remains correct.

## Files to Modify

1. **`src/pages/admin/ProductionQueue.tsx`** — Admin production queue modal
2. **`src/pages/vendor/VendorOrderDetail.tsx`** — Vendor production modal (same logic)

## Implementation

### ProductionQueue.tsx (lines 220–309)

Replace the single `{openJob.status !== "SUBMITTED" ? <div className="grid grid-cols-2 gap-4">...}` block with conditional field groups:

```
{openJob.status !== "SUBMITTED" && (isProducedActive || isQcActive || isReadyActive || isCompletedActive) ? (
  <>
    {/* Show Produced when: PRINTING, FINISHING, QC, READY, COMPLETED */}
    {isProducedActive && <ProducedField />}

    {/* Show QC when: QUALITY_CONTROL, READY, COMPLETED */}
    {isQcActive && <QcField />}

    {/* Show Ready when: READY_FOR_DISTRIBUTION, COMPLETED */}
    {isReadyActive && <ReadyField />}

    {/* Show Completed when: COMPLETED */}
    {isCompletedActive && <CompletedField />}
  </>
) : null}
```

Use full-width single-column layout (`space-y-4`) instead of 2×2 grid, since fewer fields will be visible.

### VendorOrderDetail.tsx (lines 1548–1637)

Same pattern — identical modal markup.

## Verification

1. `npm run build` — no type errors
2. Manual: open modal at various statuses, confirm only relevant fields appear
3. Verify DTO payload still sends correct quantities (hidden fields retain values)
