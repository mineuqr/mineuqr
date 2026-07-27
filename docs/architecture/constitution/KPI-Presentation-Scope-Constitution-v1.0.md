# KPI Presentation Scope Constitution v1.0

| Field | Value |
|-------|-------|
| **Document** | KPI Presentation Scope Constitution |
| **Version** | **1.0** |
| **Status** | Pending Architecture Authority adoption |
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Extends** | Reporting UX · KPI Ownership · Object Model · Classification & Promotion |
| **Effective** | Upon Architecture Authority approval |
| **Authority** | Technical Design Authority / Architecture Authority |

> **Related:** [KPI Ownership Constitution v1.0](./KPI-Ownership-Constitution-v1.0.md) · [Classification & Promotion Constitution v1.0](./KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) · [Governance](./Governance.md)

---

## Constitutional status

This extension is part of the permanent **Reporting Constitution**.

**Presentation Scope** defines where reporting objects are allowed to appear. It is independent from Classification, Ownership, Lifecycle, and Promotion — each concept keeps one responsibility.

Governance only. MUST NOT modify business logic, financial laws, formulas, APIs, schema, domain ownership, or read/write models.

Violations are **Governance Violations**.

---

## RULE KPI-10 — Presentation Scope

Every KPI MUST define its Presentation Scope — every location where it is **permitted** to appear.

Presentation Scope MUST be documented **before** implementation.  
A KPI without an approved Presentation Scope MUST NOT be released.

Widgets, Analytics modules, and Dashboard components MUST also declare Presentation Scope (OBJ-02…04 + KPI-10).

---

## Presentation Scope categories

### Scope 1 — Executive

| Field | Value |
|-------|-------|
| Purpose | Executive decision making |
| Allowed locations | Executive Dashboard · Executive Summary · Executive Widgets |
| Characteristics | Minimal · High importance · Fast decision support |

### Scope 2 — Operational

| Field | Value |
|-------|-------|
| Purpose | Operational management |
| Allowed locations | Sales Analytics · Operational Reports · Operational Dashboards |
| Characteristics | Restaurant operations · Workflow monitoring |

### Scope 3 — Financial

| Field | Value |
|-------|-------|
| Purpose | Financial analysis |
| Allowed locations | Financial Analytics · Financial Reports · Accounting Views |
| Characteristics | Settlement-based reporting · Financial investigation |

### Scope 4 — Diagnostic

| Field | Value |
|-------|-------|
| Purpose | Advanced analysis |
| Allowed locations | Drill-down pages · Advanced Analytics · Investigation reports |
| Characteristics | Root-cause analysis · Expert users |

### Scope 5 — Export

| Field | Value |
|-------|-------|
| Purpose | Business reporting |
| Allowed locations | Excel · PDF · CSV · Scheduled Reports · Future BI exports |
| Characteristics | Presentation may differ; **business meaning must remain identical** (KPI-05) |

### Scope 6 — Internal

| Field | Value |
|-------|-------|
| Purpose | Platform monitoring |
| Allowed locations | Developer Console · Monitoring · Support Tools · Admin Console (platform) |
| Characteristics | **Never** customer-facing restaurant reporting |

A reporting object MAY hold **multiple** Presentation Scopes (e.g. Executive + Financial + Export). It MUST NOT appear outside the approved set.

---

## Separation of concerns (non-overlapping)

| Concept | Controls |
|---------|----------|
| Presentation Scope (KPI-10) | **Visibility / allowed locations** |
| Classification (KPI-08) | **Business role** |
| Lifecycle (KPI-07) | **Data flow** |
| Ownership (KPI-01) | **Responsibility** |
| Promotion (KPI-09) | **Eligibility for Executive Dashboard** |

Responsibilities MUST NEVER overlap.

**Note:** Holding Scope 1 (Executive) does **not** by itself authorize Stage 6 placement for a new KPI — KPI-09 promotion still required. Scope 1 means Executive locations are *permitted* once promotion (if applicable) and certification pass.

**Constitutional reinforcement (GOV-01):** Executive Presentation Scope ≠ Executive Eligibility. Eligibility is governed exclusively by KPI-09 Promotion. See [Executive Eligibility & Governance Metadata Constitution v1.0](./Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md).

---

## Presentation rules

1. A reporting object MUST NOT appear outside its approved Presentation Scope.  
2. Executive Dashboard remains protected (KPI-09 / UX-04).  
3. Diagnostic KPIs (Class 4) MUST NOT appear in Executive Dashboard (typically Scope 4 + 5 only).  
4. Internal objects (Scope 6 / Class 5) MUST NEVER appear in customer-facing interfaces.  
5. Exports MUST preserve KPI meaning; presentation style may differ.  

---

## Normative examples

| Object | Classification / Type | Presentation Scope |
|--------|----------------------|--------------------|
| Total Sales | Executive KPI | Executive · Financial · Export |
| Sales Orders | Executive KPI | Executive · Operational · Export |
| Refund Amount | Executive KPI | Executive · Financial · Export |
| Average Order | Diagnostic KPI | Diagnostic · Export |
| Payment Overview | Widget (not KPI) | Executive · Financial · Export |

---

## Change governance

Changing Presentation Scope requires:

Architecture Review · Business Review · UX Review · Impact Assessment · Regression Validation · Architecture Approval · Documentation Update · Production Certification.

---

## Compliance checklist (object release gate)

Every reporting object MUST document:

- Object Type  
- Business Definition  
- Classification (if KPI)  
- Architectural Owner  
- Canonical Source  
- Lifecycle  
- Presentation Scope  
- Promotion Status  

If any field is missing: implementation MUST NOT be certified.
