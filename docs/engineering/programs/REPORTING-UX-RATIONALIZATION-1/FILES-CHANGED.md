# FILES CHANGED — REPORTING-UX-RATIONALIZATION-1 (Certification package)

Uncommitted working tree. **Do not commit until approved.**

## UI

- `client/src/components/dashboard/ReportsTab.tsx`
- `client/src/components/dashboard/SettlementOverviewSection.tsx`
- `client/src/components/dashboard/SettlementTrendsSection.tsx`
- `client/src/components/dashboard/RefundAnalyticsSection.tsx` *(new)*

## Reporting / presentation

- `client/src/lib/reporting-exports/periodRange.ts`
- `client/src/lib/reporting-exports/executiveSummaryPresentation.ts`
- `client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts`
- `client/src/lib/reporting-exports/types.ts`
- `shared/reporting-platform/productSemantics.ts`
- `shared/reporting-platform/kpiDictionary.ts`
- `shared/reporting-platform/reportingContracts.ts`
- `shared/reporting-platform/index.ts`
- `shared/reporting-platform/timeSeries/calendar.ts`
- `shared/reporting-platform/timeSeries/index.ts`
- `shared/reporting-platform/timeSeries/businessDayReporting.ts` *(deprecated markers)*

## API (comment only)

- `server/reporting-platform/reportingRouter.ts` *(JSDoc only)*

## Tests

- `client/src/lib/reporting-exports/__tests__/reportingUxRationalization.finalUat.reconciliation.test.ts` *(new)*
- `client/src/lib/reporting-exports/__tests__/reportingExecutiveSummary.architecture.guards.test.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExports.test.ts`
- `shared/reporting-platform/__tests__/reportingTimeSeries.architecture.guards.test.ts`
- `shared/reporting-platform/__tests__/reportingPaymentMethodAnalytics.architecture.guards.test.ts`
- `shared/reporting-platform/__tests__/reportingProductSemantics.architecture.guards.test.ts`
- `shared/reporting-platform/__tests__/timeSeriesCalendar.test.ts`
- `shared/reporting-platform/__tests__/timeSeriesComparison.test.ts`

## UAT scripts (read-only)

- `server/reporting-platform/__scripts__/reportingUxRationalization.liveUat.ts`
- `server/reporting-platform/__scripts__/reportingUxRationalization.liveUatData.ts`

## Documentation

- `docs/engineering/programs/REPORTING-UX-RATIONALIZATION-1/**` (audit + implementation + certification reports)
- `docs/engineering/programs/REPORTING-PAYMENT-METHOD-ANALYTICS-1/ARCHITECTURE.md`
- `docs/engineering/programs/REPORTING-PAYMENT-METHOD-ANALYTICS-1/IMPLEMENTATION-REPORT.md`
- `docs/engineering/programs/REPORTING-DESIGN-LANGUAGE-1/KPI-RECONCILIATION.md`
- `docs/engineering/programs/REPORTING-DESIGN-LANGUAGE-1/samples/*.xlsx`

## Explicitly unchanged

- Order / Check / Settlement write models
- Migrations / schema
- New or deleted API procedures
- Financial formula implementations
