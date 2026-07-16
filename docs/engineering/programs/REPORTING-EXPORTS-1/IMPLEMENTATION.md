# REPORTING-EXPORTS-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Delivered surface

| Path | Role |
|------|------|
| `client/src/lib/reporting-exports/` | Presentation export package |
| `…/types.ts` | `RestaurantReportingExportBundle` |
| `…/periodRange.ts` | Month/year `from`/`to` for reporting queries |
| `…/format.ts` | Snapshot currency / pricing mode formatting |
| `…/labels.ts` | Excel/PDF labels |
| `…/excel/buildReportingExportWorkbook.ts` | Multi-sheet Excel renderer |
| `…/pdf/buildReportingExportPdf.ts` | PDF renderer |
| `…/downloadReportingExport.ts` | Browser download helpers |
| `client/src/components/dashboard/ReportsTab.tsx` | Orchestrates `reporting.*` → bundle → Excel/PDF |

---

## 2. Export workbook / PDF contents

1. Executive Summary — Revenue, Order Sales, Paid Checks, averages, Sessions, Orders  
2. Financial Summary — Revenue, Tax Collected, Complimentary, Voided, Currency, Pricing Mode  
3. Operational Summary — Active Sessions, kitchen / order ops KPIs  
4. Catalog Summary — categories, items, visits (+ top-sellers unavailable note)  
5. Order Sales Rollup — period rows from DTO (no client totals)  
6. Revenue Trend — period rows from Business Metrics Trend DTO  

---

## 3. Legacy removal

| Before | After |
|--------|-------|
| `downloadSalesReportXlsx` from ReportsTab | `downloadReportingExportXlsx` / `Pdf` |
| Client `reduce` totals on Order Sales rows | Removed |
| Live restaurant currency for export authority | Reporting Check currency snapshot |

`client/src/lib/excel/salesReport.ts` remains deprecated and unused by Reports.

---

## 4. Explicit non-changes

- Reporting Platform services / contracts untouched  
- Order / Check / Session / Runtime / Business Settings / Business Identity untouched  
- No migrations  

---

## 5. Guards

`client/src/lib/reporting-exports/__tests__/reportingExports.architecture.guards.test.ts`
