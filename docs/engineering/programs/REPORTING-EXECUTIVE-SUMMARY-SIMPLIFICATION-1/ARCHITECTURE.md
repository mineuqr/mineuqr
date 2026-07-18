# REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — Architecture

## Scope

Presentation selection for Executive Summary (Excel + PDF).

## Executive vs Financial

| Surface | Owns |
|---------|------|
| Executive Summary | Operational: Order Sales, Orders, Average Order |
| Financial Summary | Money Collected (Check Revenue, Paid Checks, Average Check), Tax (full period), Adjustments, basis |
| Payment Method Analysis | Settlement tender mix |

## Immutable

Check Revenue = `SUM(paid Check.grandTotal)` · KPI Registry · Reporting APIs/DTOs · Product Semantics ownership of labels.

## Period-agnostic governance

Executive Summary presentation and Tax Collected helper text are identical for every reporting period (daily, weekly, monthly, quarterly, yearly, future).

- Use “reporting period” / “this period” — never month / week / year / quarter / day in helper copy.
- No `scope === …` branching in Executive view model or Financial tax note rendering.
- Cover/trend axis labels may still describe the selected period; that is chrome, not Executive KPI presentation.
