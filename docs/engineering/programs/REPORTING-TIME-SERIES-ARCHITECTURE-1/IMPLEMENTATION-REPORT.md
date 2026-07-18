# REPORTING-TIME-SERIES-ARCHITECTURE-1 — Implementation Report

## 1. Repository audit

See [AUDIT.md](./AUDIT.md).

## 2. Time Series architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Reporting Platform owns:

- Period key resolution (Business Calendar)
- Granularity definitions
- Comparison framework
- Canonical time-series DTOs / adapters
- Export month/year bounds used by `reporting.*` filters

## 3. Canonical domain model

Introduced under `shared/reporting-platform/timeSeries/`:

| File | Contents |
|------|----------|
| `granularity.ts` | Six granularities + trend subset |
| `types.ts` | TimeSeries, TimeBucket, TimeRange, strategies |
| `calendar.ts` | Business Calendar bucketing + reporting bounds |
| `comparison.ts` | Delta / growth / direction / baseline ranges |
| `contracts.ts` | TimeSeriesDto, ComparisonDto, ChartSeriesDto, … |
| `adapters.ts` | Map existing trend/rollup DTOs → TimeSeriesDto |

## 4. Granularity definitions

`hour` · `day` · `week` · `month` · `quarter` · `year` — identical definitions for every reporting service via `resolveBusinessPeriodKey` / `resolveBusinessPeriodStart`.

## 5. DTOs introduced

- `TimeSeriesDto`
- `TimeBucketDto`
- `TrendPointDto`
- `ComparisonDto`
- `ChartSeriesDto`

Existing `BusinessMetricsTrendDto` / `OrderSalesRollupDto` unchanged as product contracts.

## 6. Consumer adoption audit

| Consumer | Status |
|----------|--------|
| Dashboard `SettlementTrendsSection` | Already canonical (`getBusinessMetricsTrend`) — now Business Calendar buckets |
| Reports / Excel / PDF charts | Already canonical series DTOs; `periodRange` migrated to Business Calendar bounds |
| `scopeTotals` | Presentation re-sum — allowed (PERIOD-CONSISTENCY) |
| `settlementTrendDisplay` | Presentation mapping — no period-key invention |
| `ops.getSettlementTrend` | Soft-sunset — not migrated (Session money) |
| Admin `getRevenueByMonth` / `userGrowth` | Out of restaurant Reporting domain |
| Comparison UI | **Gap** — framework + APIs ready; no Dashboard widget consumes `compareMetricValues` yet |
| Order Read dayKey writers | **Gap** — UTC prefix remains Order Read ownership |

## 7. Files modified / added

**Added**

- `shared/reporting-platform/timeSeries/*`
- `shared/reporting-platform/__tests__/timeSeriesCalendar.test.ts`
- `shared/reporting-platform/__tests__/timeSeriesComparison.test.ts`
- `shared/reporting-platform/__tests__/reportingTimeSeries.architecture.guards.test.ts`
- `server/reporting-platform/TimeSeriesComparisonService.ts`
- `docs/engineering/programs/REPORTING-TIME-SERIES-ARCHITECTURE-1/*`

**Modified**

- `shared/reporting-platform/index.ts`
- `shared/reporting-platform/reportingContracts.ts` (doc comment)
- `server/reporting-platform/businessMetricsAggregator.ts`
- `server/reporting-platform/OrderSalesMetricsService.ts`
- `server/reporting-platform/OperationalMetricsService.ts`
- `server/reporting-platform/ReportingService.ts`
- `server/reporting-platform/reportingRouter.ts`
- `server/reporting-platform/__tests__/businessMetricsAggregator.test.ts`
- `server/analytics/settlementMetrics.ts` (legacy notice)
- `client/src/lib/reporting-exports/periodRange.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExports.test.ts`

## 8. Validation results

See [VALIDATION.md](./VALIDATION.md).

## 9. Risks discovered

1. **Boundary shift:** Checks settled in the UTC↔Riyadh gap (21:00–23:59 UTC) move to the next business day/month vs prior UTC bucketing. Intentional TZ-6 alignment; midday fixtures unchanged.
2. **Export window shift:** Month/year `from`/`to` now encode business wall bounds as UTC-stored datetimes — month totals can change for edge-window checks.
3. **Order Sales dayKey mismatch:** Selecting Business Calendar “today” against UTC-prefixed P-10 keys can diverge near midnight until Order Read dayKeys are aligned.
4. **Week Monday start:** ISO week Monday wall midnight uses civil YMD from ISO algorithm; acceptable and documented.

## 10. Recommendations

1. Schedule Order Read dayKey → Business Calendar program.
2. Adopt `reporting.compareMetricValues` on Dashboard when MoM/YoY UI is required.
3. Optionally project `BusinessMetricsTrendDto` through `businessTrendToTimeSeriesDto` in new APIs.
4. Keep Session `settlementMetrics` period helpers quarantined (soft-sunset).

## 11. Final implementation status

**Ready for independent architecture review.**

Blocking issues: none for Reporting Platform ownership of restaurant business time-series. Remaining gaps are documented (Order Read dayKey; comparison UI adoption) and do not revert ownership.
