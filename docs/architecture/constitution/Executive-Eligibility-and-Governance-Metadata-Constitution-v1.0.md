# Executive Eligibility & Governance Metadata Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Executive Eligibility & Governance Metadata Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting Governance Metadata |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 |
| **Extends** | Reporting UX · KPI Ownership · Object Model · Classification & Promotion · Presentation Scope |

> **Related:** [KPI-09 Promotion](./KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) · [KPI-10 Presentation Scope](./KPI-Presentation-Scope-Constitution-v1.0.md) · [Governance](./Governance.md)

---

## Constitutional status

This extension is part of the permanent **Reporting Constitution**.

It separates **Reporting Governance Metadata** from **Operational Metadata** and defines **Executive Eligibility** governance so constitutional policy does not leak into operational runtime metadata.

Violations are **Architecture Governance Violations**.

Governance only — MUST NOT modify business logic, financial laws, formulas, APIs, schema, read/write models, or runtime behaviour.

---

## RULE GOV-01 — Executive Scope ≠ Executive Eligibility

**Executive Presentation Scope does NOT grant Executive Dashboard eligibility.**

| Concept | Rule | Controls |
|---------|------|----------|
| Presentation Scope (KPI-10) Scope 1 — Executive | Necessary | Where an object **MAY** appear |
| Promotion (KPI-09) | Sufficient gate | Whether it **IS** eligible for Executive Dashboard |

Every KPI proposed for Executive Dashboard MUST complete the approved Promotion Pipeline before becoming visible in Executive reporting.

**Executive Scope is necessary but not sufficient.**  
**Eligibility always requires Promotion Approval.**

Runtime allowlists (e.g. `EXECUTIVE_SUMMARY_KPI_IDS`) MAY implement an already-approved Stage 6 set. They MUST NOT invent eligibility independent of KPI-09 governance.

---

## RULE GOV-02 — Governance Metadata Separation

**Operational Metadata** and **Governance Metadata** are independent architectural concerns.

They MUST remain **physically and logically separated**.

- Operational metadata MUST NOT contain constitutional governance rules.  
- Governance metadata MUST NOT define runtime behaviour.

### Operational Metadata

Describes **how reporting operates**. Supports runtime execution.

Examples:

- `kpiDictionary.ts` metric definitions  
- Calculation identifiers / formulas / `calculationVersion`  
- Business labels / preferred names (`productSemantics.ts`)  
- Canonical identifiers (`KpiId`)  
- Translation keys / display formatting  
- DTO field bindings / contract ids  
- Owner domain used for **runtime source routing** (technical write/projection owner)

### Governance Metadata

Describes **architectural policy**. Supports architecture governance and certification.

Examples:

- KPI Classification (KPI-08 Classes 1–5)  
- Presentation Scope (KPI-10 Scopes 1–6)  
- Promotion Status / pipeline stage (KPI-09)  
- Lifecycle policy documentation (KPI-07)  
- Constitution rules (UX / OBJ / KPI / GOV)  
- Architecture policies / approval status  

Governance Metadata MUST NOT participate in runtime execution (until a dedicated Governance Layer exists per GOV-04, and even then only for **validation**, never for financial calculation).

---

## RULE GOV-03 — Architectural Separation

```
Operational Layer
      ↓
Metric Definition
      ↓
Runtime Behaviour
--------------------------------
Governance Layer
      ↓
Policy
      ↓
Architecture Rules
      ↓
Compliance
      ↓
Certification
```

Mixing both layers is **prohibited**.

---

## RULE GOV-04 — Future Governance Runtime

If governance metadata ever becomes programmatically consumable, it MUST be implemented as a **dedicated Governance Layer**.

It MUST NOT be embedded into runtime operational metadata (`kpiDictionary.ts`, `productSemantics.ts`, etc.).

### Recommended structure (proposal only — not implemented by this program)

```
shared/reporting-platform/governance/
├── reportingConstitution.ts
├── kpiClassification.ts
├── presentationScope.ts
├── promotionPolicy.ts
├── lifecyclePolicy.ts
└── governanceRegistry.ts
```

This layer represents Governance Metadata only. It MUST NOT contain business calculations.

Current SSOT for governance metadata: constitution documents + program registries under `docs/architecture/constitution/` and `docs/engineering/programs/REPORTING-UX-CONSTITUTION*` / this program.

---

## RULE GOV-05 — Dependency Direction

```
Governance
     ↓
Validation
     ↓
Runtime
```

- Runtime reporting MAY consume governance metadata for **validation** (fitness / certification / guards).  
- Governance metadata MUST **NEVER** depend on runtime implementation.  
- Reverse dependencies are prohibited.

---

## Extension — Truth Layers & Mirrors (GOV-06…10)

Authority hierarchy, Operational Mirror Principle, and conflict resolution:  
[Operational Mirror Principle & Truth Layer Constitution v1.0](./Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md).

**Enforcement (final layer):** [Reporting Constitution Enforcement Framework v1.0](./Reporting-Constitution-Enforcement-Framework-v1.0.md) (**GOV-11…16**).

---

## Architecture protection

MUST NOT change: financial calculations; Revenue / Settlement / Refund / Tax laws; APIs; database; runtime ownership; domain or event ownership.
