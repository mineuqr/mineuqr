# REFUND-REPORTING-ADOPTION-1 — KPI Audit Report

| Field | Value |
|---|---|
| **Program** | REFUND-REPORTING-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Decision table

| KPI / Surface | Refund effect? | Decision | Rationale |
|---------------|----------------|----------|-----------|
| **Revenue** (`revenue` / Check Revenue) | Must **not** change | **Keep Gross** | Gen=1 paid Settlement Record publications only; refunds must not mutate Gross (ADR-ARCH-032) |
| **Net Revenue** (`netRevenue`) | Yes | **Adopt (new)** | Gross − Refund Publications; Reporting derivation; not a second monetary authority |
| **Refund Publications** (`refundPublishedTotal`) | Yes | **Adopt (new)** | Sum of `recordKind=refund` grandTotals |
| **Refund Count** (`refundPublicationCount`) | Yes | **Adopt (new)** | Count of refund Settlement Records in period |
| **Refund Rate** (`refundRate`) | Yes | **Adopt (new)** | Refund Publications ÷ Gross × 100 |
| **Tax Collected** | No (this program) | **Unchanged** | Remains gen=1 paid tax snapshot total; refunds do not rewrite Tax Collected |
| **Payment Methods** (captured mix) | Indirect | **Unchanged Gross mix** | `monetaryTenderTotal` / captured buckets stay settlement captures |
| **Payment Methods** (refund mix) | Yes | **Adopt (additive)** | `refundTenderTotal` + `refundBuckets` from `status=refunded` snapshots |
| **Cash Flow** | N/A in Reporting KPI catalog | **No adopt** | Custody / Expected Cash remains Register (ADR-028/030) |
| **Settlement Counts** (`paidCheckCount`) | No | **Unchanged** | Paid Check count from gen=1; refunds are publications, not new paid checks |
| **Average Check** | No | **Unchanged** | Gross Revenue ÷ Paid Checks |
| **Average Order** | No | **Unchanged** | Order Read domain |
| **Order Sales / Completed Orders** | No | **Unchanged** | Order Read ownership |
| **Complimentary / Voided** | No | **Unchanged** | Gen=1 outcomes |
| **Daily Check Revenue** (trend `revenue`) | No mutation | **Gross retained** | Trend adds `refundPublishedTotal` + `netRevenue` per period |
| **Executive Summary KPIs** | See Executive Audit | **No new Executive KPIs** | Avoid inflation; Financial Summary owns money story |

---

## Consistency rules verified

1. `revenue` (Gross) never includes `recordKind=refund`  
2. `netRevenue = revenue − refundPublishedTotal`  
3. Captured payment mix totals do not subtract refunds  
4. Refund payment mix is separate and additive  
5. Existing KPI ids / Gross formulas do not regress  

---

## Final Certification

**PRODUCTION CERTIFIED**
