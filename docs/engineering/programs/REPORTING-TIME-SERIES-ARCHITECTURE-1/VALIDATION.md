# REPORTING-TIME-SERIES-ARCHITECTURE-1 — Validation

## Checklist

| Requirement | Result |
|-------------|--------|
| Charts use canonical reporting services | Pass — Dashboard / exports use `reporting.getBusinessMetricsTrend` / `getOrderSalesRollup` |
| Business Calendar respected for Check trends | Pass — `resolveBusinessPeriodKey` |
| Timezone matches TZ-6 (`APP_TIMEZONE`) | Pass — `REPORTING_BUSINESS_TIMEZONE` |
| No duplicate restaurant series engines added | Pass — Session trend remains soft-sunset |
| Presentation performs no business aggregation / growth math | Pass — architecture guards |
| KPI formulas unchanged | Pass — Revenue still paid Check `grandTotal` |
| Revenue definition unchanged | Pass |
| Architecture guards pass | **Pass** — `reportingTimeSeries.architecture.guards` (8) + related reporting guards (16) |
| Unit tests pass | **Pass** — calendar (7), comparison (5), aggregator (4), exports helpers (7) |
| `pnpm build` | **Pass** (2026-07-18) |

## Non-goals confirmed

- No redesign of Reporting Platform surface area beyond additive comparison APIs
- No Session money promotion to Revenue
- Opening-hours Business Day not forced into series keys
