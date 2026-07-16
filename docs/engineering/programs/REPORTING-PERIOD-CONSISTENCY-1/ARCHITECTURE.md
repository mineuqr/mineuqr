# REPORTING-PERIOD-CONSISTENCY-1 — Architecture

**Classification:** Reporting Consistency & Executive Excel Finalization  
**Scope:** Presentation adoption only

## Invariant

Every worksheet in one export consumes the **identical selected reporting scope**.

| Export | Scope sources |
|--------|----------------|
| Monthly | `BusinessMetricsSummary(from/to month)` + `OrderSalesRollup(day, year, month)` + `BusinessMetricsTrend(day)` |
| Yearly | `BusinessMetricsSummary(from/to year)` + `OrderSalesRollup(month, year)` + `BusinessMetricsTrend(month)` |

**Forbidden:** `OrderSalesSummary.month` / `.today` (live UTC current month) inside the export bundle.

## Presentation derivation

Period Order Sales KPIs on Executive / Financial are display totals from `OrderSalesRollup.periods` (`scopedOrderSalesFromRollup`). No new KPI authority; no Reporting Platform changes.

## PDF

Suspended from the product workflow. Excel is the sole executive deliverable.
