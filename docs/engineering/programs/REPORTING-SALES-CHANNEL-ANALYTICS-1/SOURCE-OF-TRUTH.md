# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Source of Truth Report

| Question | Answer |
|----------|--------|
| What is the channel identity SSOT? | `OrderingChannelId` stamped on the order at place (`orders.ordering_channel`) |
| What is the analytics read SSOT? | Served rows in `order_read_orders` for the restaurant + period |
| What is NOT a channel source? | UI labels, payment methods, sessions alone, Check payment snapshots |
| What is Total Sales SSOT? | Unchanged — Business Metrics / Settlement Record Check Revenue |
| What is Payment mix SSOT? | Unchanged — PaymentMethodAnalytics from Settlement Record |
| Legacy history? | Pre-stamp rows resolve via `identityScope` (TABLE→table, WAITER→waiter, KIOSK→kiosk). QR vs table ambiguity for unstamped TABLE-scope history is documented as observation |
| Future channels? | Unknown `ordering_channel` values pass through as reporting channel ids without UI redesign |

## Reconciliation statement

`sum(bucket.salesAmount) === SalesChannelAnalyticsDto.totalSalesAmount`  
`sum(bucket.orderCount) === SalesChannelAnalyticsDto.totalOrderCount`  

These totals are **Order Sales by channel**, not a second publication of Check Revenue.
