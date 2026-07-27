# Excel Toolbar Relocation Report

## Change

| Before | After |
|--------|-------|
| Excel buttons at bottom of Financial Analytics only | Sticky Reporting header toolbar on **all** tabs |

## Implementation

- `ReportingExcelToolbar` in sticky header under Reports title  
- Same `downloadReportingExportXlsx` / `exportScopeXlsx` paths  
- `FINANCIAL_SECTION_IDS.exports` → `reporting-excel-toolbar` for scroll/focus  
- Bottom Financial “Exports” section removed  

## Non-goals (honored)

No change to Excel workbook generation, sheet contents, or bundle builders.
