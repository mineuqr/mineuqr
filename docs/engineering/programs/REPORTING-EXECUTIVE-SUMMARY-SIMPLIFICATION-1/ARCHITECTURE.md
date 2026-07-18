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
