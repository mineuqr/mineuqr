# Information Flow Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-VISUAL-HIERARCHY-1 |
| **Date** | 2026-07-27 |

## Executive

```
Primary question
  → Sold (Total Sales)
  → Orders (count + Sales Orders)
  → Refunds
  → Collection (Tax + Payment Overview)
  → Footer: Net Sales lives in Financial
```

## Financial relationship

```
Total Sales  →  Refund Amount  →  Net Sales
```

Rendered by `FinancialSalesFlowStrip` using existing DTO fields only (no recalculation).

## Nav areas (unchanged)

Overview → Sales → Financial → Exports (UX-06 four-area workspace).

**Product UI (production):** Today → This Month → Financial Analytics (three-tab overlay; see REPORTING-PRODUCT-UX-RESTRUCTURE-2).
