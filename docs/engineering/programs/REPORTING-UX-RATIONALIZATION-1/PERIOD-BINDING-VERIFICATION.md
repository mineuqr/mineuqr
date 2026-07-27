# Period Binding Verification

| Surface | Bound to active period? | Semantics |
|---------|-------------------------|-----------|
| ReportsTab period control | Yes (source of truth) | Month/Year Gregorian |
| Executive KPIs | Yes (`activeBusiness`) | Same `from`/`to` as Excel |
| Order Sales period cards | Yes (rollup for scope) | Month/year rollup |
| Today Order Sales | Explicit **Business Day** label | Daily BD (Decision 1) |
| Financial Performance | Yes (`from`/`to` required) | Gregorian when month/year |
| Refund Analytics | Yes | Same |
| Payment Analytics | Yes | Same |
| Tax | Yes | Same |
| Trends | Yes | Same; day grouping = BD keys inside range |
| Excel month export | `monthReportingRange` | Gregorian |
| Excel year export | `yearReportingRange` | Gregorian |
| Lifetime on Reports | **Forbidden** unless labeled | None unlabeled |

## Code proof

- `SettlementOverviewSection` / `SettlementTrendsSection` / `RefundAnalyticsSection` require `from` + `to`.
- `ReportsTab` sets `activeRange` from `monthReportingRange` / `yearReportingRange`.
- Export bundle uses the same month/year ranges.
