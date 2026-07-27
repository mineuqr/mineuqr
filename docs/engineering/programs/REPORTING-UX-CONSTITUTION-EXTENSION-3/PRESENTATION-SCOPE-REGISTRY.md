# Presentation Scope Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 |
| **Date** | 2026-07-27 |

Legend: **E**=Executive · **O**=Operational · **F**=Financial · **D**=Diagnostic · **X**=Export · **I**=Internal

## Scope category index

| Scope | Code | Allowed locations (summary) |
|-------|------|-------------------------------|
| 1 Executive | E | Executive Dashboard / Summary / Widgets |
| 2 Operational | O | Sales Analytics / Operational reports |
| 3 Financial | F | Financial Analytics / Financial reports |
| 4 Diagnostic | D | Advanced / drill-down / investigation |
| 5 Export | X | Excel · PDF · CSV · scheduled · BI |
| 6 Internal | I | Dev / monitoring / support / platform admin |

## Master object registry (primary product reporting)

| Object id | Object type | Classification | Presentation Scope | Promotion status |
|-----------|-------------|----------------|--------------------|------------------|
| `revenue` | KPI | Class 1 Executive | E · F · X | Stage 6 (heritage) |
| `orderSales` | KPI | Class 1 Executive | E · O · X | Stage 6 |
| `orderCount` | KPI | Class 1 Executive | E · O · X | Stage 6 |
| `refundPublishedTotal` | KPI | Class 1 Executive | E · F · X | Stage 6 |
| `taxCollected` | KPI | Class 1 Executive | E · F · X | Stage 6 |
| `paymentOverview` | Widget | N/A | E · F · X | Executive companion (governed) |
| `completedOrders` | KPI | Class 2 Operational | O · X | Not Executive |
| `pendingOrders` | KPI | Class 2 Operational | O · I* | Not Executive |
| `activeOrders` | KPI | Class 2 Operational | O · I* | Not Executive |
| `kitchenLoad` | KPI | Class 2 Operational | O · I* | Not Executive |
| `activeSessions` | KPI | Class 2 Operational | O · I* | Not Executive |
| `occupiedTables` | KPI | Class 2 Operational | O · I* | Not Executive |
| `netRevenue` | KPI | Class 3 Financial | F · D · X | Not Executive |
| `paidCheckCount` | KPI | Class 3 Financial | F · D · X | Not Executive |
| `dailySales` | KPI | Class 3 Financial | F · X | Not Executive |
| `refundPublicationCount` | KPI | Class 3 Financial | F · D · X | Not Executive |
| `averageCheck` | KPI | Class 4 Diagnostic | D · X | Barred from E by default |
| `averageOrder` | KPI | Class 4 Diagnostic | D · X | Barred from E by default |
| `refundRate` | KPI | Class 4 Diagnostic | D · X | Barred from E by default |
| `complimentaryCount` | KPI | Class 4 Diagnostic | D · X | Barred from E |
| `complimentaryAmount` | KPI | Class 4 Diagnostic | D · X | Barred from E |
| `voidedCount` | KPI | Class 4 Diagnostic | D · O · X | Barred from E |
| `topSellingItems` | KPI | Class 4 Diagnostic | D · O · X | Barred from E |
| `catalogCategoryCount` | KPI | Class 4 Diagnostic | D · X | Barred from E |
| `catalogItemCount` | KPI | Class 4 Diagnostic | D · X | Barred from E |
| `menuVisits` | KPI | Class 4 Diagnostic | D · X | Barred from E |

\*Scope **I** only for platform-internal operational monitors if surfaced outside restaurant customer reporting; customer Ops dashboards use **O** only.

## Class 5 / Scope 6

Internal monitoring candidates (Projection Lag, Queue Length, etc.) → Scope **I** only. See EXTENSION-2 Internal KPI Registry.

## Maintenance

Scope changes require full KPI-10 change governance and updates to this registry + scope matrices.
