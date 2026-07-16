# REPORTING-EXPORTS-1 — Architecture

**Classification:** Reporting Platform Adoption  
**Status:** Approved for implementation → PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Depends on:** REPORTING-PLATFORM-ARCHITECTURE-1, REPORTING-DASHBOARD-ADOPTION-1  
**Does not redesign:** Order Domain, Operational Session, Check Management, Reporting Platform, Runtime, Order Read, Business Settings, Business Identity  

---

## 1. Objective

Adopt the Enterprise Reporting Platform across every restaurant reporting export.

Excel and PDF become **Presentation Renderers only**.

No KPI calculations remain inside export generation.

---

## 2. Target topology

```
Reporting Platform (reporting.*)
        ↓ DTOs
RestaurantReportingExportBundle
        ↓
   Excel Renderer · PDF Renderer
        ↓
   formatting / layout / styling only
```

**Forbidden:**

```
Export → order.list → local SUM / averages
Export → ops.getSettlement*
Export → live Business Settings for tax / currency
Export → invent Revenue from Orders / Sessions
```

---

## 3. Export sections → contracts

| Section | Contract |
|---------|----------|
| Executive Summary | `BusinessMetricsSummary` + `OrderSalesSummary` + `OperationalMetricsSnapshot` |
| Financial Summary | `BusinessMetricsSummary` (+ `sampleTaxPolicySnapshot` for pricing mode) |
| Operational Summary | `OperationalMetricsSnapshot` |
| Catalog Summary | `CatalogStatsSummary` |
| Daily / Monthly / Yearly Order Sales | `OrderSalesRollup` |
| Revenue trend rollup | `BusinessMetricsTrend` |

Currency and pricing mode come from Check snapshots embedded in Business Metrics DTOs.

---

## 4. Consistency law

Dashboard, Excel, and PDF display identical KPI values because they render the same `reporting.*` DTO fields.

Renderers may format strings / layout sheets. They must not aggregate or redefine KPIs.

---

## 5. Platform gaps (documented)

| Desired field | Status |
|---------------|--------|
| Top selling items / quantities / item sales | **Not on current Reporting contracts** — Catalog sheet notes unavailability; no `order.list` fallback |
| Voided amount | Only `voidedCount` exists — exports show count |

---

## 6. Non-goals

- No Reporting Platform redesign  
- No Check / Order / Runtime / Business Settings changes  
- No database migrations  
