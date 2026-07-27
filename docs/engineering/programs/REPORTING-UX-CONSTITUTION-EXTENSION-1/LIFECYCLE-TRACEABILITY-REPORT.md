# Lifecycle Traceability Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Constitution** | KPI-07 · relationship chain |
| **Date** | 2026-07-27 |

## Traceability matrix (presentation → production)

| Presentation | KPI / object | Reporting service | Canonical source | Producer | Owner plane |
|--------------|--------------|-------------------|------------------|----------|-------------|
| Exec card Total Sales | `revenue` | `getBusinessMetricsSummary` | Settlement Record paid gen=1 | Check Management | Settlement Platform |
| Exec card Sales Orders | `orderSales` | Order Sales summary/rollup | Order Read daily completedSales | Order Platform | Order Platform |
| Exec card Orders | `orderCount` | Order Sales summary/rollup | Order Read daily orderCount | Order Platform | Order Platform |
| Exec card Refund Amount | `refundPublishedTotal` | `getBusinessMetricsSummary` | Settlement Record refund kind | Check Management | Settlement Platform |
| Exec card Tax Collected | `taxCollected` | `getBusinessMetricsSummary` | Settlement Record tax snapshot | Check Management | Settlement Platform |
| Exec card Payment Overview | Widget `paymentOverview` | `getPaymentMethodAnalytics` | SR payment snapshots | Check Management | Settlement Platform |
| Financial Net Sales | `netRevenue` | Business metrics (derived) | Derived from SR parents | Reporting Platform | Reporting Platform |
| Excel / PDF same labels | Same KPI ids | Same services | Same sources | Same | Same |

## Engineer checklist (must be answerable)

| Question | Covered by |
|----------|------------|
| Where produced? | Producer column |
| Canonical source? | Source column / KPI-SOURCE-OF-TRUTH-REGISTRY |
| Who owns? | Owner plane + write owner |
| Who consumes? | Dashboard, Excel, PDF, APIs |
| Which services transform? | Reporting service column |
| Which UI displays? | Dashboard Component + Widget registries |
| Which exports include? | Export components in Lifecycle Registry |

## Gaps / observations

1. **Payment Overview** is fully traceable as a Widget lifecycle, not as OBJ-01 KPI — intentional.  
2. **Settlement Platform** vs **Check Management** remains dual-layer (plane vs write) — consistent with KPI Ownership Constitution.  
3. Nested Analytics (Refund / Payment) live under Financial nav area — OBJ-03 grouping, not separate ownership.

## Verdict contribution

Traceability chain is documented end-to-end for primary reporting KPIs. Supports **B. Adopted with observations**.
