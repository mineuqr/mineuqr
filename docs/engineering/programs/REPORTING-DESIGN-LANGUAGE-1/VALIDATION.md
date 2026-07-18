# REPORTING-DESIGN-LANGUAGE-1 — Validation

**Status:** PRODUCTION CERTIFIED  
**Scope:** Full Excel presentation replacement (design language)  
**Non-goals:** No platform / DTO / API / KPI / database changes

---

## Design language

Official MineuQR Executive Design Language (teal SaaS):

| Token | Role |
|-------|------|
| `#0B3B45` brandDeep | Sheet chrome / table headers |
| `#0D9488` brand | Accent rules, chart tips |
| `#0F766E` brandDark | Totals / chart bars |
| `#F0FDFA` / `#CCFBF1` | Soft section washes |
| `#0C1222` ink | Primary typography |
| `#F7F8FA` canvas | Balanced whitespace plane |

Legacy navy (`#0B1F33`) / gold (`#B8943F`) presentation is removed from the Excel builder.

---

## Regenerate

```bash
pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts
pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingDesignLanguage.architecture.guards.test.ts
node scripts/capture-reporting-export-acceptance-screenshots.mjs
pnpm build
```

---

## Samples

| Scope | File |
|-------|------|
| Monthly | [`samples/reporting-design-language-en-2026-07.xlsx`](./samples/reporting-design-language-en-2026-07.xlsx) |
| Annual | [`samples/reporting-design-language-en-2026.xlsx`](./samples/reporting-design-language-en-2026.xlsx) |

Before (prior UX polish): [`before/`](./before/)  
After (this language): [`screenshots/`](./screenshots/)  
KPI ownership unchanged: [`KPI-RECONCILIATION.md`](./KPI-RECONCILIATION.md)

---

## Workbook structure (exactly five)

1. Cover  
2. Executive Summary — KPI dashboard (cards, not tables)  
3. Financial Summary — statement sections  
4. Order Sales — chart first, table second  
5. Revenue Trends — chart first, table second  

---

## Before / After (every worksheet)

| Sheet | Before | After |
|-------|--------|-------|
| Cover (month) | ![b](./before/month-cover.png) | ![a](./screenshots/month-cover.png) |
| Executive (month) | ![b](./before/month-executive-summary.png) | ![a](./screenshots/month-executive-summary.png) |
| Financial (month) | ![b](./before/month-financial-summary.png) | ![a](./screenshots/month-financial-summary.png) |
| Order Sales (month) | ![b](./before/month-order-sales.png) | ![a](./screenshots/month-order-sales.png) |
| Revenue Trends (month) | ![b](./before/month-revenue-trends.png) | ![a](./screenshots/month-revenue-trends.png) |
| Cover (year) | ![b](./before/year-cover.png) | ![a](./screenshots/year-cover.png) |
| Executive (year) | ![b](./before/year-executive-summary.png) | ![a](./screenshots/year-executive-summary.png) |
| Financial (year) | ![b](./before/year-financial-summary.png) | ![a](./screenshots/year-financial-summary.png) |
| Order Sales (year) | ![b](./before/year-order-sales.png) | ![a](./screenshots/year-order-sales.png) |
| Revenue Trends (year) | ![b](./before/year-revenue-trends.png) | ![a](./screenshots/year-revenue-trends.png) |

---

## Acceptance checklist

| Criterion | Result |
|-----------|--------|
| Old navy/gold workbook presentation removed from builder | **PASS** |
| One design language across all sheets | **PASS** |
| Monthly + annual professionally rendered | **PASS** |
| Charts populated when data exists | **PASS** |
| Designed empty state when insufficient trend data | **PASS** |
| Five sheets only | **PASS** |
| DTO-sourced values only (scoped rollup for Order Sales) | **PASS** |
| Western digits / `@` text | **PASS** |
| Landscape, freeze, hidden gridlines, print footer | **PASS** |
| Before/after screenshots every worksheet | **PASS** |
| Samples generated | **PASS** |
| Architecture guards + reporting tests | **PASS** |
| `pnpm build` | **PASS** |

---

## Certification

**REPORTING-DESIGN-LANGUAGE-1 — PRODUCTION CERTIFIED**

This workbook is the official MineuQR Excel reporting design language.
