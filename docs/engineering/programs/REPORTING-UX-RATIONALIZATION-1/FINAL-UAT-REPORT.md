# REPORTING-UX-RATIONALIZATION-1 — Final UAT Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Date** | 2026-07-27 |
| **Mode** | Observation remediation + runtime UAT |
| **Commit policy** | **No commit / no push** (awaiting approval) |

## Observation remediation

| Obs | Action | Result |
|-----|--------|--------|
| 1 ST-only wording | Docs + router/types/contracts comments → Settlement Record canonical | **Done** (no runtime behavior change) |
| 2 BD month/year helpers | Marked `@deprecated` legacy/internal; Production filters remain Gregorian | **Done** |
| 3 Exec KPI terminology | Gross Sales / Net Sales / Refund Amount / Refund Rate in contracts, comments, guards | **Done** (formulas unchanged) |

## UAT execution summary

| Layer | Result |
|-------|--------|
| Automated Final UAT reconciliation (month + year DTO bundles) | **PASS** (4/4) |
| Architecture / calendar / exports / semantics suites | **PASS** (45/45 targeted) |
| Excel acceptance samples | **PASS** |
| Live DB UAT (restaurant with settlement records) | **PASS** — non-zero KPIs reconciled Dashboard VM ↔ Excel |

## Live restaurant probe (read-only)

| Field | Value |
|-------|-------|
| Restaurant ID | `720007` |
| Period | Gregorian July 2026 (`2026-06-30 21:00:00` → `2026-07-31 20:59:59` Asia/Riyadh wall) |
| Financial source mode | `settlement_record` |
| Gross Sales | `288.00` |
| Net Sales | `108.00` |
| Refund Amount | `180.00` |
| Refund Rate | `62.50` |
| Tax Collected | `37.51` |
| Payment monetary tender | `288.00` |
| Refund tender | `180.00` |
| Trend points | 4 |
| Dashboard↔Excel card values | **All matched** |

## Residual (non-blocking)

Interactive browser click-through on Production UI was not executed in this session. API + Excel path uses the same reporting DTOs as Dashboard.

## Verdict input

Eligible for Production Certification pending owner commit approval.
