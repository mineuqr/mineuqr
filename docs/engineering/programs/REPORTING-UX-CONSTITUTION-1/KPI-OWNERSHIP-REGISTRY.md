# KPI Ownership Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Constitution** | KPI-01, KPI-06 |
| **Code SSOT** | `shared/reporting-platform/kpiDictionary.ts` |
| **Date** | 2026-07-27 |

## Dual-layer ownership model

| Layer | Meaning | Example (Total Sales) |
|-------|---------|------------------------|
| **Financial plane** | Product / platform custody of financial truth | Settlement Platform / Settlement Record publications |
| **Write owner** | Domain that publishes immutable records | Check Management (`ownerDomain: check`) |
| **Derivation owner** | Reporting Platform when KPI is derived only | Net Sales, Refund Rate |
| **Operational owner** | Order Read projection for operational KPIs | Sales Orders, Orders |

KPI Dictionary `owner` / `ownerDomain` remain the **technical write / derivation owners**. Constitution “Settlement Platform” names the **financial plane**, not a separate write domain.

## Primary registry

| Business Name | KPI id | Plane | Write / derivation owner | ownerDomain | Migration rule |
|---------------|--------|-------|--------------------------|-------------|----------------|
| Total Sales | `revenue` | Settlement / Financial | Check Management | `check` | KPI-06 ADR required |
| Sales Orders | `orderSales` | Order Platform | Order Read | `order_read` | KPI-06 ADR required |
| Orders | `orderCount` | Order Platform | Order Read | `order_read` | KPI-06 ADR required |
| Refund Amount | `refundPublishedTotal` | Settlement / Refund | Check Management | `check` | KPI-06 ADR required |
| Tax Collected | `taxCollected` | Settlement / Financial | Check Management | `check` | KPI-06 ADR required |
| Paid Checks | `paidCheckCount` | Settlement / Financial | Check Management | `check` | KPI-06 ADR required |
| Net Sales | `netRevenue` | Reporting (derived) | Reporting Platform | `reporting_platform` | KPI-06 ADR required |
| Refund Rate | `refundRate` | Reporting (derived) | Reporting Platform | `reporting_platform` | KPI-06 ADR required |
| Average Check | `averageCheck` | Reporting (derived) | Reporting Platform | `reporting_platform` | KPI-06 ADR required |
| Payment Overview | `paymentOverview` *(card)* | Settlement payment publication | Payment Method Analytics ← Settlement Record payment snapshots | N/A (presentation) | KPI-06 if elevated to registry KPI |

## Non-owners (hard prohibition)

| Actor | MUST NOT own |
|-------|--------------|
| Reporting Platform | Total Sales, Refund Amount, Tax Collected, Sales Orders (truth) |
| Order Domain live totals | Total Sales |
| Live Business Settings | Tax Collected |
| Session / ops settlement APIs | Total Sales / financial KPIs |

## Integrity

Ownership changes without ADR + Architecture Review + Impact Assessment + Regression + Production Approval = **Architecture Violation**.
