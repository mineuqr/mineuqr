# REPORTING-UX-RATIONALIZATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Revision** | **2.0** (Implementation Authorization) |
| **Date** | 2026-07-27 |
| **Mode** | Presentation & period binding — **no financial formula changes** |

---

## Decisions implemented

| Decision | Implementation |
|----------|----------------|
| **1** Daily = Business Day | Unchanged — day keys / today still `reportingBusinessTodayKey` / BD windows |
| **2** Monthly = pure Gregorian | `gregorianCalendarMonthReportingBounds` + `periodRange.monthReportingRange` |
| **3** Yearly = Gregorian + month buckets | Year bounds Gregorian; trend `month`/`year`/`quarter` keys from wall calendar |
| **4** Excel Exec V2 | `EXECUTIVE_SUMMARY_KPI_IDS` + `buildExecutiveSummaryViewModel` |

---

## P0–P4 status

| Priority | Status |
|----------|--------|
| **P0** Period consistency | **Done** — single active period drives Overview, Refund, Payment, Tax, Trends, Excel |
| **P1** Hierarchy | **Done** — Executive → Sales → Financial → Refund → Payment → Tax → Trends |
| **P2** Refund Analytics | **Done** — `RefundAnalyticsSection` unified |
| **P3** Excel rationalization | **Done** — Exec V2; sheet titles aligned; same DTOs/period as dashboard |
| **P4** Terminology | **Done** — Gross Sales / Net Sales / Refund Amount (ids unchanged) |

---

## Validation checklist

| Check | Result |
|-------|--------|
| Dashboard period == Excel period | **Met** (shared `activeRange` / export bundle) |
| Daily uses Business Day | **Met** |
| Monthly uses Gregorian Month | **Met** |
| Yearly uses Gregorian Year | **Met** |
| No lifetime leakage on Reports tab | **Met** (`from`/`to` required) |
| Refund section unified | **Met** |
| Financial calculations unchanged | **Met** (same aggregator formulas) |
| Revenue / Settlement / Refund behaviour unchanged | **Met** |

---

## Files changed

See `FILES-CHANGED.md` in this folder.

## Production readiness

See `PRODUCTION-READINESS-REPORT.md`.
