# Operational Mirror Principle & Truth Layer Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Operational Mirror Principle & Truth Layer Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting Authority Hierarchy |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Extends** | Executive Eligibility & Governance Metadata Constitution (GOV-01…05) |

> **Related:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Governance](./Governance.md)

---

## Constitutional status

This document is part of the permanent **Reporting Constitution**.

It establishes the permanent **authority hierarchy** for reporting decisions: Operational Mirror Principle, Truth Layer Hierarchy, Authority Chain, and Dependency Authority.

Violations are **Constitutional Architecture Violations**.

Governance only — MUST NOT modify business laws, financial laws, APIs, schema, runtime behaviour, or domain/event ownership.

---

## RULE GOV-06 — Operational Mirror Principle

Operational metadata MUST **mirror** governance decisions.

Operational metadata MUST NEVER:

- Create governance decisions  
- Redefine governance decisions  
- Become the constitutional source of authority  

Operational metadata exists solely to enable **runtime execution**.

### Mirror definition

A **Mirror** is a runtime representation of an already approved constitutional decision.

A Mirror is **NOT**: an authority · a policy · a governance source · a business rule.

A Mirror **reflects**. It never governs.

### Correct

```
Reporting Constitution
      ↓
Promotion Registry
      ↓
Executive Eligibility
      ↓
EXECUTIVE_SUMMARY_KPI_IDS   (runtime mirror)
```

### Incorrect (prohibited)

```
EXECUTIVE_SUMMARY_KPI_IDS
      ↓
defines Executive KPIs
```

---

## RULE GOV-07 — Truth Layer Hierarchy

MineuQR operates under **four permanent Truth Layers**. Every architectural decision MUST belong to one layer. Layers are hierarchical. **Lower layers MUST NEVER redefine higher layers.**

### Layer 1 — Business Truth

Defines business reality. **Highest authority.**

Examples: Revenue Law · Settlement Law · Refund Law · Tax Law · Business Calendar · Financial Rules.

### Layer 2 — Architectural Truth

Defines system structure. Implements Business Truth.

Examples: Domains · Aggregates · Ownership · Boundaries · ADRs · Architecture Constitution.

### Layer 3 — Governance Truth

Defines permanent platform policies. Regulates implementation.

Examples: KPI Classification · Presentation Scope · Promotion Governance · Lifecycle Policies · Reporting Constitution · Approval Policies · GOV-01…GOV-10.

### Layer 4 — Operational Truth

Defines runtime implementation. Executes approved decisions. MUST NEVER redefine them.

Examples: `kpiDictionary.ts` · Runtime registries · `EXECUTIVE_SUMMARY_KPI_IDS` · Translation maps · UI configuration · Display registries · `productSemantics.ts` (labels).

---

## Authority Chain

```
Business Truth
      ↓
Architectural Truth
      ↓
Governance Truth
      ↓
Operational Truth
      ↓
Presentation
```

Authority always flows **downward**. Authority MUST NEVER flow upward.

---

## RULE GOV-08 — Authority Protection

A lower Truth Layer MUST NEVER modify, reinterpret, replace, or supersede decisions from a higher Truth Layer.

| Lower layers MAY | Lower layers MUST NOT |
|------------------|------------------------|
| Implement | Redefine |
| Mirror | Override |
| Validate | Reclassify |
| Present | Promote / Reinterpret |

---

## RULE GOV-09 — Dependency Authority

Dependencies MUST follow the Truth Layer hierarchy.

**Allowed:** Business → Architecture → Governance → Operational → Presentation  

**Prohibited:** reverse authority (Presentation ↑ … ↑ Business).

---

## RULE GOV-10 — Constitutional Conflict Resolution

When layers appear to conflict, the **higher** Truth Layer always prevails:

```
Business Truth
      ↓
Architectural Truth
      ↓
Governance Truth
      ↓
Operational Truth
      ↓
Presentation
```

No exception without an approved **ADR**.

---

## Enforcement

Verification and certification of the above rules:  
[Reporting Constitution Enforcement Framework v1.0](./Reporting-Constitution-Enforcement-Framework-v1.0.md) (GOV-11…16).

---

## Architecture protection

MUST NOT modify: Business / Financial / Revenue / Settlement / Refund / Tax laws; APIs; database schema; runtime behaviour; domain or event ownership.
