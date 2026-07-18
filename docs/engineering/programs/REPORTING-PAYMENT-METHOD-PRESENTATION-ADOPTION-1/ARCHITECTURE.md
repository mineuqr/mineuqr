# REPORTING-PAYMENT-METHOD-PRESENTATION-ADOPTION-1 — Architecture

## Scope

Presentation adoption only. Analytics / Settlement / Revenue unchanged.

## Shared view model

`buildPaymentMethodAnalysisViewModel` is the single presentation adapter:

- Input: `PaymentMethodAnalyticsDto` + language
- Output: full monetary catalog rows + complimentary + empty/load copy
- Labels: Product Semantics
- Catalog order: `MONETARY_PAYMENT_METHODS` (+ unknown DTO codes appended)

## Period-agnostic

No `scope` branching. Empty/note copy uses “reporting period,” never month/week/year/day/quarter.

## Surfaces

| Surface | Consumer |
|---------|----------|
| Dashboard | `PaymentMethodAnalysisSection` |
| Excel | `buildPaymentMethodSheet` |
| PDF | payment section in `buildReportingExportPdf` |
