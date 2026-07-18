# REPORTING-EXECUTIVE-SUMMARY-UX-1 — Architecture

## Scope

Presentation UX only for Executive Summary (Excel + PDF).

## Immutable dependencies

RATIONALIZATION-1 KPI set · Product Semantics labels · Reporting Platform values · Check Revenue = paid Check grandTotal.

## Presentation ownership

| Concern | Module |
|---------|--------|
| Grouping, captions, primary question | `executiveSummaryPresentation.ts` |
| KPI display names | `preferredKpiLabel` (Product Semantics) |
| Layout rendering | Excel / PDF builders |

## Forbidden

Changing KPI ids, formulas, APIs, DTOs, Product Semantics registry ownership, or Check Management.
