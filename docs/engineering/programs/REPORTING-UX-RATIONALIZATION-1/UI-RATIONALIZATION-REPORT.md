# UI RATIONALIZATION REPORT

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 7 — Executive UX Rationalization (findings) |
| **Date** | 2026-07-27 |
| **Role** | Architecture / product audit — not visual design system rewrite |

---

## Goals

- Reduce cognitive load  
- Progressive disclosure  
- Group Operational / Financial / Refund / Tax / Payment / Growth  
- Owner + accountant readability  
- Comparable clarity to Toast / Square / Lightspeed / Simphony / Aloha **without** copying their architecture  

---

## Clutter sources

| Source | Severity | Fix class |
|--------|----------|-----------|
| Catalog KPIs on financial reports | High | Remove / relocate |
| Lifetime Overview beside month selector | Critical | Bind period |
| Net without Refund Count/Amount/Rate | High | Unified Refund group |
| Comp rate + Gross + Order Sales competing | Medium | Section hierarchy |
| Upgrade banners mid-flow | Low | Keep but below executive strip |
| Admin “reports” naming collision | Low | Nav copy |

---

## Proposed KPI grouping

| Group | KPIs |
|-------|------|
| **Financial** | Check Revenue, Net Revenue, Tax Collected, Average Check, Paid Checks |
| **Refund** | Refund Count, Refund Publications, Refund Rate, Net (cross-link), Refund by Payment Method |
| **Payment** | Monetary Tender Total, method mix % (never Revenue) |
| **Operational (Order)** | Order Sales, Completed Orders, Average Order |
| **Operational (Floor)** | Active Sessions, Occupied Tables, Pending/Preparing (Home — not Reports) |
| **Growth / Trends** | Check Revenue Trend; optional Refund Trend |
| **Tax** | Tax Collected (+ period note already in semantics) |

---

## Hierarchy rules

1. One period control governs the page.  
2. Money before catalog.  
3. Gross → Refund → Net before tender mix.  
4. Order Sales clearly separated as dual-metric peer.  
5. Excel export uses the same period and same KPI names.  

---

## What not to do

- Do not restyle into generic purple SaaS dashboard noise.  
- Do not add KPI cards that invent formulas.  
- Do not collapse Check Revenue and Order Sales.  
- Do not surface Expected Cash as a financial KPI on Reports.

---

## Implementation readiness

UX rationalization is **specified**. Implementation awaits:

1. Time-semantics Architecture decision (A/B/C)  
2. Executive Excel money-strip decision (Exec-1 vs Exec-2)  
3. Explicit go-ahead for presentation adoption program  

**No UI code changed in this audit.**
