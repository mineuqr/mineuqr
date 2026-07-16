# REPORTING-PLATFORM-ARCHITECTURE-1 — Architecture

**Classification:** Enterprise Reporting Platform Foundation  
**Status:** Implemented — PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Supersedes (for KPI authority):** Pre-platform client `buildOrderStatistics` / Session-money “Settled Revenue” as SSOT  
**Does not redesign:** Order Domain, Operational Session, Check Management, Operational Runtime, Order Read write model, Business Identity  

---

## 1. Objective

Establish the official **Reporting Platform** as the **only** authority for business KPI contracts consumed by:

- Dashboard  
- Reports  
- PDF / Excel  
- Mobile  
- Future AI services  

Presentation calculates nothing. Presentation renders Reporting DTOs.

---

## 2. Platform boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation (Dashboard / Reports / PDF / Mobile / AI)      │
│   → consumes Reporting DTOs only                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ tRPC reporting.*
┌───────────────────────────▼─────────────────────────────────┐
│ Reporting Platform                                          │
│   KPI Dictionary · Contracts · Services · Aggregators       │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │                   │                   │
   Check Domain        Order Read          Operational Session
   (paid Checks)       (P-10 / P-06)       (overview metrics)
        │                   │                   │
   Snapshots ONLY      Projection facts    Occupancy / active
   (never live tax)                        (not revenue)
```

---

## 3. Responsibilities

| Responsibility | Owner |
|----------------|--------|
| KPI ownership registry | Reporting Platform (`KPI_DICTIONARY`) |
| Business metric contracts | Reporting Platform |
| Operational metric contracts | Reporting Platform |
| Revenue calculation | Reporting Platform over **Check** facts |
| Order Sales calculation | Reporting Platform over **Order Read P-10** |
| Check write / settle | Check Management (unchanged) |
| Order fulfilment | Order Domain (unchanged) |
| Live tax configuration | Business Settings (never used by Reports) |

---

## 4. Revenue law

```
Revenue = SUM(operational_checks.grandTotal WHERE outcome = 'paid')
```

**Not** served Orders. **Not** closed Sessions. **Not** Order Domain totals.

Tax / currency for reporting come from **Check Currency Snapshot** and **Tax Policy Snapshot**.

---

## 5. Analytics Projection decision

### Decision: **No new dedicated Analytics Projection for this foundation.**

| Concern | Approach |
|---------|----------|
| Order Sales / averages / rollups | Existing Order Read **P-10** (`order_read_analytics_daily`) |
| Kitchen / active order counters | Existing Order Read **P-06** |
| Revenue / complimentary / voided / average check / tax collected | Direct read of `operational_checks` via Reporting Platform repository |
| Future scale | **Optional** Check daily rollup projection (P-Check-analytics) when Check volume requires pre-aggregation |

### Why not a parallel Analytics Platform

- ADR-ARCH-009 already assigned order analytics to Order Read.  
- Check is the monetary document — Reporting reads it; inventing a second money projection now would duplicate Check.  
- Services + existing projections are sufficient for foundation certification.  

### Implementation proposal (future, optional)

When Paid Check volume makes range scans expensive:

1. Add `check_analytics_daily` projection updated on Check terminalize.  
2. Bind Reporting `BusinessMetrics*` to that projection.  
3. Keep the same DTOs — consumers unchanged.

---

## 6. Metric classes

| Class | Examples | Contract |
|-------|----------|----------|
| Business | Revenue, Average Check, Complimentary, Voided, Tax Collected | `BusinessMetricsSummary` / `Trend` |
| Operational | Active Sessions, Pending Orders, Kitchen Load | `OperationalMetricsSnapshot` |
| Catalog / Customer | Categories, Items, Menu Visits | `CatalogStatsSummary` |
| Order Sales (business-adjacent) | Order Sales, Average Order | `OrderSalesSummary` / `Rollup` — **labeled ≠ Revenue** |

---

## 7. Transitional note

Legacy `ops.getSettlement*` (Session `totalAmount`) remains mounted for existing UI until a presentation cutover program adopts `reporting.*`.  
**Reporting Platform is the certified SSOT** for new adoption. Session settlement metrics are transitional compatibility only.

---

## 8. Non-goals

- Dashboard UI redesign / cutover (future adoption program)  
- PDF/Excel renderers (consume same DTOs later)  
- ERP / ledger / financial statements  
- Redesign of certified write domains  
