# REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 — Implementation

## Files

| Path | Change |
|------|--------|
| `excel/buildReportingExportWorkbook.ts` | Executive cover banner, KPI cards, Western text cells, print polish |
| `pdf/buildReportingExportPdf.ts` | Cover branding, KPI cards, styled tables, Cairo font |
| `pdf/arabicPdfText.ts` | Arabic reshape + bidi for pdfkit |
| `pdf/loadExportFont.ts` | Cairo load (public + server assets) |
| `branding.ts` | `resolveExportLogoAsset` — restaurant logo or MineuQR PNG |
| `labels.ts` | Removed engineering copy; cover/business labels |
| `downloadReportingExport.ts` | Async PDF download |
| `ReportsTab.tsx` | `businessName` + await PDF |
| `client/public/mineuqr-logo.png` | Fallback brand mark |
| `client/public/fonts/Cairo-Variable.ttf` | PDF Arabic typography |

## Sample generation

```bash
pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts
node scripts/capture-reporting-export-acceptance-screenshots.mjs
```

Samples: `docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1/samples/`  
Screenshots: `docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1/screenshots/`
