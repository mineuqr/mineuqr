# REPORTING-PRODUCT-SEMANTICS-1 — Implementation Report

## 1. KPI inventory

See [AUDIT.md](./AUDIT.md).

## 2. Semantic audit

Bare **Revenue** and **Daily Sales (Revenue)** were the primary ambiguity sources versus **Order Sales**. Mapping was already correct (forensics). Issue was product language.

## 3. Terminology improvements

| Before | After | Surfaces |
|--------|-------|----------|
| Revenue | **Check Revenue** / إيرادات الشيكات | Dictionary, Dashboard, Excel, PDF labels |
| Daily Sales (Revenue) | **Daily Check Revenue** | Dictionary |
| Revenue Overview / Trends / Analytics | Check Revenue Overview / Trends / Analytics | Dashboard |
| Revenue Trends (sheet) | Check Revenue Trends | Excel |
| (none) | Reporting Basis clarifications for Check Revenue vs Order Sales | Excel Financial |

Deprecated synonyms documented in `DEPRECATED_PRESENTATION_LABELS`.

## 4. Files modified

**Added**

- `shared/reporting-platform/productSemantics.ts`
- `shared/reporting-platform/__tests__/reportingProductSemantics.architecture.guards.test.ts`
- `docs/engineering/programs/REPORTING-PRODUCT-SEMANTICS-1/*`

**Modified**

- `shared/reporting-platform/kpiDictionary.ts` (names / notDefinedAs / descriptions only)
- `shared/reporting-platform/index.ts`
- `client/src/lib/reporting/kpiDisplay.ts`
- `client/src/lib/reporting-exports/labels.ts`
- `client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExports.test.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts`
- `client/src/components/dashboard/SettlementOverviewSection.tsx`
- `client/src/components/dashboard/SettlementTrendsSection.tsx`
- `client/src/components/dashboard/ReportsTab.tsx`
- `client/src/components/dashboard/SessionsWorkspacePanel.tsx`

## 5. Documentation updates

- [TERMINOLOGY.md](./TERMINOLOGY.md) — preferred / deprecated / rules
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AUDIT.md](./AUDIT.md)
- [VALIDATION.md](./VALIDATION.md)

## 6. Validation results

See [VALIDATION.md](./VALIDATION.md).

## 7. Risks

1. Users accustomed to bare “Revenue” need a short education period — mitigated by Excel Reporting Basis notes.
2. Historical sample xlsx screenshots under older programs may still show “Revenue” until regenerated.
3. Internal symbols (`SettlementOverviewSection`, `paidRevenue` chart keys) remain — not user-facing.

## 8. Recommendations

1. Regenerate DESIGN-LANGUAGE sample workbooks when convenient.
2. Optionally localize admin Statistics copy in a separate admin semantics program.
3. Keep `calculationVersion` unchanged for future label-only edits.

## 9. Final status

**Ready for independent architecture review.**

No blocking issue. Values, APIs, DTO fields, and KPI ids unchanged.
