# Order Status Flow

## Primary Order Statuses

| Status | Color | Description |
|--------|-------|-------------|
| **New** | Gray | Order has been created but no production work has started yet |
| **In Production** | Blue | Production is underway (includes printing, finishing, and quality control stages) |
| **Ready to Ship** | Blue | Production is complete and items are packed, waiting to be dispatched |
| **On Delivery** | Blue | Items have been shipped and are in transit to sales points |
| **Delivered** | Green | Items have arrived at the sales point(s) but not all have confirmed receipt |
| **Completed** | Green | All items fully produced and received by all sales points |
| **Overdue** | Red | Order is cancelled or has an exception (e.g. missing items in a closed shipment) |
| **Waiting** | Yellow | Order is on hold — treated the same as "New" in the production pipeline |

## Partial Statuses

When an order has multiple line items in different states, the system shows a **composite badge**: the word "Partial" plus the highest status achieved.

> Example: `Partial In Production` — some items are in production, others may still be new.

## Production Pipeline Stages

| Internal Stage | Maps To | Description |
|----------------|---------|-------------|
| **NEW** | New / Waiting | No work started |
| **SUBMITTED** | New / Waiting | Order submitted to production |
| **ACCEPTED** | New / Waiting | Production house accepted the order |
| **PRINTING** | In Production | Printing phase is active |
| **FINISHING** | In Production | Post-print finishing (cutting, laminating, etc.) |
| **QUALITY_CONTROL** | In Production | QC checks before release |
| **READY_FOR_DISTRIBUTION** | Ready to Ship | Production complete, awaiting dispatch |
| **COMPLETED** | Ready to Ship / Delivered / Completed | Production finished |
| **CANCELLED** | Overdue | Production cancelled |

## Distribution / Delivery Tracking

| Internal Stage | Maps To | Description |
|----------------|---------|-------------|
| **NOT_STARTED** | New | No allocations or shipments created yet |
| **PARTIALLY_DISTRIBUTED** | On Delivery | Some items shipped, not all |
| **FULLY_DISTRIBUTED** | On Delivery | All items shipped, none confirmed received |
| **PARTIALLY_RECEIVED** | Delivered | Some sales points have confirmed receipt |
| **FULLY_RECEIVED** | Completed | All sales points confirmed receipt |
| **EXCEPTION** | Overdue | A closed shipment has missing/short-received items |

## How Status is Computed

The system derives the user-facing status automatically from two sources:

1. **Production Status** — aggregated from the worst (lowest) status across all line items
2. **Distribution Status** — derived from allocation, shipment, and receipt data

The final display status follows this priority:

1. CANCELLED or EXCEPTION → **Overdue**
2. COMPLETED + FULLY_RECEIVED → **Completed**
3. Any received items → **Delivered**
4. Any shipped items → **On Delivery**
5. Production done / ready → **Ready to Ship**
6. Printing/finishing/QC → **In Production**
7. Default → **New**

## Source Files

- `src/lib/orderStatus.ts` — status computation logic
- `src/components/ui/StatusBadge.tsx` — badge rendering and color mapping
