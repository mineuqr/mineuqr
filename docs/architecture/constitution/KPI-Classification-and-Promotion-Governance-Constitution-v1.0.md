# KPI Classification & Promotion Governance Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | KPI Classification & Promotion Governance Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting Classification |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Extends** | Reporting UX · KPI Ownership · Object Model & Lifecycle |

> **Related:** [KPI Ownership Constitution v1.0](./KPI-Ownership-Constitution-v1.0.md) · [Reporting Object Model & KPI Lifecycle Constitution v1.0](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) · [Presentation Scope Constitution v1.0](./KPI-Presentation-Scope-Constitution-v1.0.md) · [Governance](./Governance.md)

---

## Constitutional status

This extension is part of the permanent **Reporting Constitution**.

It governs **where KPIs belong**, **how they evolve**, and **under what conditions** they may appear in Executive Reporting.

Violations are **Architecture Governance Violations**.

Governance only — no architecture, business logic, API, schema, or financial changes.

---

## RULE KPI-08 — KPI Classification

Every KPI MUST belong to **exactly one** classification.  
Classification is mandatory. A KPI MUST NOT exist without an assigned class.

### CLASS 1 — Executive KPI

| Field | Value |
|-------|-------|
| Purpose | Executive decision making |
| Audience | Restaurant Owner · General Manager · Area Manager |
| Characteristics | High business value · Immediately actionable · Simple · Stable · Limited quantity |
| Placement | Executive Overview (primary); may also appear in deeper Analytics via progressive disclosure **without** changing class |
| Examples | Total Sales · Sales Orders · Orders · Refund Amount · Tax Collected |

Executive Dashboard MUST remain intentionally minimal (UX-04: &lt; 10 seconds understanding).

### CLASS 2 — Operational KPI

| Field | Value |
|-------|-------|
| Purpose | Restaurant operations |
| Audience | Operations · Kitchen · Cashier · Floor · Managers |
| Placement | Operational / Sales operational reporting — **not** Executive Overview by default |
| Examples | Completed Orders · Pending Orders · Preparing Orders · Ready Orders · Active Orders · Kitchen Load |

### CLASS 3 — Financial KPI

| Field | Value |
|-------|-------|
| Purpose | Financial analysis |
| Audience | Finance · Accounting · Business Owners |
| Placement | Financial Analytics |
| Examples | Net Sales · Payment distribution metrics · Advanced financial totals not on Executive |

**Clarification:** Refund Amount and Tax Collected that are **Class 1 Executive** keep Class 1 as their sole classification. Their appearance inside Financial Analytics is progressive disclosure (UX-05), not a second class.

### CLASS 4 — Diagnostic KPI

| Field | Value |
|-------|-------|
| Purpose | Root-cause analysis |
| Characteristics | Useful for investigation · Not required for daily executive decisions |
| Placement | Secondary Financial / diagnostic views |
| Examples | Average Order · Average Check · Refund Rate · Complimentary Rate / Amount |
| Rule | Diagnostic KPIs MUST NOT appear in Executive Overview **by default** |

### CLASS 5 — Internal KPI

| Field | Value |
|-------|-------|
| Purpose | Internal platform monitoring |
| Audience | Developers · Operations · Support · Architecture |
| Examples | Projection Lag · Event Processing Delay · Queue Length · Projection Health |
| Rule | Internal KPIs MUST **NEVER** appear in customer-facing reporting |

### Mandatory classification documentation

Each KPI MUST document:

- Business Purpose  
- Audience  
- Classification (Class 1–5)  
- Architectural Owner  
- Canonical Source  
- Business Definition  
- Approved Business Name  
- Lifecycle (KPI-07)  

---

## RULE KPI-09 — Promotion Governance

Executive Dashboard is **protected**.

New KPIs MUST NOT appear in Executive Overview immediately.  
Promotion requires evidence.

### Promotion pipeline (mandatory order)

```
Stage 1  Experimental
    ↓
Stage 2  Analytics
    ↓
Stage 3  Operational Validation
    ↓
Stage 4  Architecture Review
    ↓
Stage 5  Executive Approval
    ↓
Stage 6  Executive Dashboard
```

**Skipping stages is prohibited.**

### Promotion requirements (before Stage 6)

A KPI MUST demonstrate:

1. Clear business value  
2. No duplication (UX-03)  
3. Unique business question (UX-02)  
4. Stable calculation  
5. Canonical ownership (KPI-01)  
6. Canonical source (KPI-02)  
7. Consistent terminology (KPI-04 / UX-07)  
8. Successful UAT  
9. Executive usefulness (health summary fit; UX-04)  

### Executive Dashboard protection

- Curated experience — adding KPIs is **exceptional**  
- Removing KPIs is allowed when redundancy exists  
- Executive KPI inflation is **prohibited**  
- Target: restaurant health understood in **&lt; 10 seconds**  

Widgets / presentation cards (OBJ-02 / OBJ-04) that are not KPIs (e.g. Payment Overview) follow the same Executive protection gates when added to Executive Overview.

**GOV-01:** Executive Presentation Scope does not grant eligibility — [Executive Eligibility & Governance Metadata Constitution v1.0](./Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md).

---

## Change governance

### Classification change

Requires: Architecture Review · Business Review · Impact Assessment · Regression Validation · Architecture Approval.

### Move into Executive Dashboard

Requires: Promotion Review · Architecture Approval · Product Approval · Documentation Update · UAT · Production Certification.

---

## Architecture protection

MUST NOT modify: Financial / Revenue / Settlement / Refund / Tax laws; reporting formulas; database schema; read/write models; APIs; domain or event ownership.
