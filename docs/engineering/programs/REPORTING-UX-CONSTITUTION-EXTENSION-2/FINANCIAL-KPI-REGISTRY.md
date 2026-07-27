# Financial KPI Registry (Class 3)

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-08 Class 3 · UX-05 |
| **Date** | 2026-07-27 |

Class 3 KPIs belong primarily in **Financial Analytics**.

| KPI id | Business Name | Owner | Canonical source (summary) | Default placement |
|--------|---------------|-------|----------------------------|-------------------|
| `netRevenue` | Net Sales | Reporting Platform (derived) | Total Sales − Refund Amount | Financial Analytics |
| `paidCheckCount` | Paid Checks | Check Management | Settlement / paid checks | Financial / Advanced |
| `dailySales` | Daily Total Sales | Check Management | Settlement Record day buckets | Financial / trends |
| `refundPublicationCount` | Refund Count | Check Management | Settlement Record refund count | Financial / Refund Analytics |

## Class 1 KPIs visible in Financial Analytics (not reclassified)

| KPI id | Business Name | Note |
|--------|---------------|------|
| `revenue` | Total Sales | Class **1**; Financial Analytics may deepen the same KPI |
| `refundPublishedTotal` | Refund Amount | Class **1**; also in Refund Analytics (progressive disclosure) |
| `taxCollected` | Tax Collected | Class **1**; also in Tax analysis |

## Payment distribution

Payment mix / monetary tender totals are **Analytics + Widgets** (Payment Analytics), not a single Class 3 `KpiId` named “Payment Distribution.” Governed under OBJ-02/03 and Settlement payment publication path.
