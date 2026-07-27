# TIME SEMANTICS VALIDATION

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Revision** | **2.0** (Implementation Authorization) |
| **Date** | 2026-07-27 |
| **Status** | **Implemented** — Gregorian month/year; Business Day daily |

---

## Authorized rules (Rev 2.0)

| Report class | Required semantics | Production helper |
|--------------|-------------------|-------------------|
| **Daily Sales** | **Business Day** only | `businessDayReportingBoundsForDay` / `reportingBusinessTodayKey` |
| **Monthly Sales** | **Gregorian Calendar Month** (wall day 1 00:00:00 → last day 23:59:59) | `gregorianCalendarMonthReportingBounds` via `monthReportingRange` |
| **Yearly Sales** | **Gregorian Calendar Year** (Jan 1 → Dec 31) | `gregorianCalendarYearReportingBounds` via `yearReportingRange` |
| Refund reporting | Inherit the report’s time semantics | Same `from`/`to` |
| Excel | Identical rules — no exceptions | Same period helpers |

---

## Production behavior (post Rev 2.0)

| Concern | Implementation | Evidence |
|---------|----------------|----------|
| Daily key / daily bounds | Business Day (opening → next opening) | `businessDayReporting.ts` |
| Month picker label | Civil YYYY-MM | ReportsTab |
| Month `from`/`to` | **Pure Gregorian wall month** | `periodRange.ts` → `gregorianCalendarMonthReportingBounds` |
| Year `from`/`to` | **Pure Gregorian wall year** | `periodRange.ts` → `gregorianCalendarYearReportingBounds` |
| Month/year trend buckets | Wall calendar year-month / year | `resolveBusinessPeriodKey` |
| Excel period | Same as Dashboard | Shared `monthReportingRange` / `yearReportingRange` |
| Overview / Refund / Payment / Tax / Trends | Required `from`/`to` | No unlabeled lifetime on Reports |

### Legacy helpers (not Production filter path)

`businessDayMonthReportingBounds` / `businessDayYearReportingBounds` remain exported as **`@deprecated` legacy/internal**. They must **not** be used for Production month/year reporting filters.

---

## Audit history (pre-implementation)

The original Phase-3 audit documented that Production *then* used Business Day union windows for month/year. That conflict was resolved by **Rev 2.0 Decision 2–3** (authorized Gregorian month/year). Switching windows intentionally changes which publications fall in a calendar month vs BD-stretched month — accepted product semantics change, not a formula change.
