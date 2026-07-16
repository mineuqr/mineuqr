# KPI Reconciliation — REPORTING-PERIOD-CONSISTENCY-1

Proof that Executive, Financial, Order Sales, and Revenue Trends share one scope.

## MONTH — July 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Revenue | BusinessMetricsSummary (= trend sum) | 14,612.50 ر.س | Executive, Financial, Revenue Trends total |
| Paid Checks | BusinessMetricsSummary | 68 | Executive, Financial, Revenue Trends total |
| Order Sales | OrderSalesRollup (sum of periods) | 19,222.00 ر.س | Executive, Financial, Order Sales total |
| Orders | OrderSalesRollup (sum) | 103 | Executive, Financial, Order Sales total |
| Completed Orders | OrderSalesRollup (sum) | 89 | Financial, Order Sales total |

Scope invariant: all values describe **July 2026** only. OrderSalesSummary.month is not used.

## YEAR — 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Revenue | BusinessMetricsSummary (= trend sum) | 200,100.00 ر.س | Executive, Financial, Revenue Trends total |
| Paid Checks | BusinessMetricsSummary | 678 | Executive, Financial, Revenue Trends total |
| Order Sales | OrderSalesRollup (sum of periods) | 415,200.00 ر.س | Executive, Financial, Order Sales total |
| Orders | OrderSalesRollup (sum) | 2688 | Executive, Financial, Order Sales total |
| Completed Orders | OrderSalesRollup (sum) | 2568 | Financial, Order Sales total |

Scope invariant: all values describe **2026** only. OrderSalesSummary.month is not used.
