# REPORTING-SALES-CHANNEL-ANALYTICS-1 — API Specification

## Procedure

`reporting.getSalesChannelAnalytics`

## Auth

`verifiedProcedure` + `assertRestaurantAccess(..., "reporting.getSalesChannelAnalytics")`

## Input

Same period input as other reporting queries:

| Field | Type |
|-------|------|
| restaurantId | positive int |
| from | optional string |
| to | optional string |

## Output

`SalesChannelAnalyticsDto`

## Compatibility

- Additive endpoint — does not change existing reporting procedures
- Does not alter `getBusinessMetricsSummary` or `getPaymentMethodAnalytics`

## Façade

Exported via:

- `SalesChannelAnalyticsService.getSalesChannelAnalytics`
- `ReportingService` re-export
- `server/reporting-platform` package index
- `reportingRouter`
