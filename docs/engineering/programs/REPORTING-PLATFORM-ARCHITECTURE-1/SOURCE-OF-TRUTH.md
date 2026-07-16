# REPORTING-PLATFORM-ARCHITECTURE-1 — Source of Truth

---

## Matrix

| Concept | Write authority | Reporting read authority | Forbidden as reporting SSOT |
|---------|-----------------|--------------------------|-----------------------------|
| Paid money collected | Check (`outcome=paid`, `grandTotal`) | Reporting → `operational_checks` | Served Orders; Session `totalAmount` |
| Tax on collected sales | Check Tax Policy Snapshot + `taxAmount` | Reporting → Check rows | Live `restaurants.tax*` |
| Currency display for revenue | Check Currency Snapshot | Reporting DTO `currency` | Live restaurant currency alone |
| Complimentary / void outcomes | Check | Reporting → Check rows | Order cancel status |
| Completed order sales | Order Domain events → Order Read P-10 | Reporting → `order_read_analytics_daily` | Client `order.list` aggregation |
| Kitchen / active order counters | Order Domain → Order Read P-06 | Reporting → `order_read_operational_kpi_daily` | Runtime Providers |
| Active sessions / occupied tables | Operational Session | Reporting → `getRestaurantOverview` | Order counts |
| Catalog size / visits | Catalog / Restaurant profile | Reporting → `getRestaurantStats` | Sales math |

---

## Financial policy integration

| Rule | Enforcement |
|------|-------------|
| Reports MUST NOT read current Business Settings for tax/currency of historical money | Business metrics load snapshots from Check rows only |
| Reports MUST consume immutable Check snapshots | `sampleTaxPolicySnapshot` + `currency.currencySnapshot` on `BusinessMetricsSummary` |
| Changing Business Settings later must not rewrite history | Guaranteed by Check freeze policy; Reporting never re-derives tax from live settings |

---

## Dual metric clarity

| Name | SSOT | Meaning |
|------|------|---------|
| **Revenue** | Check | Money collected (paid) |
| **Order Sales** | Order Read P-10 | Completed/served order volume value |

Both may appear in product UI; they must never share the same label or calculation path.
