# Refund Analytics Adoption Report

| Field | Value |
|---|---|
| **Component** | `RefundAnalyticsSection.tsx` |
| **Data** | `getBusinessMetricsSummary` + `getPaymentMethodAnalytics` + `getBusinessMetricsTrend` |

## Included

| KPI / block | Source field |
|-------------|--------------|
| Refund Count | `refundPublicationCount` |
| Refund Amount | `refundPublishedTotal` |
| Refund Rate | `refundRate` |
| Net Sales After Refunds | `netRevenue` |
| Refund Trend | Trend points `refundPublishedTotal` |
| Refund by Payment Method | Payment analytics `refundRows` |

## Placeholders (not implemented — custody)

- Refund by Operator  
- Refund by Register  

## Not changed

- Refund publish path, budget law, Settlement Record immutability, Net formula.
