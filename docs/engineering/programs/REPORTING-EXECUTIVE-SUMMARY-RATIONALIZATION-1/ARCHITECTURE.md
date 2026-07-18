# REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 — Architecture

## Ownership

| Concern | Owner |
|---------|--------|
| KPI values / formulas | Reporting Platform |
| KPI metadata | KPI Registry |
| Labels | Product Semantics |
| Executive card selection + layout | Export presentation (`executiveSummaryPresentation`) |

## Invariant

Executive Summary answers: **How is the business performing?**  
It must not surface tax policy, adjustments, or reporting-basis jargon as primary cards.

## Consistency

Excel and PDF call the same `buildExecutiveSummaryCards` helper.
