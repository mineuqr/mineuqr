# Visual Hierarchy Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-VISUAL-HIERARCHY-1 |
| **Date** | 2026-07-27 |

## Tiers

| Tier | Role | Eye priority | Examples |
|------|------|--------------|----------|
| **Primary** | Immediate decision number | First | Total Sales |
| **Secondary** | Next decision questions | Second | Orders, Sales Orders, Refund Amount |
| **Supporting** | Context / collection | Third | Tax Collected, Payment Overview, averages, rates |

## Rules

1. Primary must dominate size, contrast, and placement.  
2. Supporting must not compete with Primary (lighter border, smaller type).  
3. Whitespace between decision bands > gap inside a band.  
4. Charts are supporting — never larger visual weight than primary KPIs.  

## Code mirror

`EXECUTIVE_CARD_VISUAL_TIER` in `productSemantics.ts` + `RestaurantKpiCard.emphasis`.
