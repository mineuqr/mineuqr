# KPI Ownership Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | KPI Ownership Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting KPI |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Code SSOT (definitions)** | `shared/reporting-platform/kpiDictionary.ts` |
| **Code SSOT (business names)** | `shared/reporting-platform/productSemantics.ts` |

> **Related:** [Reporting UX Constitution v1.0](./Reporting-UX-Constitution-v1.0.md) · [Reporting Object Model & KPI Lifecycle Constitution v1.0](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) (KPI-07) · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md)

---

## Constitutional status

This document establishes permanent **KPI ownership governance** for MineuQR Reporting.

It does **not** modify financial calculations, Revenue/Refund/Tax/Settlement laws, APIs, database, or domain ownership. It binds how KPIs are **named, owned, sourced, and presented**.

---

## RULE KPI-01 — One KPI = one owner

Every KPI MUST have exactly one architectural owner (write / publication authority).

| Business Name | KPI id | Architectural owner (plane) | Write / publication owner |
|---------------|--------|-----------------------------|---------------------------|
| Total Sales | `revenue` | Settlement / Financial Settlement Platform | Check Management → Settlement Record publications |
| Sales Orders | `orderSales` | Order Platform | Order Read (analytics projection) |
| Refund Amount | `refundPublishedTotal` | Settlement / Refund publication path | Check Management → Settlement Record `recordKind=refund` |
| Payment Overview | *(presentation card)* | Settlement payment publication | Payment Method Analytics from Settlement Record payment snapshots |
| Tax Collected | `taxCollected` | Settlement / Financial | Check Management → published tax snapshot on Settlement Record |
| Net Sales | `netRevenue` | Reporting Platform (derivation) | Derived from Total Sales − Refund Amount |
| Refund Rate | `refundRate` | Reporting Platform (derivation) | Derived from Refund Amount / Total Sales |

**Clarification:** “Settlement Platform” is the **financial plane**. Check Management remains the **write owner** of Settlement Record publications. Reporting Platform **never** owns financial truth for Total Sales.

---

## RULE KPI-02 — One KPI = one source of truth

Every KPI MUST originate from one canonical source.  
Mixing multiple authorities for a single KPI is prohibited.  
Derived values MUST be traceable to their canonical owner.

See [KPI Source of Truth Registry](../../engineering/programs/REPORTING-UX-CONSTITUTION-1/KPI-SOURCE-OF-TRUTH-REGISTRY.md).

---

## RULE KPI-03 — One KPI = one definition

Every KPI MUST have exactly one business definition, shared across:

- Dashboard  
- Excel  
- PDF  
- APIs (DTO field semantics)  
- Documentation  
- KPI Dictionary (`kpiDictionary.ts`)

Different definitions for the same KPI are prohibited.

---

## RULE KPI-04 — One KPI = one business name

Each KPI MUST have one approved Business Name (Product Semantics).  
That name MUST be consistent across every user-facing surface.  
Internal technical names (KPI ids, DTO fields, table columns) MAY differ. Business names MUST NOT.

---

## RULE KPI-05 — Cross-platform consistency

Dashboard, Excel, PDF, Exports, and Reports MUST display **identical KPI semantics**.  
Presentation differences (layout, chrome) are allowed.  
Business meaning is not.

---

## RULE KPI-06 — Ownership integrity

A KPI MUST NEVER migrate between architectural owners without:

1. Architecture Review  
2. ADR  
3. Impact Assessment  
4. Regression Validation  
5. Production Approval  

---

## RULE KPI-07 — Lifecycle ownership

Every KPI MUST define its complete lifecycle (Producer → Canonical Source → Architectural Owner → Projection → Reporting Service → Presentation → Exports → Consumers).

Normative text and change governance: [Reporting Object Model & KPI Lifecycle Constitution v1.0](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md).  
Registry: [KPI Lifecycle Registry](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-1/KPI-LIFECYCLE-REGISTRY.md).

Lifecycle changes MUST NOT occur implicitly; they follow the same review / ADR / impact / regression / production gate as KPI-06.

---

## RULE KPI-08 — KPI Classification

Every KPI MUST belong to exactly one class (Executive · Operational · Financial · Diagnostic · Internal).

Normative text: [KPI Classification & Promotion Governance Constitution v1.0](./KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md).  
Registry: [KPI Classification Registry](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-2/KPI-CLASSIFICATION-REGISTRY.md).

---

## RULE KPI-09 — Promotion Governance

Executive Dashboard is protected. New KPIs MUST NOT appear there without completing the promotion pipeline (Experimental → Analytics → Operational Validation → Architecture Review → Executive Approval → Executive Dashboard).

Normative text: same Classification & Promotion Constitution.  
Policy / workflow: [KPI Promotion Policy](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-2/KPI-PROMOTION-POLICY.md) · [Promotion Workflow Specification](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-2/PROMOTION-WORKFLOW-SPECIFICATION.md).

---

## RULE KPI-10 — Presentation Scope

Every KPI (and Widget / Analytics / Dashboard component) MUST declare every location where it is permitted to appear (Executive · Operational · Financial · Diagnostic · Export · Internal).

Normative text: [KPI Presentation Scope Constitution v1.0](./KPI-Presentation-Scope-Constitution-v1.0.md).  
Registry: [Presentation Scope Registry](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-3/PRESENTATION-SCOPE-REGISTRY.md).

Presentation Scope controls **visibility**. It does not replace Classification, Ownership, Lifecycle, or Promotion.

**GOV-01:** Executive Scope ≠ Executive Eligibility — [Executive Eligibility & Governance Metadata Constitution v1.0](./Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md).

---

## Compliance checklist (mandatory for every reporting feature)

- [ ] What business question does this solve?  
- [ ] Does another component already answer it?  
- [ ] Who owns this KPI?  
- [ ] What is its canonical source?  
- [ ] Is the KPI Dictionary updated?  
- [ ] Is terminology consistent (Business Language)?  
- [ ] Is Dashboard consistent with Excel?  
- [ ] Is Dashboard consistent with PDF?  
- [ ] Is the KPI lifecycle documented (KPI-07)?  
- [ ] Is the object correctly classified (KPI vs Widget vs Analytics vs Card)?  
- [ ] Is the KPI Classification assigned (KPI-08 Class 1–5)?  
- [ ] If Executive placement is requested, did promotion complete (KPI-09)?  
- [ ] Is Presentation Scope documented and respected (KPI-10)?  
- [ ] If Executive Scope is claimed, is Executive Eligibility separately proven (GOV-01 / KPI-09)?  
- [ ] Are Governance Metadata and Operational Metadata kept separated (GOV-02)?  
- [ ] Do Operational mirrors reflect governance (GOV-06) rather than inventing authority?  
- [ ] Does the change respect Truth Layer hierarchy and downward authority (GOV-07…10)?  
- [ ] Has Constitutional Validation been completed (GOV-12) with Mirror Integrity attested (GOV-11)?  
- [ ] Is Mirror Drift absent or corrected with required artifacts (GOV-13)?  
- [ ] Object Type · Definition · Classification · Owner · Source · Lifecycle · Scope · Promotion Status all present?  
- [ ] Does this violate UX-01…UX-07, KPI-01…KPI-10, OBJ-01…OBJ-04, or GOV-01…GOV-16?  

If any answer fails: implementation **MUST NOT** be certified.
