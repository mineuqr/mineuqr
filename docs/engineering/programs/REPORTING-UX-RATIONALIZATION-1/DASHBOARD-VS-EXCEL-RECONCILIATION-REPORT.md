# Dashboard vs Excel Reconciliation Report

## Method

Identical `RestaurantReportingExportBundle` (reporting.* DTOs) feeds:

1. `buildExecutiveSummaryViewModel` (Dashboard Exec V2 presentation)
2. `buildReportingExportWorkbook` (Excel)

Money compared with shared `formatMoneyDisplay` (formatting-only differences allowed).

## Automated

| Scope | Gross / Net / Refund Amount / Rate / Tax / Payment totals / Labels | Result |
|-------|---------------------------------------------------------------------|--------|
| Month fixture | Exact formatted values ⊆ Excel blob | **PASS** |
| Year fixture | Exact formatted values ⊆ Excel blob | **PASS** |

## Live (`restaurantId=720007`, July 2026 Gregorian)

| Check | Dashboard (DTO → VM) | Excel blob | Match |
|-------|----------------------|------------|-------|
| Gross Sales | 288.00 | formatted present | **Yes** |
| Net Sales | 108.00 | formatted present | **Yes** |
| Refund Amount | 180.00 | formatted present | **Yes** |
| Refund Rate | 62.50% | 62.50 present | **Yes** |
| Tax | 37.51 | formatted present | **Yes** |
| Payment monetary tender | 288.00 | formatted present | **Yes** |
| Payment refund tender | 180.00 | formatted present | **Yes** |
| Sheet titles | — | Payment Analytics, Sales Trends, Executive, Financial | **Yes** |
| Terminology | Gross Sales / Net Sales / Refund Amount | Present | **Yes** |

**No tolerance applied beyond display formatting.**
