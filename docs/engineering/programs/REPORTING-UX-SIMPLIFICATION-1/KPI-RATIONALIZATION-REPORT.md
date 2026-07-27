# KPI Rationalization Report

## Executive Overview (max 6)

| # | Card | Source |
|---|------|--------|
| 1 | Total Sales | `business.revenue` |
| 2 | Sales Orders | `orderPeriod.orderSales` |
| 3 | Orders | `orderPeriod.orderCount` |
| 4 | Refund Amount | `business.refundPublishedTotal` |
| 5 | Tax Collected | `business.taxCollected` |
| 6 | Payment Overview | `paymentMethodAnalytics.monetaryTenderTotal` |

## Moved to Financial Analytics (secondary)

| KPI | Why |
|-----|-----|
| Average Order | Rarely needed for 10-second health check |
| Average Check | Same |
| Refund Rate | Derived; amount is primary |
| Net Sales | Available under Financial Tax/secondary strip |
| Complimentary Rate | Advanced Financial (existing overview) |

Formulas / KPI ids unchanged.
