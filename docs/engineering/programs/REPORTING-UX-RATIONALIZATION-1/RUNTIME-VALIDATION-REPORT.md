# Runtime Validation Report

## Period semantics

| Class | Expected | Validated |
|-------|----------|-----------|
| Daily | Business Day | Unit tests + architecture guards (`businessDayReportingBoundsForDay`, today key) |
| Monthly | Gregorian calendar month | `monthReportingRange(2026,7)` → `2026-06-30 21:00:00` … `2026-07-31 20:59:59` |
| Yearly | Gregorian calendar year | `yearReportingRange(2026)` → `2025-12-31 21:00:00` … `2026-12-31 20:59:59` |

No BD month/year leakage on Production filter path (`periodRange.ts` uses Gregorian only). Legacy BD month/year helpers are `@deprecated`.

## Hidden lifetime queries (Reports)

Financial / Refund / Payment / Tax / Trends require `from`/`to`. Today Order Sales remains explicitly Business Day labeled.

## Refund validation (live `720007` July 2026)

| KPI | Value | Source |
|-----|-------|--------|
| Refund Amount | 180.00 | `getBusinessMetricsSummary` |
| Refund Rate | 62.50 | same |
| Refund tender mix total | 180.00 | `getPaymentMethodAnalytics` |
| Refund trend | present in Exec/Excel via DTO fields | `getBusinessMetricsTrend` |

## Payment validation

`resolveFinancialReportingSourceMode()` → **`settlement_record`** (canonical). No regression to ST-only assumptions.

## Live probe script

`server/reporting-platform/__scripts__/reportingUxRationalization.liveUatData.ts` (read-only).
