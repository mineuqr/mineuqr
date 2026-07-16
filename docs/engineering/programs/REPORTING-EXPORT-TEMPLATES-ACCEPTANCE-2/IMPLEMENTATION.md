# REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 — Implementation

## Key files

| Path | Role |
|------|------|
| `excel/buildReportingExportWorkbook.ts` | Full executive workbook redesign |
| `pdf/buildReportingExportPdf.ts` | Matching PDF executive document |
| `periodPresentation.ts` | Scope badges + trend axis labels |
| `labels.ts` | Business language (monthly/annual titles) |
| `types.ts` | Bundle without operational/catalog |
| `ReportsTab.tsx` | Period labels + export title wiring |
| `scripts/capture-reporting-export-acceptance-screenshots.mjs` | Visual pack |

## Sample generation

```bash
pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts
node scripts/capture-reporting-export-acceptance-screenshots.mjs
```
