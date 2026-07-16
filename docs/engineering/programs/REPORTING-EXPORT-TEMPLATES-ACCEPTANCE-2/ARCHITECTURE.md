# REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 — Architecture

**Classification:** Executive Financial Report Redesign  
**Scope:** Presentation layer only (`client/src/lib/reporting-exports/**`, ReportsTab export wiring)

## Non-goals

Does **not** modify Reporting Platform, DTOs, Order/Check domains, Runtime, Business Settings, API contracts, or calculations.

## Workbook composition

Exactly five worksheets:

1. Cover  
2. Executive Summary  
3. Financial Summary  
4. Order Sales  
5. Revenue Trends  

Operational Summary and Catalog are **not generated**.

## Period presentation

| Scope | Label | Trend grain | Axis labels |
|-------|-------|-------------|-------------|
| Month | `July 2026` / `يوليو 2026` | Daily | `1 Jul` … |
| Year | `2026` | Monthly | `Jan` … `Dec` |

Trend charts require ≥ 2 observations; otherwise a professional insufficient-data message is shown.

## Visual system

Navy / gold / slate executive palette. Western digits as Excel text (`@`). Arabic PDF via Cairo + reshape/bidi.
