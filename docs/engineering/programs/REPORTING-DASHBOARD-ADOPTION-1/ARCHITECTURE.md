# REPORTING-DASHBOARD-ADOPTION-1 — Architecture

**Classification:** Reporting Platform Adoption  
**Status:** Approved for implementation → PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Depends on:** REPORTING-PLATFORM-ARCHITECTURE-1 (PRODUCTION CERTIFIED)  
**Does not redesign:** Order Domain, Operational Session, Check Management, Reporting Platform, Order Read, Runtime, Business Identity  

---

## 1. Objective

Adopt the Reporting Platform throughout the Dashboard.

- Dashboard stops calculating KPIs locally.
- Dashboard becomes a **presentation consumer only**.
- All KPI cards, charts, and report tables consume `reporting.*` DTOs.

---

## 2. Target topology

```
Dashboard (Presentation)
    ↓ tRPC reporting.*
Reporting Platform
    ↓ DTOs
Layout · Formatting · Visualization
```

**Forbidden (for KPI authority):**

```
Dashboard → ops.getSettlement* → Session settlement aggregation
Dashboard → order.list → client SUM / averages
Dashboard → live Business Settings (tax / currency)
```

---

## 3. Revenue law (unchanged)

```
Revenue = SUM(Paid Check Grand Total)
```

Dashboard must never derive Revenue from Orders, Served Orders, or Session totals.

Currency and tax context come from Reporting DTOs (Check snapshots), never from live Business Settings.

---

## 4. KPI → contract map

| Presentation surface | Reporting contract |
|----------------------|--------------------|
| Revenue / Paid Checks / Average Check / Complimentary | `getBusinessMetricsSummary` |
| Revenue trends / charts | `getBusinessMetricsTrend` |
| Active sessions / occupied tables / kitchen load | `getOperationalMetricsSnapshot` |
| Today / month order sales cards | `getOrderSalesSummary` |
| Monthly / yearly report rows + Excel | `getOrderSalesRollup` |
| Categories / items / menu visits | `getCatalogStatsSummary` |

---

## 5. Presentation responsibilities

Dashboard may:

- Layout sections and cards
- Format money / dates / labels
- Map DTO fields into chart series for visualization
- Export already-computed rollup rows to Excel

Dashboard must not:

- Aggregate business KPIs from `order.list`
- Call `ops.getSettlement*` for KPI cards or charts
- Recompute averages / Revenue / tax from raw domain rows
- Read live tax or currency settings for KPI display

---

## 6. Non-goals

- No Reporting Platform redesign
- No Order / Check / Session / Runtime / Business Identity changes
- No database migrations
- Legacy `ops.getSettlement*` may remain mounted for other transitional clients; Dashboard KPI paths must not use it
