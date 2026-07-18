# REPORTING-PAYMENT-METHOD-ANALYTICS-1 — Architecture

## Ownership

| Concern | Owner |
|---------|--------|
| Settlement write path / Payment Method catalog | Check Management (`CHECK-SETTLEMENT-METHODS-1`) |
| Settlement Transaction rows | `check_settlement_transactions` |
| Payment-method analytics | Reporting Platform (`PaymentMethodAnalyticsService`) |
| Check Revenue SSOT | KPI Registry / Business Metrics (`SUM(paid Check.grandTotal)`) |
| Terminology | Product Semantics |
| Layout | Excel / PDF / Dashboard presentation |

## Data flow

```
SettlementTransaction (captured)
        │
        ▼
settlementTransactionReportingAdapter
        │
        ▼
PaymentMethodAnalyticsService → PaymentMethodAnalyticsDto
        │
        ├── reporting.getPaymentMethodAnalytics (tRPC)
        ├── Excel sheet: Payment Method Analysis
        ├── PDF section: Payment Method Analysis
        └── Dashboard: PaymentMethodAnalysisSection
```

## Invariants

1. **Check Revenue is never derived from settlement tenders.**
2. Payment analytics consume **Settlement Transactions only** (not Orders, Sessions, or Checks).
3. Complimentary tenders are tracked separately from monetary mix %.
4. Executive Summary does **not** include payment-method metrics.
5. New payment methods are additive string codes — no redesign required.

## Future readiness

Gateway analytics, cash drawer, shift closing, reconciliation, and branch comparison can attach to the same Settlement Transaction read path and `PaymentMethodAnalyticsDto` buckets without changing Check Revenue.
