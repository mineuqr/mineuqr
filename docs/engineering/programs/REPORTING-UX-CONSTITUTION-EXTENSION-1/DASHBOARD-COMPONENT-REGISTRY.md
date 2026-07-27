# Dashboard Component Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Constitution** | OBJ-04 |
| **Primary surface** | Restaurant `ReportsTab` |
| **Date** | 2026-07-27 |

Dashboard Cards display one KPI or one Widget. Presentation only.

## Executive Overview cards (max 6)

| Card id | Displays | Object class | Business question |
|---------|----------|--------------|-------------------|
| `revenue` | Total Sales KPI | Card → KPI | How much did the business sell? |
| `orderSales` | Sales Orders KPI | Card → KPI | How much operational order activity occurred? |
| `orderCount` | Orders KPI | Card → KPI | How many orders were placed? |
| `refundPublishedTotal` | Refund Amount KPI | Card → KPI | How much was refunded? |
| `taxCollected` | Tax Collected KPI | Card → KPI | How much tax has been collected? |
| `paymentOverview` | Payment Overview Widget | Card → Widget | How are customers paying (tender total)? |

Implementation: `RestaurantKpiCard` via `executiveSummaryPresentation.ts`.

## Sales area cards (representative)

| Card / component | Displays | Object class |
|------------------|----------|--------------|
| Today's Sales Orders card | `orderSales` | Card → KPI |
| Completed Orders period card | completed order count | Card → KPI / related metric |
| Period detail rows | `orderSales` + counts | Widget (list), not Exec card |

## Financial area (representative)

| Component | Displays | Object class |
|-----------|----------|--------------|
| Settlement overview cards | Financial KPIs | Cards → KPIs |
| Refund Analytics section | Refund KPIs / detail | Analytics + Widgets |
| Payment Method Analysis | Tender mix | Analytics + Widgets |
| Advanced Financial cards | Net Sales, averages, rates | Cards → KPIs (secondary) |

## Export surfaces (not cards — same semantics)

| Surface | Binding |
|---------|---------|
| Excel Executive sheet | Same Exec KPI set + Payment Overview tender total |
| Excel Financial / Payment / Sales sheets | Analytics-aligned KPI semantics |
| PDF | Same Business Names and definitions |

## Rules

- Cards MUST NOT define formulas or ownership.  
- Card label MUST use approved Business Name (`preferredKpiLabel` / Product Semantics).  
- Adding an Executive card beyond the six-card budget requires UX-04 review.
