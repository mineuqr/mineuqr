# REPORTING-PAYMENT-METHOD-ANALYTICS-1 — Architecture

## Ownership

| Concern | Owner |
|---------|--------|
| Settlement write path / Payment Method catalog | Check Management (`CHECK-SETTLEMENT-METHODS-1`) |
| Settlement Transaction rows | `check_settlement_transactions` (implementation / payment-detail) |
| Settlement Record payment snapshots | Canonical financial publication (`settlement_records`) |
| Payment-method analytics | Reporting Platform (`PaymentMethodAnalyticsService`) |
| Gross Sales SSOT | KPI Registry / Business Metrics (`SUM(paid gen=1 Settlement Record grandTotal)`) |
| Terminology | Product Semantics |
| Layout | Excel / PDF / Dashboard presentation |

## Current Production data flow (canonical)

```
Settlement Record paymentSnapshot (publication)
        │
        ▼
settlementRecordReportingAdapter
        │
        ▼
PaymentMethodAnalyticsService → PaymentMethodAnalyticsDto
        │
        ├── reporting.getPaymentMethodAnalytics (tRPC)
        ├── Excel sheet: Payment Analytics
        ├── PDF section: Payment Method Analysis
        └── Dashboard: PaymentMethodAnalysisSection
```

Default financial reporting source mode: **`settlement_record`**
(`REPORTING_FINANCIAL_SOURCE`; see `financialReportingSource.ts`).

Settlement Transactions remain available for:

- legacy / emergency `check` source mode
- dual-mode parity diagnostics
- payment-detail implementation paths

They are **not** the canonical Gross Sales authority and are **not** the default Payment Analytics source in Production.

## Historical note (original program invariant)

The original program stated Payment analytics consume Settlement Transactions only.
That wording is **superseded** by SETTLEMENT-RECORD-REPORTING-ADOPTION-1 and current Production:

**Settlement Record is the canonical financial reporting source.**

## Invariants

1. **Gross Sales is never derived from settlement tenders.**
2. Payment analytics consume the **canonical financial reporting source** (Settlement Record payment snapshots by default) — not Orders or Sessions as money authority.
3. Complimentary tenders are tracked separately from monetary mix %.
4. Executive Summary does **not** invent payment-method formulas (presentation may omit tender mix).
5. New payment methods are additive string codes — no redesign required.

## Future readiness

Gateway analytics, cash drawer, shift closing, reconciliation, and branch comparison attach to the same PaymentMethodAnalyticsDto contract without changing Gross Sales ownership.
