# REFUND-REPORTING-ADOPTION-1 — Reporting Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-REPORTING-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Adoption scope

| Pipeline | Adoption |
|----------|----------|
| Business Metrics Summary | Gross unchanged; Net / Refund totals additive |
| Business Metrics Trend | Per-period Gross + Refund + Net |
| Payment Method Analytics | Captured mix unchanged; refund buckets additive |
| Financial Summary export (Excel / PDF) | Gross, Refund Publications, Net, Refund Rate |
| Payment Method export | Refund tender total + method breakdown |
| Check Revenue Overview (dashboard) | Net Revenue card added beside Gross |
| Executive Summary | **No new KPIs** — footer points to Financial Summary |
| Order Sales / Operational metrics | **Unaffected** (Order Read ownership) |

---

## Consumption model

```
Settlement Record (immutable publication)
  ├─ gen=1 settlement/void  → Gross Check Revenue / Tax / Paid Counts
  └─ recordKind=refund      → Refund Publications → Net Revenue derivation
```

Reporting never writes Settlement Records. Reporting never recalculates Check money. Refund windowing uses **publication time** (`createdAt` projected as reporting `settledAt` for refund facts) so Business Day aggregation follows the compensating event.

---

## Backward compatibility

- Existing Gross KPIs keep formulas and field ids (`revenue`, `taxCollected`, `paidCheckCount`, `averageCheck`)  
- New fields are additive on DTOs  
- Zero-refund periods: `netRevenue === revenue`, refund totals `0.00`  

---

## Final Certification

**PRODUCTION CERTIFIED**
