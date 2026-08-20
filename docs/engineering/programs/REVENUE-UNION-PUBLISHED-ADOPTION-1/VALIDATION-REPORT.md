# REVENUE-UNION-PUBLISHED-ADOPTION-1 — Validation Report

**Status: VALIDATED (pipeline) — Collection Fact contribution NOT ADOPTED**

## Certification gates

| Gate | Result |
|---|---|
| G1 Production eligibility governed | **PASS** — `PUBLISHED_COLLECTION_FACT_PURPOSES = []`; 0096 enum unchanged |
| G2 Authority resolution deterministic | **PASS** — `classifyEconomicTransaction` |
| G3 One authority per transaction | **PASS** |
| G4 No duplicate Revenue | **PASS** — collapse on contribution ids |
| G5 Conflict behavior | **PASS** — isolated BOTH publishes neither; published isolated facts do **not** suppress Check |
| G6 Historical Check Revenue | **PASS** |
| G7 Collection Fact Revenue contribution | **NOT ADOPTED** — engine proven under `isolated`; published allowlist empty so published CF Gross = 0 |
| G8 Refund behavior | **PASS by exclusion** — CF cannot publish; legacy refund SRs unchanged; original facts immutable |
| G9 Complimentary / void | **PASS** for legacy SR/Check; CF kinds not invented |
| G10 Business Day / timezone | **PASS** — published trend still `resolveBusinessPeriodKey` |
| G11 Tax semantics | **PASS** — snapshots copied, not recalculated |
| G12 Reporting consumers audited | **PASS** — see inventory below |
| G13 Performance | **PASS** — extra 0-row SELECT; no authority bypass |
| G14 Observability | **PASS** — counts/field names only |
| G15 Cashier unchanged | **PASS** |
| G16 Settlement unchanged | **PASS** |
| G17 No dual-write | **PASS** |
| G18 No dual-publish | **PASS** — one DTO pipeline; shadow comparison is not an API |
| G19 Production reconciliation | **PASS by construction** — production CF rows = 0 ⇒ Union Gross = legacy Gross (unit-proven) |
| G20 Rollback | **PASS** — `REPORTING_REVENUE_UNION=legacy` |

## Test matrix

Covered in `revenueUnion.test.ts`, `BusinessMetricsService.settlementRecord.test.ts`, `RevenueUnionService.test.ts`, `revenueUnionPublication.test.ts`, architecture guards:

- empty CF published = legacy
- isolated facts never publish and never BOTH-suppress published Check
- BOTH (isolated eligibility) publishes neither
- duplicate Check / duplicate fact collapse
- UNRESOLVED invalid eligible fact
- classifier LEGACY_CHECK / COLLECTION_FACT / BOTH / UNRESOLVED
- refund Net unchanged
- complimentary / void not Gross
- rollback skips CF reads
- no `production` in 0096 SQL; no `0097_`; no `mysqlTable("payments")`
- Cashier Confirm still ADR-038 settle path; no `commitCollectionFact`

## Consumer inventory (published restaurant Revenue)

| Surface | Path | This program |
|---|---|---|
| Dashboard Revenue / Settlement overview | `reporting.getBusinessMetricsSummary` | **PUBLISHED** via Union |
| Sessions / refund widgets | same procedure | **PUBLISHED** via Union |
| Time-series Revenue | `reporting.getBusinessMetricsTrend` | **PUBLISHED** via Union (canonical Business Day) |
| KPI registry / Executive labels | `BusinessMetricsSummaryDto` fields | unchanged contract; source now Union-resolved |
| Excel / PDF financial sheets | consume Business Metrics DTOs | **PUBLISHED** via Union |
| Tax collected | DTO `taxCollected` from frozen snapshots | unchanged semantics |
| Payment method analytics | SR payment snapshots | **not Gross Revenue** — not migrated |
| Sales channel analytics | Order Read | **not Revenue** |
| Order Sales | Order Read | **not Revenue** |
| `admin.getRevenueByMonth` | soft-sunset non-canonical | unchanged / unused |
| SaaS/Tap `payments` | subscription billing | **out of architecture** |

## Hard stops not triggered

Cashier/Confirm/PAID/Check schema/Settlement ownership/history rewrite/backfill/new payments table/schema migration were not required.
