# Pipeline Trace Report

```
Restaurant Session
  → Order (OrderingChannelId may exist on ordering path)
  → Check Settlement
  → Settlement Record publication
  → Reporting projections
       ✓ BusinessMetricsSummary (Total Sales, Tax, Refund, Net, …)
       ✓ PaymentMethodAnalytics (tender mix)
       ✓ OrderSalesSummary / Rollup (order counts / Sales Orders)
       ✗ Sales-by-channel / Sales Source DTO   ← BREAK
  → Presentation SalesSourceAnalysisSection
       previously: always "—"
       hotfix: honest “projection unavailable” when facts=null
```

## Break point

**No Reporting contract field** for Table Sessions / Waiter / QR / Kiosk sales totals.

Paid Table Session activity correctly contributes to Total Sales — but **not** to a channel slice that the UI can display.
