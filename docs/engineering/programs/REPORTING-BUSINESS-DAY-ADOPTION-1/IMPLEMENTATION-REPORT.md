# REPORTING-BUSINESS-DAY-ADOPTION-1 — Implementation Report

## Final status

**Ready for independent architecture review.**

Validation: 115 reporting-related tests passed; `pnpm build` passed.

---

## 1. Repository investigation

| Pattern | Pre-adoption locations | Disposition |
|---------|------------------------|-------------|
| `getUTCFullYear` / `getUTCMonth` | `ReportsTab.tsx` default month | Replaced with `businessCurrentYearMonth` |
| `ts.slice(0,10)` Order Sales dayKey | `projectionStatus.ts` | Replaced with `resolveBusinessDayKey` |
| Naive `00:00`–`23:59` “today” | `SessionsWorkspacePanel.tsx` | `businessDayTodayReportingBounds` |
| Wall midnight month/year bounds | `businessCalendar*ReportingBounds` | Delegates to `businessDay*ReportingBounds` |
| Wall `businessTodayKey` for Order Sales | `OrderSalesMetricsService` | `reportingBusinessTodayKey` + restaurant hours |
| Comparison day bounds wall midnight | `comparison.ts` | `businessDayReportingBoundsForDay` |
| Backfill dayKey without hours | `OrderReadProjectionBackfillService` | Loads restaurant hours via Identity resolver |

Canonical utilities (SSOT): `shared/utils/businessDay.ts` (`resolveBusinessDayKey`, `resolveBusinessDayWindow`, `resolveNormalizedOpeningHours`).

---

## 2. Calendar → Business Day migration inventory

| Concern | Before | After |
|---------|--------|-------|
| Day period key | Wall YMD | Opening-hours Business Day label |
| Month/year from–to | Wall 00:00–23:59 | First BD open → last BD next-open − 1s |
| Sessions today | Naive wall strings | `businessDayTodayReportingBounds` |
| Reports default month | UTC calendar | `businessCurrentYearMonth` + BD bounds via hours |
| Order Sales dayKey | UTC date slice | `resolveBusinessDayKey` + restaurant hours |
| Trend bucketing | Wall calendar | BD keys with restaurant hours |
| Comparison baselines | Wall midnight | BD opening → next opening (+ server hours load) |

---

## 3. Files modified / added

**Added**

- `shared/reporting-platform/timeSeries/businessDayReporting.ts`
- `server/reporting-platform/restaurantWorkingHoursAdapter.ts`
- `shared/reporting-platform/__tests__/reportingBusinessDayAdoption.architecture.guards.test.ts`
- `docs/engineering/programs/REPORTING-BUSINESS-DAY-ADOPTION-1/*`

**Modified (core)**

- `shared/reporting-platform/timeSeries/calendar.ts` — BD period keys / bounds
- `shared/reporting-platform/timeSeries/comparison.ts` — BD comparison ranges + hours
- `shared/reporting-platform/timeSeries/index.ts`, `shared/reporting-platform/index.ts`
- `client/src/lib/reporting-exports/periodRange.ts`
- `server/reporting-platform/BusinessMetricsService.ts`, `businessMetricsAggregator.ts`
- `server/reporting-platform/OrderSalesMetricsService.ts`, `OperationalMetricsService.ts`
- `server/reporting-platform/TimeSeriesComparisonService.ts` — async hours load
- `server/order/read/projections/materializers/projectionStatus.ts`
- `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts`
- `server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService.ts`
- `client/.../SessionsWorkspacePanel.tsx`, `ReportsTab.tsx`, `Dashboard.tsx`
- Tests: calendar, comparison, aggregator, time-series guards, export helpers

---

## 4. Business Day adoption map

```
restaurants.workingHours
  → restaurantOpeningTimeResolver / reportingWorkingHours
  → resolveBusinessDayKey / resolveBusinessDayWindow
  → reporting bounds + period keys + Order Read dayKey
  → Dashboard / Excel / PDF (same from/to DTOs)
```

No duplicated opening-hours math inside reporting services.

---

## 5. Query migration evidence

- Filters remain lexicographic on stored UTC `from`/`to`; values are now BD-derived.
- No Revenue / Tax / Settlement SQL formula changes.
- Payment Method Analytics consumes the same BD `from`/`to` when clients use `monthReportingRange` / `yearReportingRange`.
- `getComparisonBaselineRange` loads restaurant hours server-side (restaurantId already on the procedure).

---

## 6. KPI adoption matrix

| KPI family | BD filter | BD day key |
|------------|-----------|------------|
| Check Revenue / Tax / Paid / Comp / Void | Yes (`from`/`to`) | Trend yes |
| Order Sales / Orders / Avg Order | Today key yes; month prefix on BD labels | Materializer yes |
| Payment Method Analytics | Yes (`from`/`to`) | N/A (tender list) |
| Operational snapshot day | Yes | Yes |
| Comparison baselines | Yes | Yes |
| Executive / Excel / PDF | Via export bundle ranges | Via DTOs |

---

## 7–9. Dashboard / Excel / PDF

Identical `from`/`to` when built from `monthReportingRange` / `yearReportingRange` / today bounds + restaurant `workingHours`. Presentation remains period-agnostic (no month/year copy in KPI labels).

---

## 10. Financial reconciliation

| Domain | Formula / ownership | Changed? |
|--------|---------------------|----------|
| Revenue | `SUM(paid Check.grandTotal)` | No |
| Tax | Check tax SSOT | No |
| Settlement | Settlement Transactions | No |
| Check ownership | Unchanged | No |
| Business Financial Policy | Unchanged | No |
| Product Semantics / KPI formulas | Unchanged | No |

Only period membership near opening time may shift (intended).

---

## 11. Edge-case validation

| Case | Evidence |
|------|----------|
| Pre-open → previous BD | `timeSeriesCalendar.test.ts`, `businessDay.test.ts`, aggregator test |
| Month open→open bounds | Feb 2026 → `06:00:00` … `05:59:59` next month |
| Overnight / next-open window | `resolveBusinessDayWindow` (Identity utilities) |
| Cross-month / year | Month/year BD bounds + comparison tests |
| DST | `APP_TIMEZONE` (Asia/Riyadh) has none |
| Comparison day baseline | Previous BD via `businessDayReportingBoundsForDay` |

---

## 12. Regression analysis

- Historical Order Read rows keyed by UTC day remain until rebuild (`rebuildRollupsForRestaurant` / backfill now uses BD keys + hours).
- Missing `workingHours` → default normalized open **09:00** (platform default).
- TIME-SERIES docs that stated opening-hours BD unused are superseded by this program.

---

## 13. Risks discovered

1. **Projection backfill** required for accurate historical Order Sales BD keys.
2. Clients omitting `workingHoursRaw` fall back to default 09:00 opens for client-built ranges.
3. Dual API surface: `businessCalendar*ReportingBounds` (tz, hours) vs `businessDay*ReportingBounds` (hours, tz) — both BD; prefer the latter for new code.

---

## 14. Recommendations

1. Run Order Read rollup rebuild / backfill per restaurant after deploy.
2. Ensure settings always persist working hours for accurate BD.
3. Optional follow-up: server-side bound expansion API so clients need not pass hours for month/year chrome.

---

## 15. Final implementation status

| Gate | Result |
|------|--------|
| Architecture adoption complete | Yes |
| No financial formula drift | Yes |
| Canonical BD utilities reused | Yes |
| Tests (reporting suite) | **115 passed** |
| `pnpm build` | **Passed** |
| Ready for architecture review | **Yes** (with backfill note) |
