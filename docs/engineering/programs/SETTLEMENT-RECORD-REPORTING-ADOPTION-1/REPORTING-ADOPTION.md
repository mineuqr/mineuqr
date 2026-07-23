# SETTLEMENT-RECORD-REPORTING-ADOPTION-1 — Reporting Adoption Report

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-RECORD-REPORTING-ADOPTION-1 |
| **Phase** | Reporting Adoption (Read Side) |
| **Date** | 2026-07-23 |
| **Constitutional ADR** | [ADR-ARCH-026 — Settlement Record Platform](../../../architecture/adrs/ADR-ARCH-026-settlement-record-platform.md) |
| **Reference programs** | SETTLEMENT-RECORD-IMPLEMENTATION-1 · SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 · PRODUCTION-MIGRATION-EXECUTION-0076 |
| **Verdict** | **REPORTING ADOPTION COMPLETE** |

---

## Executive Summary

Reporting Platform financial KPIs now read **Settlement Record** as the canonical financial publication source (ADR-ARCH-026 Phase D).

- Check remains the Monetary Aggregate Root / Financial Authority.
- Settlement Record remains an immutable Canonical Financial Document (not an Aggregate Root).
- Reporting **aggregates** published `grandTotal` / `taxAmount` / payment snapshots — it does **not** recalculate money.
- Order Read remains the operational source for Order Sales and related operational analytics.
- Public Reporting API contracts / DTO shapes are unchanged (backward compatible).
- Write-side paths (Check finalize, Settlement Transactions, Order Settlement, Settlement Record create) were **not** modified.

Default mode: `REPORTING_FINANCIAL_SOURCE=settlement_record` (implicit). Dual-run (`dual`) and legacy (`check`) remain available for diagnostics / emergency rollback only.

---

## Reporting Components Updated

| Surface | Financial source after adoption | Operational source |
|---|---|---|
| Dashboard Settlement / Revenue KPIs | Settlement Record via `getBusinessMetricsSummary` | Unchanged (Order Read / ops) |
| Dashboard Payment Method Analysis | Settlement Record payment snapshots | n/a |
| Financial Reports (API) | Settlement Record | Order Sales still Order Read |
| Tax Collected | Settlement Record `taxAmount` | n/a |
| Excel Executive / Financial / Payment / Tax | Same DTOs (server cutover) | Order Sales sheets unchanged |
| PDF financial sections | Same DTOs (server cutover) | Unchanged presentation |
| Reporting APIs | `reporting.getBusinessMetrics*` · `getPaymentMethodAnalytics` | `getOrderSales*` · operational KPIs |
| Internal services | `BusinessMetricsService` · `PaymentMethodAnalyticsService` | `OrderSalesMetricsService` · `OperationalMetricsService` |

No Excel/PDF layout redesign. Presentation continues to consume Reporting DTOs only.

---

## Files Changed

### New (read-side)

- `server/reporting-platform/settlementRecordReportingAdapter.ts` — list SR facts + flatten payment snapshots
- `server/reporting-platform/financialReportingSource.ts` — source mode resolver
- `server/reporting-platform/financialReportingParity.ts` — dual-run compare helpers
- `server/reporting-platform/__tests__/BusinessMetricsService.settlementRecord.test.ts`
- `server/reporting-platform/__tests__/financialReportingParity.test.ts`
- `shared/reporting-platform/__tests__/reportingSettlementRecordAdoption.architecture.guards.test.ts`
- `docs/engineering/programs/SETTLEMENT-RECORD-REPORTING-ADOPTION-1/REPORTING-ADOPTION.md` (this file)

### Updated (read-side)

- `server/reporting-platform/BusinessMetricsService.ts` — default load from Settlement Record; dual parity diagnostic
- `server/reporting-platform/PaymentMethodAnalyticsService.ts` — default load from SR payment snapshots
- `server/reporting-platform/businessMetricsAggregator.ts` — comment ownership (formulas unchanged)
- `server/reporting-platform/settlementTransactionReportingAdapter.ts` — marked legacy dual/check only
- `shared/reporting-platform/kpiDictionary.ts` — Revenue / Tax / counts / dailySales → `settlement_records`
- `shared/reporting-platform/reportingContracts.ts` — contract comments
- Architecture / unit tests for payment analytics, platform guards, capture guards
- Export acceptance sample wording (`Settlement Record payment snapshots`)

### Explicitly not changed

- Settlement Record domain / repository / Check finalize
- Check Aggregate · Order Settlement · Settlement Transaction writers
- Order Sales / Operational Metrics services
- Dashboard / Excel / PDF layout code (consume same APIs)

---

## APIs Updated

| Procedure | Contract | Behavior change |
|---|---|---|
| `reporting.getBusinessMetricsSummary` | `BusinessMetricsSummaryDto` (unchanged) | Reads `settlement_records` (gen=1 settlement/void) |
| `reporting.getBusinessMetricsTrend` | `BusinessMetricsTrendDto` (unchanged) | Same SR fact set + existing Business Day bucketing |
| `reporting.getPaymentMethodAnalytics` | `PaymentMethodAnalyticsDto` (unchanged) | Reads SR `paymentSnapshotJson` captured lines |
| `reporting.getOrderSalesSummary` / `getOrderSalesRollup` | Unchanged | Still Order Read (P-10 dual-metric law) |
| Operational / Catalog KPIs | Unchanged | Not financial Settlement Record |

Env (ops only):

| Value | Meaning |
|---|---|
| `settlement_record` (default) | Canonical cutover |
| `dual` | Compute Check/ST + SR; **return SR**; log warn on mismatch |
| `check` | Legacy Check/ST reads (emergency / tests only) |

Diagnostic helper (server-only, not a public router change): `getBusinessMetricsParityDiagnostic`.

---

## Dashboard Changes

- `SettlementOverviewSection` / Sessions revenue widgets continue to call `reporting.getBusinessMetricsSummary` — now SR-backed.
- `PaymentMethodAnalysisSection` continues to call `reporting.getPaymentMethodAnalytics` — now SR payment snapshots.
- No UI redesign; no operational KPI formula changes.

---

## Excel Changes

Sheets still built from the same export bundle DTOs:

- Executive Summary — Business Metrics + Order Sales (financial half now SR)
- Financial Summary — Revenue / Tax / Average Check from Business Metrics (SR)
- Payment Method Analysis — PaymentMethodAnalytics (SR snapshots)
- Tax / Settlement summary fields — from Business Metrics publication values

Layout functions (`buildExecutiveSheet`, `buildFinancialSheet`, `buildPaymentMethodSheet`) unchanged. Acceptance wording updated to name Settlement Record.

---

## PDF Changes

PDF financial sections consume the same Reporting DTOs. Presentation builders unchanged; values follow server cutover.

---

## Dual Run Evidence

Dual-run path (`REPORTING_FINANCIAL_SOURCE=dual`):

```
Legacy Check / Settlement Transactions
        ↓ compare
Settlement Record publication
        ↓ return
Settlement Record (canonical)
```

Compared fields:

| Domain | Fields |
|---|---|
| Business Metrics | `revenue`, `taxCollected`, `averageCheck`, `complimentaryAmount`, `paidCheckCount`, `complimentaryCount`, `voidedCount` |
| Payment Analytics | `monetaryTenderTotal`, `complimentaryAmount`, per-method `tenderAmount` / `transactionCount` |

Unit evidence (`financialReportingParity.test.ts`):

- Identical Check↔SR fact fixtures → **parity matched** (revenue `115.00`, tax `15.00`, average check `115.00`, paid count `1`).
- Deliberate money/tender deltas → **parity mismatch detected** with field-level deltas.
- Default source mode resolves to `settlement_record`.

Service evidence (`BusinessMetricsService.settlementRecord.test.ts`):

- Default mode aggregates from `listSettlementRecordsForReporting` only.
- `listTerminalChecksForReporting` is **not** called in `settlement_record` mode.

Payment evidence (`PaymentMethodAnalyticsService.test.ts`):

- Mix / check counts / complimentary separation from SR payment lines matches prior ST semantics (`120.00` monetary, `15.00` complimentary).

Mismatch logging (dual mode): structured `opsLog` events

- `reporting_financial_parity_mismatch`
- `reporting_payment_parity_mismatch`

---

## Parity Validation

| Check | Result |
|---|---|
| Revenue formula semantics (SUM paid grandTotal) | Preserved; source table → `settlement_records` |
| Tax Collected from snapshot (not live settings) | Preserved via published tax snapshot |
| Average Check = Revenue / paidCheckCount | Preserved (aggregator unchanged) |
| Payment mix from captured tenders | Preserved via payment snapshot copy |
| Dual-run helper equality on mirrored facts | Pass |
| Architecture guards require SR adapters | Pass |

### Production historical note

Production migration `0076` created an empty `settlement_records` table. Pre-cutover finalized Checks have **no** Settlement Record rows. Under canonical mode, historical Revenue/Tax/payment mix for those Checks is **zero until** a separate historical backfill program (out of scope; write-side forbidden here).

Go-forward settlements create Settlement Records atomically with Check finalize; for those periods, dual-run parity is expected when ST/Check and SR exist for the same finalize generation.

---

## Regression Results

| Suite | Result |
|---|---|
| `server/reporting-platform/**` | Pass |
| `shared/reporting-platform/**` | Pass |
| Settlement payment-method capture guards (updated consumer expectation) | Pass |
| **Total** | **20 files · 105 tests passed** |

Operational regression protections:

- `OrderSalesMetricsService` / `OperationalMetricsService` do **not** import Settlement Record adapter (architecture guard).
- KPI governance: `orderSales` / `averageOrder` remain `order_read` owned.
- Revenue remains Check-owned domain with Settlement Record publication formula.
- No writes to Check / Session / Order from Reporting services.

---

## Risks

| Risk | Mitigation |
|---|---|
| Historical Checks without Settlement Records under-report | Documented; requires separate backfill program; go-forward finalize publishes SR |
| Dual-run noise if ST and SR diverge (e.g. historical) | Dual mode logs warn; production default is SR-only |
| Emergency rollback | `REPORTING_FINANCIAL_SOURCE=check` restores legacy reads without code deploy of formulas |
| Compensating generations | Adapter filters `recordGeneration === 1` and kinds `settlement`/`void` only |

---

## Final Validation

| Criterion | Status |
|---|---|
| Settlement Record is canonical financial reporting source | ✓ |
| Financial formulas match prior semantics (aggregation only) | ✓ |
| Dashboard consumes SR-backed APIs | ✓ |
| Excel consumes SR-backed DTOs (no layout regression) | ✓ |
| PDF consumes SR-backed DTOs | ✓ |
| APIs validated (contracts stable) | ✓ |
| Business Day / timezone filtering preserved (`settledAt` / `voidedAt` window) | ✓ |
| Multi-tenant isolation (`restaurantId` predicate) | ✓ |
| Operational reporting unchanged (Order Read) | ✓ |
| Regression tests pass | ✓ |
| Write-side / Check Aggregate / ST / OS untouched | ✓ |

---

## Final Verdict

**REPORTING ADOPTION COMPLETE**
