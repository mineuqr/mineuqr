# REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1 — Architecture

## Invariant

Adjacent Order Sales presentation must use **one business population**: completed (served) orders.

| KPI | Population | Dashboard Order Sales section | Executive Summary |
|-----|------------|-------------------------------|-------------------|
| Order Sales | Completed / served | Yes | Yes |
| Completed Orders | Completed / served | Yes (count cards) | Yes |
| Average Order | Completed / served | n/a (export) | Yes |
| Orders (`orderCount`) | All placed | **Not** next to Order Sales | **Not** on Executive |

## Ownership

| Concern | Owner |
|---------|--------|
| Formulas / DTO values | Reporting Platform (unchanged) |
| Labels | Product Semantics (`preferredKpiLabel`) |
| Which KPI sits next to Order Sales | This program (presentation selection) |

## Non-goals

No materializer, Business Day, Revenue, Tax, Settlement, Check, or API calculation changes.
