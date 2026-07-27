# KPI Lifecycle Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Constitution** | KPI-07 |
| **Code SSOT** | `shared/reporting-platform/kpiDictionary.ts` |
| **Date** | 2026-07-27 |

Primary Executive + secondary Financial KPIs. Lifecycle changes require ADR (KPI-06 / KPI-07 change governance).

## Financial plane

### Total Sales (`revenue`)

| Stage | Value |
|-------|-------|
| Producer | Check Management (Check Aggregate freeze / settlement publication) |
| Canonical Source | Settlement Record (`settlement_records` paid gen=1 grandTotal) |
| Architectural Owner (plane) | Settlement Platform |
| Write owner | Check Management (`ownerDomain: check`) |
| Projection | Settlement Record publications (immutable) |
| Reporting Service | `getBusinessMetricsSummary` → `BusinessMetricsSummary.revenue` |
| Presentation | Executive Overview card; Financial Overview |
| Export | Excel Executive / Financial; PDF |
| Consumers | Restaurant Dashboard, Excel, PDF, reporting APIs |

### Refund Amount (`refundPublishedTotal`)

| Stage | Value |
|-------|-------|
| Producer | Check Management (compensating refund publication) |
| Canonical Source | Settlement Record `recordKind=refund` |
| Architectural Owner (plane) | Settlement Platform / Refund publication path |
| Write owner | Check Management |
| Projection | Settlement Record refund publications |
| Reporting Service | `getBusinessMetricsSummary` → `refundPublishedTotal` |
| Presentation | Executive Overview; Refund Analytics |
| Export | Excel / PDF financial & refund surfaces |
| Consumers | Dashboard, Excel, PDF, APIs |

### Tax Collected (`taxCollected`)

| Stage | Value |
|-------|-------|
| Producer | Check Management (tax snapshot on settlement) |
| Canonical Source | Settlement Record published `taxAmount` |
| Architectural Owner (plane) | Settlement Platform |
| Write owner | Check Management |
| Projection | Settlement Record tax snapshot |
| Reporting Service | `getBusinessMetricsSummary` → `taxCollected` |
| Presentation | Executive Overview; Tax analysis |
| Export | Excel / PDF |
| Consumers | Dashboard, Excel, PDF, APIs |

### Net Sales (`netRevenue`) — derived

| Stage | Value |
|-------|-------|
| Producer | N/A (derived) — depends on Total Sales + Refund Amount producers |
| Canonical Source | Derived from Settlement Record publications via summary |
| Architectural Owner | Reporting Platform (`reporting_platform`) |
| Projection | None beyond parent KPIs |
| Reporting Service | `BusinessMetricsSummary.netRevenue` |
| Presentation | Financial Analytics (secondary — not Executive primary) |
| Export | Excel / PDF financial |
| Consumers | Dashboard Financial, Excel, PDF |

### Refund Rate (`refundRate`) — derived

| Stage | Value |
|-------|-------|
| Producer | N/A (derived) |
| Canonical Source | Derived: Refund Amount / Total Sales |
| Architectural Owner | Reporting Platform |
| Reporting Service | `BusinessMetricsSummary.refundRate` |
| Presentation | Financial Analytics (secondary) |
| Export | Excel / PDF |
| Consumers | Dashboard Financial, Excel, PDF |

## Operational plane

### Sales Orders (`orderSales`)

| Stage | Value |
|-------|-------|
| Producer | Order Platform (order lifecycle / serve completion) |
| Canonical Source | Order Read Analytics Projection (`order_read_analytics_daily.completedSales`) |
| Architectural Owner | Order Platform |
| Write / projection owner | Order Read (`ownerDomain: order_read`) |
| Reporting Service | `getOrderSalesSummary` / `getOrderSalesRollup` |
| Presentation | Executive Overview; Sales Analytics |
| Export | Excel Sales Orders / rollup sheets; PDF |
| Consumers | Dashboard, Excel, PDF, APIs |

### Orders (`orderCount`)

| Stage | Value |
|-------|-------|
| Producer | Order Platform |
| Canonical Source | `order_read_analytics_daily.orderCount` |
| Architectural Owner | Order Platform |
| Projection | Order Read Analytics |
| Reporting Service | Order Sales summary / rollup |
| Presentation | Executive Overview; Sales Analytics |
| Export | Excel / PDF |
| Consumers | Dashboard, Excel, PDF, APIs |

## Presentation composite (not a KPI)

### Payment Overview (`paymentOverview` card)

| Stage | Value |
|-------|-------|
| Object class | Widget / Dashboard Card (OBJ-02 / OBJ-04) — **not** OBJ-01 KPI |
| Producer | Check Management → payment snapshots on Settlement Record |
| Canonical Source | Settlement Record payment snapshots |
| Architectural Owner (plane) | Settlement Platform |
| Reporting Service | `getPaymentMethodAnalytics` → monetary tender total |
| Presentation | Executive Overview Payment Overview card |
| Export | Excel Executive (tender total); Payment Analytics sheet |
| Elevation path | Dictionary + ADR if promoted to `KpiId` |

## Registry maintenance

New KPIs MUST add a lifecycle row here **before** Production Certification.
