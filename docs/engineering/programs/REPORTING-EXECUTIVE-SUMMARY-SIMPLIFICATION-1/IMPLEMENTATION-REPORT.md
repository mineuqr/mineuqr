# REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — Implementation Report

## 1. Repository investigation

| Artifact | Path |
|----------|------|
| Executive KPI ids | `shared/reporting-platform/productSemantics.ts` → `EXECUTIVE_SUMMARY_KPI_IDS` |
| Shared view model | `client/src/lib/reporting-exports/executiveSummaryPresentation.ts` |
| Excel Executive | `buildReportingExportWorkbook.ts` → `buildExecutiveSheet` |
| Excel Financial | `buildFinancialSheet` (Money Collected + Tax + …) |
| PDF Executive / Financial | `buildReportingExportPdf.ts` |
| Dashboard | Check Revenue Overview / Trends unchanged (not Executive export page) |

**Money Collected was rendered** in Executive as group `collected` (Check Revenue, Paid Checks, Average Check) via `buildExecutiveSummaryViewModel`.

## 2. Executive Summary audit

Prior (UX-1): two groups — Money collected + Orders served (6 KPIs).

Financial Summary already duplicated Check Revenue / Paid Checks / Average Check — safe to remove from Executive without data loss.

## 3. Presentation simplification decisions

| Decision | Rationale |
|----------|-----------|
| Executive = Order Sales, Orders, Average Order only | Answers “How is the restaurant performing **operationally**?” in seconds |
| Remove Money Collected from Executive | Financial story belongs on Financial Summary |
| Keep KPI definitions / Revenue formula unchanged | Presentation-only program |
| Footer note points to Financial + Payment Method Analysis | No orphaned metrics |

## 4. KPI relocation confirmation

| KPI | Executive | Financial |
|-----|-----------|-----------|
| Order Sales | **Yes** | Yes (detail) |
| Orders | **Yes** | Yes |
| Average Order | **Yes** | Yes |
| Check Revenue | No | **Yes** (Money Collected) |
| Paid Checks | No | **Yes** (Money Collected) |
| Average Check | No | **Yes** (Money Collected) |
| Tax Collected | No | **Yes** (+ period note) |

## 4.5 Tax presentation review

- Formula unchanged: `SUM(taxAmount)` on paid checks in period (KPI registry).
- Presentation: Financial Summary Tax section now shows `taxAnalysisPeriodNote` stating Tax Collected is the **total for the entire reporting period**.
- No API / DTO / calculation changes.

## 5. Product Semantics compliance

- Extended `SECTION_TERMINOLOGY` (`moneyCollected`, `moneyCollectedHint`, `taxAnalysisPeriodNote`, updated `executiveSnapshotHint`).
- Updated `EXECUTIVE_SUMMARY_KPI_IDS` to operational trio.
- Labels via `preferredKpiLabel` / `SECTION_TERMINOLOGY` — no hardcoded KPI names in presentation.

## 6. Files modified

- `shared/reporting-platform/productSemantics.ts`
- `client/src/lib/reporting-exports/executiveSummaryPresentation.ts`
- `client/src/lib/reporting-exports/labels.ts`
- `client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts`
- `client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExecutiveSummary.architecture.guards.test.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts` (reconciliation text)
- `docs/engineering/programs/REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1/*`

## 7. Validation

See [VALIDATION.md](./VALIDATION.md).

## 8. Risks discovered

1. Owners who looked for Check Revenue on page 1 must open Financial Summary — mitigated by footer note + Money Collected heading.
2. RATIONALIZATION/UX docs still describe six Executive KPIs historically — superseded by this program for presentation selection.

## 9. Recommendations

1. Optionally mirror operational-first framing on Dashboard later (out of scope).
2. Keep Check Revenue Trends sheet as the time-series home for Check Revenue.

## 10. Final implementation status

**Ready for independent architecture review.**
