# Translation Verification Report

| KPI / Section | EN | AR | Source |
|---------------|----|----|--------|
| Total Sales | Total Sales | إجمالي المبيعات | `PREFERRED_KPI_LABELS.revenue` |
| Sales Orders | Sales Orders | مبيعات الطلبات | `PREFERRED_KPI_LABELS.orderSales` |
| Daily Total Sales | Daily Total Sales | إجمالي المبيعات اليومية | `PREFERRED_KPI_LABELS.dailySales` |
| Net Sales | Net Sales | صافي المبيعات | unchanged |
| Refund Amount | Refund Amount | مبلغ المرتجعات | unchanged |
| Financial Performance | Financial Performance | الأداء المالي | `SECTION_TERMINOLOGY` |
| Sales Trends | Sales Trends | اتجاهات المبيعات | unchanged |
| Payment Analytics | Payment Analytics | تحليل المدفوعات | unchanged |

## Verification

- Guards assert EN+AR preferred labels.
- Acceptance Excel sample regenerated with new EN worksheet name **Sales Orders**.
- No remaining Dashboard EN strings: Check Revenue / Gross Sales / Check Sales / Session Sales / bare “Order Sales” as primary title.

**Status:** PASS
