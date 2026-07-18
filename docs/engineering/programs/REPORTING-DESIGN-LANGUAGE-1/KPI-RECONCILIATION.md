# KPI Reconciliation — REPORTING-DESIGN-LANGUAGE-1

Presentation redesign only. Scope totals unchanged from PERIOD-CONSISTENCY-1.

## MONTH — July 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Check Revenue | BusinessMetricsSummary (= trend sum) | 14,612.50 ر.س | Executive (At a Glance), Financial, Check Revenue Trends |
| Paid Checks | BusinessMetricsSummary | 68 | Executive (At a Glance), Financial, Check Revenue Trends |
| Order Sales | OrderSalesRollup (sum of periods) | 19,222.00 ر.س | Executive (At a Glance), Financial, Order Sales |
| Orders | OrderSalesRollup (sum) | 103 | Executive (At a Glance), Financial, Order Sales |
| Tax / Complimentary / Voided | BusinessMetricsSummary | (analysis) | Financial Summary only — not Executive |
| Payment Method Mix | PaymentMethodAnalytics (Settlement Transactions) | 14612.50 tender total | Payment Method Analysis sheet — not Executive / not Check Revenue |

Scope invariant: all values describe **July 2026** only. Design language: REPORTING-DESIGN-LANGUAGE-1. Payment analytics: REPORTING-PAYMENT-METHOD-ANALYTICS-1.

## YEAR — 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Check Revenue | BusinessMetricsSummary (= trend sum) | 200,100.00 ر.س | Executive (At a Glance), Financial, Check Revenue Trends |
| Paid Checks | BusinessMetricsSummary | 678 | Executive (At a Glance), Financial, Check Revenue Trends |
| Order Sales | OrderSalesRollup (sum of periods) | 415,200.00 ر.س | Executive (At a Glance), Financial, Order Sales |
| Orders | OrderSalesRollup (sum) | 2688 | Executive (At a Glance), Financial, Order Sales |
| Tax / Complimentary / Voided | BusinessMetricsSummary | (analysis) | Financial Summary only — not Executive |
| Payment Method Mix | PaymentMethodAnalytics (Settlement Transactions) | 200100.00 tender total | Payment Method Analysis sheet — not Executive / not Check Revenue |

Scope invariant: all values describe **2026** only. Design language: REPORTING-DESIGN-LANGUAGE-1. Payment analytics: REPORTING-PAYMENT-METHOD-ANALYTICS-1.
