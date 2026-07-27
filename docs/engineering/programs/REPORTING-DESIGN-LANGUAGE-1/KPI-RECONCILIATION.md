# KPI Reconciliation — REPORTING-DESIGN-LANGUAGE-1

Presentation redesign only. Scope totals unchanged from PERIOD-CONSISTENCY-1.

## MONTH — July 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Gross Sales | BusinessMetricsSummary (= trend sum) | 14,612.50 ر.س | Financial (Money Collected), Sales Trends — not Executive detail sheets |
| Paid Checks | BusinessMetricsSummary | 68 | Financial (Money Collected), Sales Trends |
| Order Sales | OrderSalesRollup (sum of periods) | 19,222.00 ر.س | Executive (operational), Financial, Order Sales |
| Completed Orders | OrderSalesRollup (sum) | 89 | Executive (operational) — same population as Order Sales |
| Orders (placed) | OrderSalesRollup (sum) | 103 | Financial / Order Sales detail — not Executive snapshot |
| Tax / Complimentary / Voided | BusinessMetricsSummary | (analysis) | Financial Summary only — Tax = full period paid checks |
| Payment Method Mix | PaymentMethodAnalytics (Settlement Record payment snapshots) | 14612.50 tender total | Payment Analytics sheet — not Executive / not Gross Sales |

Scope invariant: all values describe **July 2026** only. Design language: REPORTING-DESIGN-LANGUAGE-1. Payment analytics: REPORTING-PAYMENT-METHOD-ANALYTICS-1.

## YEAR — 2026

| KPI | Source DTO | Value | Present on |
|-----|------------|-------|------------|
| Gross Sales | BusinessMetricsSummary (= trend sum) | 200,100.00 ر.س | Financial (Money Collected), Sales Trends — not Executive detail sheets |
| Paid Checks | BusinessMetricsSummary | 678 | Financial (Money Collected), Sales Trends |
| Order Sales | OrderSalesRollup (sum of periods) | 415,200.00 ر.س | Executive (operational), Financial, Order Sales |
| Completed Orders | OrderSalesRollup (sum) | 2568 | Executive (operational) — same population as Order Sales |
| Orders (placed) | OrderSalesRollup (sum) | 2688 | Financial / Order Sales detail — not Executive snapshot |
| Tax / Complimentary / Voided | BusinessMetricsSummary | (analysis) | Financial Summary only — Tax = full period paid checks |
| Payment Method Mix | PaymentMethodAnalytics (Settlement Record payment snapshots) | 200100.00 tender total | Payment Analytics sheet — not Executive / not Gross Sales |

Scope invariant: all values describe **2026** only. Design language: REPORTING-DESIGN-LANGUAGE-1. Payment analytics: REPORTING-PAYMENT-METHOD-ANALYTICS-1.
