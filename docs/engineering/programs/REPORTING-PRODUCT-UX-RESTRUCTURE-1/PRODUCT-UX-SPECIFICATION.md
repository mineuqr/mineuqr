# Product UX Specification

## Product identity

MineuQR Reporting is a **Restaurant Operating Platform** surface — not an ERP KPI warehouse.

Every screen answers **one business question**. Every KPI supports a decision.

## Primary questions

| Tab | Question |
|-----|----------|
| Today | How is the restaurant doing **today**? |
| This Month | How is the restaurant doing **this month**? |
| Financial Analytics | What patterns explain sales, payments, refunds, and tax? |

## Non-goals

- No new KPI formulas or registry ids for Cash/Card presentation cards  
- No charts on Today / This Month  
- No average ticket / average check / ratio overload on operational tabs  
- No continuous flashing motion  

## Experience principles

1. **One screen · One purpose · One decision**  
2. **Decision first** — owner understands the day in ≤ 5 seconds  
3. **Zero relearning** — Month clones Today layout  
4. **Analysis depth only in Financial Analytics**  
5. **RTL / LTR parity**, touch-friendly targets, responsive grid  

## Data binding (presentation)

| Card | Source (existing) |
|------|-------------------|
| Cash Sales | Sum of Payment Method Analytics buckets where canonical method = cash |
| Card Sales | Sum of buckets where canonical method = card (includes electronic card rails) |
| Refund Amount | `BusinessMetricsSummary.refundPublishedTotal` |
| Tax Collected | `BusinessMetricsSummary.taxCollected` |
| Orders | Today: `OrderSalesSummary.today.totalOrders` · Month: rollup `orderCount` |
| Net Sales | `BusinessMetricsSummary.netRevenue` |

Cash + Card are **tender presentation aggregates**, not replacements for Total Sales (`revenue`).
