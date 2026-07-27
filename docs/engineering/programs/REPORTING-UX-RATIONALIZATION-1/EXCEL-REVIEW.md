# EXCEL REVIEW

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 5 — Excel Rationalization (audit) |
| **Date** | 2026-07-27 |
| **Builder** | `client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts` |

---

## Current workbook (6 sheets)

| # | Sheet | Role today | Audience fit |
|---|-------|------------|--------------|
| 1 | Cover | Brand, period, currency, tax policy, contents | OK |
| 2 | Executive Summary | Operational At a Glance (Order Sales, Completed Orders, Average Order) | Owner glance — **not** full executive financial |
| 3 | Financial Summary | Gross, Refunds, Net, Rate, Counts, Avg, Tax, Order Sales detail, Adjustments, Basis | Controller — strongest sheet |
| 4 | Payment Method Analysis | Tender + refund mix | Manager |
| 5 | Order Sales | Rollup + chart | Ops |
| 6 | Check Revenue Trends | Gross trend chart + table | Owner / Manager |

---

## Mirror Dashboard rule

| Requirement | Status |
|-------------|--------|
| Excel mirrors Dashboard business truth | **Failed for live Overview** (lifetime vs export period) |
| Excel uses same DTOs as period queries | **Met** for export bundle |
| No duplicated financial calculations in Excel | **Met** — presentation only |
| Same time semantics as dashboard APIs | **Met** (both BD month/year today) |

---

## Rationalization recommendations (presentation only)

### Executive Summary — make truly executive

| Keep | Change |
|------|--------|
| Operational Order Sales trio | Add **period-aligned** headline strip: Check Revenue, Net Revenue, Refund Rate (from same BusinessMetricsSummary already in bundle) — *presentation addition, no new calc* |
| Plain-language captions | Keep |
| Footer pointing to Financial | Keep if money stays detailed elsewhere; shorten if money moves up |

> Prior programs intentionally removed money from Executive. Re-introducing Gross/Net as a **small executive strip** is a product decision that improves owner readability without changing formulas. Requires UX approval (conflicts with EXECUTIVE-SUMMARY-SIMPLIFICATION-1).

**Audit recommendation:** Prefer **Option Exec-1** — keep Executive operational; ensure Financial is first after Cover for accountants. **Option Exec-2** — add 3 money headlines for Toast/Square parity.

### Financial Summary — accounting friendly

Proposed section order (reorder only):

1. Money performance: Check Revenue → Refund Publications → Net Revenue → Refund Rate  
2. Volume: Paid Checks → Refund Count → Average Check  
3. Tax  
4. Adjustments (Comp / Void)  
5. Order Sales Detail (dual-metric peer — clearly separated)  
6. Reporting Basis  

Remove obsolete historical artifacts if any remain (comments still mention Settlement Transactions in header — **copy cleanup**).

### Operational Summary

Order Sales sheet + Executive operational group already serve ops. Do not invent a third Order Sales block.

### Refunds

See REFUND-REVIEW — either dedicated sheet or first-class Financial subsection titled **Refunds**.

### Trends

Keep Gross as primary. Optional Net series later.

---

## Obsolete / historical artifacts

| Artifact | Action |
|----------|--------|
| Header comment “Settlement Transactions” | Rename to Settlement Record payment snapshots |
| Suspended PDF generator divergence risk | Keep suspended; if revived must twin Excel |
| Legacy `lib/excel/salesReport.ts` | Already deprecated — ensure unused |

---

## Disposition

Excel redesign is **approved as presentation adoption** after time-semantics gate + Exec money-strip decision. **No formula work.**
