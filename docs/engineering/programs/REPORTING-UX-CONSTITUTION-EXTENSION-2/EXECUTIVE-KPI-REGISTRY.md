# Executive KPI Registry (Class 1)

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-08 Class 1 · KPI-09 · UX-04 |
| **Budget** | Max **5** Class-1 KPI cards + optional governed presentation widgets (current: 5 KPIs + Payment Overview) |
| **Date** | 2026-07-27 |

## Certified Executive KPIs

| KPI id | Business Name | Owner plane | Canonical source | Promotion stage |
|--------|---------------|-------------|------------------|-----------------|
| `revenue` | Total Sales | Settlement Platform | Settlement Record paid gen=1 | Stage 6 (current) |
| `orderSales` | Sales Orders | Order Platform | Order Read completedSales | Stage 6 (current) |
| `orderCount` | Orders | Order Platform | Order Read orderCount | Stage 6 (current) |
| `refundPublishedTotal` | Refund Amount | Settlement Platform | Settlement Record refund | Stage 6 (current) |
| `taxCollected` | Tax Collected | Settlement Platform | Settlement Record tax snapshot | Stage 6 (current) |

## Executive presentation companions (not Class 1 KPIs)

| Card id | Label | Object | Gate |
|---------|-------|--------|------|
| `paymentOverview` | Payment Overview | Widget | KPI-09 Executive protection applies |

## Rules

- New Class 1 membership requires full promotion pipeline (KPI-09).  
- Removing a Class 1 KPI is allowed for redundancy (UX-03).  
- Diagnostic / Financial / Operational KPIs MUST NOT join this registry without promotion.  
- Understanding target: **&lt; 10 seconds**.
