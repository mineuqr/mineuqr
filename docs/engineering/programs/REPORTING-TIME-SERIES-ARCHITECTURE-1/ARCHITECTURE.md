# REPORTING-TIME-SERIES-ARCHITECTURE-1 — Architecture

## Purpose

Make the Reporting Platform the exclusive owner of business time-series generation used by dashboards, charts, exports, and future analytics.

| Concern | Owner |
|---------|--------|
| **WHAT** is measured | KPI Governance (`KPI_DICTIONARY`) |
| **HOW** measurements are aggregated over time | Time Series Architecture (this program) |

## Relationship to prior certifications

| Program | Relationship |
|---------|--------------|
| REPORTING-PLATFORM-ARCHITECTURE-1 | Extended — time-series owned inside Reporting Platform |
| REPORTING-KPI-GOVERNANCE-1 | Preserved — KPI formulas unchanged |
| REPORTING-CANONICAL-API-SUNSET-1 | Preserved — Session / admin surfaces remain non-canonical |
| REPORTING-REVENUE-FORENSICS-1 | Preserved — Revenue = paid Check `grandTotal` |
| TZ-6 | Aligned — Business Calendar uses `APP_TIMEZONE` |
| CHECK-MANAGEMENT-ARCHITECTURE-1 | Preserved — Check domain money ownership |

## Domain model

| Concept | Meaning |
|---------|---------|
| `TimeSeries` | Metric id + granularity + range + aggregated buckets |
| `TimeBucket` | `periodKey` + `periodStart` + granularity |
| `TimeRange` | Inclusive `from` / `to` (stored UTC datetime strings) |
| `Granularity` | `hour` \| `day` \| `week` \| `month` \| `quarter` \| `year` |
| `AggregationStrategy` | `sum` \| `count` \| `avg` \| `last` \| `max` \| `min` |
| `ComparisonStrategy` | `previous_period` \| `previous_business_period` \| `previous_year` |

Module root: `shared/reporting-platform/timeSeries/`

## Granularity definitions

| Grain | Period key | Period start |
|-------|------------|--------------|
| hour | `YYYY-MM-DDTHH` (business wall) | Wall hour 00s → UTC ISO |
| day | `YYYY-MM-DD` | Wall midnight → UTC ISO |
| week | `YYYY-Www` (ISO week from business YMD) | Monday wall midnight → UTC ISO |
| month | `YYYY-MM` | 1st wall midnight → UTC ISO |
| quarter | `YYYY-Qn` | Quarter start wall midnight → UTC ISO |
| year | `YYYY` | Jan 1 wall midnight → UTC ISO |

Check trend API still accepts `day` \| `week` \| `month` (`ReportingTrendGrouping`).

## Business Calendar rules

1. Business timezone = `APP_TIMEZONE` (`Asia/Riyadh`) via `REPORTING_BUSINESS_TIMEZONE`.
2. Period keys are wall-calendar in that timezone — never server local, browser local, or UTC calendar.
3. Stored timestamps remain UTC instants; conversion uses `parseStoredUtcInstant`.
4. Opening-hours **Business Day** (`shared/utils/businessDay.ts`) is for order identity — **not** reporting series keys.
5. Month/year export bounds use `businessCalendarMonthReportingBounds` / `businessCalendarYearReportingBounds` (UTC-stored equivalents of wall bounds).

## Comparison model

| Field | Meaning |
|-------|---------|
| `delta` | current − previous |
| `growthPercent` | ((current − previous) / \|previous\|) × 100; `null` if previous = 0 and current ≠ 0 |
| `trendDirection` | `up` \| `down` \| `flat` |

APIs:

- `reporting.compareMetricValues` → `ComparisonDto`
- `reporting.getComparisonBaselineRange` → baseline `TimeRange`

Presentation must consume these DTOs. Presentation must never compute growth / delta / direction.

## DTO contracts

| DTO | Role |
|-----|------|
| `TimeSeriesDto` | Canonical series |
| `TimeBucketDto` / `TrendPointDto` | Bucket / point |
| `ComparisonDto` | Comparison result |
| `ChartSeriesDto` | Numeric chart projection |

Adapters (no recalculation):

- `businessTrendToTimeSeriesDto`
- `orderSalesRollupToTimeSeriesDto`
- `timeSeriesToChartSeriesDto`

Backward-compatible product DTOs remain:

- `BusinessMetricsTrendDto`
- `OrderSalesRollupDto`

## Ownership boundaries

| Allowed | Forbidden |
|---------|-----------|
| Reporting Platform creates business series | Client invents period keys |
| Presentation maps / labels / charts DTO points | Presentation aggregates by hour/day/week/month |
| Presentation re-sums scoped DTO points for cover totals (PERIOD-CONSISTENCY) | Presentation computes MoM / YoY / growth% |
| Legacy Session trend stays soft-sunset | New restaurant KPI series outside Reporting Platform |

## Extension rules

1. Add granularity behavior only in `shared/reporting-platform/timeSeries/calendar.ts`.
2. New series materialization lives under `server/reporting-platform/`.
3. Expose via Reporting DTOs / adapters — never ad-hoc client buckets.
4. KPI value formulas stay in KPI Governance / existing aggregators — time series only buckets them.
5. Order Read `dayKey` materialization remains Order Domain ownership until a dedicated Order Read calendar program.

## Architectural gap (documented)

P-10 `dayKey` is still derived as a UTC date prefix inside Order Read. Reporting selects “today” / current month with Business Calendar when reading those keys. Full dayKey alignment requires an Order Read program — not in scope here.
