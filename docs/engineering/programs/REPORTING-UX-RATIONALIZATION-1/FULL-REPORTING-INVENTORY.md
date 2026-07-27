# FULL REPORTING INVENTORY

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 1 — Full Reporting Inventory |
| **Date** | 2026-07-27 |
| **Mode** | Audit only |

Disposition codes: **K** Keep · **M** Merge · **R** Rename · **X** Remove (presentation) · **D** Defer · **N** Not restaurant reporting

---

## 1. Live dashboard — restaurant Reports tab

| Element | Purpose | Business meaning | Financial meaning | Data source | SSOT | Calc owner | Presentation owner | Dup? | Conflict? | Disposition |
|---------|---------|------------------|-------------------|-------------|------|------------|--------------------|------|-----------|-------------|
| Reports page chrome | Entry | “Reports & Statistics” | None | — | — | — | ReportsTab | Soft vs Product Semantics “reporting” | — | **R** (optional clearer title) |
| Catalog Overview cards | Menu size / visits | Catalog health | Not financial | `getCatalogStatsSummary` | Catalog / Settings | CatalogStatsService | ReportsTab | Low | Clutters financial tab | **X** candidate (move or demote) |
| Check Revenue Overview | Gross + Net snapshot | Paid check performance | Gross + Net + comps | `getBusinessMetricsSummary` **no period** | Settlement Records | BusinessMetricsService | SettlementOverviewSection | Yes vs Excel Financial | **Lifetime vs month selector** | **M** — bind to selected period |
| KPI: Check Revenue | Gross money | Paid gen=1 SR | Gross | same | SR | Check / Reporting agg | same | Excel Financial | Period mismatch | **K** |
| KPI: Net Revenue | After refunds | Net of publications | Gross − refund pubs | same | SR + Reporting derived | Reporting Platform | same | Excel Financial | Period mismatch | **K** |
| KPI: Paid Checks | Volume | Paid count | Count | same | SR | Check | same | Excel | Period mismatch | **K** |
| KPI: Complimentary Checks / Rate | Comp leakage | Comp volume | Not Revenue | same | SR | Check | same | Excel Adjustments | Period mismatch | **K** |
| KPI: Average Check | Ticket size | Gross / paid | Avg | same | SR | Check | same | Excel | Period mismatch | **K** |
| Check Revenue Trends | Trend charts | Direction of Gross | Gross trend | `getBusinessMetricsTrend` | SR | BusinessMetricsService | SettlementTrendsSection | Excel Trends | Grouping ≠ month picker always | **M** — align period |
| Payment Method Analysis | Tender mix | How guests paid | Tender ≠ Revenue | `getPaymentMethodAnalytics` | SR payment snapshot | PaymentMethodAnalyticsService | PaymentMethodAnalysisSection | Excel Payment | Refund rows hidden on UI | **M** — show refund mix or move to Refund |
| Order Sales section | Ops sales | Completed order value | Not Check Revenue | `getOrderSalesSummary` + rollups | Order Read | OrderSalesMetricsService | ReportsTab | Excel Order Sales / Exec | Dual-metric intentional | **K** |
| Month/Year selectors | Period UI | Civil month/year pickers | Drives BD window bounds today | Client `periodRange` | Business Day helpers | timeSeries | ReportsTab | — | Conflicts with Phase-3 Gregorian rule | **D** — time gate |
| Excel export buttons | Download | Same period as selector | Bundle of DTOs | reporting.* | DTOs | Services | downloadReportingExportXlsx | — | Dashboard live ≠ export period for Overview | **K** + fix alignment |

---

## 2. Live dashboard — adjacent restaurant surfaces

| Element | Purpose | Business / Financial | Source | SSOT | Disposition |
|---------|---------|----------------------|--------|------|-------------|
| Operational Snapshot (Home) | Live ops | Ops + Today’s Order Sales | ops snapshot + order sales | Session / Order Read | **M** with Sessions |
| Sessions workspace KPIs | Live floor | Ops + Today’s Check Revenue | overview + business summary | Session / SR | **M** — fifth KPI differs (Order Sales vs Check Revenue) — clarify intentionally |
| Shift Closing / Tender / Drawer cards | Register close | Custody / tender presentation | CRMP | CRMP + Attribution | **N** (custody ops, not period reporting) |
| Settlement Ledger refund UI | Operational refund | Financial docs | Check / SR | Check | **N** (ops, not analytics) |

---

## 3. Excel workbook sheets

| Sheet | Purpose | Business | Financial | Source DTOs | Disposition |
|-------|---------|----------|-----------|-------------|-------------|
| Cover | Brand / period / contents | Nav | None | Bundle metadata | **K** |
| Executive Summary | At a Glance | Operational Order Sales story | Intentionally **no** money KPIs | Order rollup scoped | **K** + strengthen executive narrative |
| Financial Summary | Accounting view | Gross/Net/Refund/Tax/Avg/Comps | Full financial | BusinessMetricsSummary | **K** + reorder for controller readability |
| Payment Method Analysis | Tender + refund mix | Payment ops | Tender totals | PaymentMethodAnalytics | **K**; refund portion **M** into Refund section candidate |
| Order Sales | Completed order rollup | Ops sales | Not Revenue | OrderSalesRollup | **K** |
| Check Revenue Trends | Gross charts | Trend | Gross | BusinessMetricsTrend | **K**; add Net/Refund trend later as presentation |

---

## 4. API / services / DTOs

| Artifact | Purpose | Calc owner | Presentation | Disposition |
|----------|---------|------------|--------------|-------------|
| `reportingRouter` | Canonical KPI API | Façade | — | **K** |
| `BusinessMetricsService` + aggregator | Gross/Net/Tax/Refund KPIs | Reporting Platform (derived Net) from SR | — | **K** — no formula change |
| `settlementRecordReportingAdapter` | Financial publication read | Check published SR | — | **K** |
| `PaymentMethodAnalyticsService` | Tender + refund buckets | Reporting (tender) | — | **K** |
| `OrderSalesMetricsService` | Order Sales | Order Read | — | **K** |
| `OperationalMetricsService` | Ops snapshot | Session / Order Read | — | **K** |
| `CatalogStatsService` | Catalog KPIs | Catalog | — | **K** (placement UX only) |
| `KpiGovernanceService` | Metadata catalog | Registry | — | **K** |
| `checkReportingRepository` / ST adapter | Dual/check rollback | Legacy | — | **K** (parity only; not dashboard SSOT) |
| Contracts in `reportingContracts.ts` | DTO shapes | — | — | **K** |
| `kpiDictionary.ts` | KPI registry | Governance | Labels via Product Semantics | **K** |
| `productSemantics.ts` | Canonical labels | — | Presentation | **K** |

---

## 5. Admin / commercial (orthogonal)

| Element | Note | Disposition |
|---------|------|-------------|
| Admin home KPIs / Commercial overview / StatisticsPanel | SaaS MRR/ARR — not restaurant Check Revenue | **N** |
| `/admin/reports` placeholder | Empty shell | **X** or redirect |
| `ReportsAnalyticsSection` ≡ `StatisticsPanel` | Alias | **M** naming cleanup |

---

## 6. Filters & date selectors

| Control | Location | Semantics today | Disposition |
|---------|----------|-----------------|-------------|
| Month + Year selects | ReportsTab | Civil pickers → **BD month/year bounds** | **D** (time gate) |
| Trend Day/Week/Month | SettlementTrendsSection | BD period keys | **K** for day; week/month subject to gate |
| Archive presets | Register archive | Ops history | **N** |
| Overview / Trends without selector bind | Dashboard | Lifetime / loose | **M** — bind to period |

---

## Inventory completeness

Every restaurant reporting component under `client/src/components/dashboard/*Reporting*` / `Settlement*Section` / `PaymentMethod*` / `OperationalSnapshot*` / `reporting-exports/**` / `server/reporting-platform/**` / `shared/reporting-platform/**` has been inventoried above or classified **N**.

**Phase 1 success criterion: Met.**
