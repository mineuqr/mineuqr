# Reporting UX Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Reporting UX Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting UX |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Supersedes** | Informal reporting UX guidance prior to this constitution |

> **Related:** [KPI Ownership Constitution v1.0](./KPI-Ownership-Constitution-v1.0.md) · [Reporting Object Model & KPI Lifecycle Constitution v1.0](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Governance](./Governance.md)

---

## Constitutional status

This document is part of the permanent **Product / Architecture Constitution** for MineuQR Reporting.

Future reporting implementations **MUST** comply. Implementations that violate these rules are **Architecture Violations** and **MUST NOT** be Production Certified.

This constitution does **not** change financial laws, formulas, APIs, schema, or domain ownership. It governs **presentation and UX architecture** only.

---

## RULE UX-01 — Business questions first

Reporting exists to answer business questions.  
Reporting does **not** exist merely to display data.

Every visible element MUST help a restaurant owner or manager make a decision.

---

## RULE UX-02 — One component = one business question

Every visible reporting component MUST answer exactly **one** business question.

| Component (Business Name) | Business question |
|---------------------------|-------------------|
| Total Sales | How much did the business sell (financially)? |
| Sales Orders | How much operational order activity occurred? |
| Refund Amount | How much was refunded? |
| Payment Overview | How are customers paying (tender total)? |
| Tax Collected | How much tax has been collected? |
| Orders | How many orders were placed? |

If a component cannot be mapped to a single business question, it **MUST NOT** exist.

---

## RULE UX-03 — No duplicate questions

Two components MUST NEVER answer the same business question.

If duplication exists: **Merge**.  
If two charts explain the same metric: keep the clearer one.  
If two cards expose identical insights: merge.

---

## RULE UX-04 — Executive simplicity

Executive Overview is a **health summary**, not an analytics page.

It MUST remain focused on the restaurant’s most important indicators.  
Avoid KPI inflation and analytical overload.

**Target understanding time:** less than **10 seconds**.

Reference layout (REPORTING-UX-SIMPLIFICATION-1): at most **six** primary Executive cards.

---

## RULE UX-05 — Progressive disclosure

| Frequency / depth | Placement |
|-------------------|-----------|
| Frequently used health indicators | Executive Overview |
| Operational detail & trends | Sales Analytics |
| Financial detail (refunds, payments, tax, advanced) | Financial Analytics |
| Downloads / scheduled reports | Exports |
| Rarely used / derived averages & rates | Secondary Financial views |

---

## RULE UX-06 — Navigation simplicity

Every reporting section MUST have a unique purpose.  
Navigation MUST reflect **business workflows**, not technical architecture.  
Users must never wonder where information belongs.

Canonical areas:

1. Executive Overview  
2. Sales Analytics  
3. Financial Analytics  
4. Exports  

---

## RULE UX-07 — Business Language

User interfaces MUST use **Business Language**.  
Internal systems MUST use **Technical Architecture Language**.

Technical implementation details (Aggregate, Entity, Domain, Settlement Record, Check Aggregate, etc.) MUST NEVER leak into the product interface unless inside technical documentation.

Approved Business Names for dual-metric planes:

| Plane | EN | AR |
|-------|----|----|
| Financial | Total Sales | إجمالي المبيعات |
| Operational | Sales Orders | مبيعات الطلبات |

---

## Amendment

Amendments require Architecture Authority approval and an ADR when ownership or KPI semantics change (see KPI Ownership Constitution RULE KPI-06).
