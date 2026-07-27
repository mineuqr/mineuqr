# Sales Source Investigation Report

## Observation

A paid Table Session / completed settlement can exist while Sales Source cards showed permanent placeholders.

## Finding

Sales Source UI was a **presentation shell** with hard-coded “—” and “appears when data is available” copy. It never subscribed to a reporting query.

## Available reporting contracts (current)

`BusinessMetricsSummary` · `BusinessMetricsTrend` · `OrderSalesSummary` · `OrderSalesRollup` · `PaymentMethodAnalytics` · `OperationalMetricsSnapshot` · `CatalogStatsSummary` · `SettlementDistribution` · `KpiCatalog`

**None** expose ordering-channel / sales-source breakdown (Table · Waiter · QR · Kiosk).

## Ordering Platform note

`OrderingChannelId` exists (`qr` · `kiosk` · `mobile` · `waiter_tablet`) for ordering experience — **not projected** into Reporting DTOs.

## Hotfix action

1. Stop showing four false channel cards when no contract exists.  
2. Show one honest empty state: projection unavailable.  
3. Provide `buildSalesSourceAnalysisVm({ facts })` ready to bind when a future DTO publishes facts — **no UI math**.
