# Constitution Registry

| Field | Value |
|-------|-------|
| **Document** | MineuQR Constitution Registry |
| **Version** | 1.0.0 |
| **Status** | Pending Review (with Versioning Framework) |
| **Owner** | Architecture Authority |
| **Program** | ARCHITECTURE-CONSTITUTION-VERSIONING-1 |
| **Rule** | CV-06 |

> **Normative versioning policy:** [Architecture Constitution Versioning Framework v1.0](./Architecture-Constitution-Versioning-Framework-v1.0.md)

Every constitution MUST appear here. Deletion prohibited — use Deprecated / Archived.

---

## Platform & Architecture

| Unique Name | Ver | Status | Domain | Owner | Dependencies | Related ADRs | Path |
|-------------|-----|--------|--------|-------|--------------|--------------|------|
| Architecture Constitution | 1.0.0 | **Adopted** (Ratified) | Platform / Order-centric | Architecture Authority | — | ARCH-1 elevation; ADR-ARCH-001+ | [Architecture-Constitution-v1.0.md](./Architecture-Constitution-v1.0.md) |
| Architecture North Star | 1.0.0 | Adopted (part of Architecture Constitution) | Platform | Architecture Authority | Architecture Constitution | — | [North-Star.md](./North-Star.md) |
| Quality Attributes | 1.0.0 | Adopted (constitutional part) | Platform NFR | Architecture Authority | Architecture Constitution | — | [Quality-Attributes.md](./Quality-Attributes.md) |
| Ordering Invariants | 1.0.0 | Adopted (constitutional part) | Order | Architecture Authority | Architecture Constitution | — | [Ordering-Invariants.md](./Ordering-Invariants.md) |
| Architecture Constitution Versioning Framework | 1.0.0 | **Pending Review** | Platform-wide | Architecture Authority | Architecture Constitution | — | [Architecture-Constitution-Versioning-Framework-v1.0.md](./Architecture-Constitution-Versioning-Framework-v1.0.md) |
| Enterprise Architecture Governance Framework | 1.0.0 | **Pending Review** | Enterprise / Cross-domain | Architecture Authority | Architecture Constitution; Versioning Framework | CROSS-DOMAIN-GOVERNANCE-1 | [Enterprise-Architecture-Governance-Framework-v1.0.md](./Enterprise-Architecture-Governance-Framework-v1.0.md) |

---

## Reporting Governance Constitutions

| Unique Name | Ver | Status | Domain | Owner | Dependencies | Related ADRs / Programs | Path |
|-------------|-----|--------|--------|-------|--------------|-------------------------|------|
| Reporting UX Constitution | 1.0.0 | Pending Review | Reporting UX | Architecture Authority / TDA | Architecture Constitution | REPORTING-UX-CONSTITUTION-1 | [Reporting-UX-Constitution-v1.0.md](./Reporting-UX-Constitution-v1.0.md) |
| KPI Ownership Constitution | 1.0.0 | Pending Review | Reporting KPI | Architecture Authority / TDA | Reporting UX; Architecture Constitution | REPORTING-UX-CONSTITUTION-1 | [KPI-Ownership-Constitution-v1.0.md](./KPI-Ownership-Constitution-v1.0.md) |
| Reporting Object Model & KPI Lifecycle Constitution | 1.0.0 | Pending Review | Reporting Object Model | Architecture Authority / TDA | KPI Ownership; Reporting UX | REPORTING-UX-CONSTITUTION-EXTENSION-1 | [Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) |
| KPI Classification & Promotion Governance Constitution | 1.0.0 | Pending Review | Reporting Classification | Architecture Authority / TDA | KPI Ownership; Object Model | REPORTING-UX-CONSTITUTION-EXTENSION-2 | [KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md](./KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) |
| KPI Presentation Scope Constitution | 1.0.0 | Pending Review | Reporting Scope | Architecture Authority / TDA | Classification; Ownership | REPORTING-UX-CONSTITUTION-EXTENSION-3 | [KPI-Presentation-Scope-Constitution-v1.0.md](./KPI-Presentation-Scope-Constitution-v1.0.md) |
| Executive Eligibility & Governance Metadata Constitution | 1.0.0 | Pending Review | Reporting Governance Metadata | Architecture Authority / TDA | Scope; Promotion; Ownership | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 | [Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md](./Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md) |
| Operational Mirror & Truth Layer Constitution | 1.0.0 | Pending Review | Reporting Authority Hierarchy | Architecture Authority / TDA | Governance Metadata; Architecture Constitution | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 | [Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md](./Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md) |
| Reporting Constitution Enforcement Framework | 1.0.0 | Pending Review | Reporting Enforcement | Architecture Authority / TDA | All Reporting Constitutions; Mirror & Truth Layers | REPORTING-CONSTITUTION-ENFORCEMENT-1 | [Reporting-Constitution-Enforcement-Framework-v1.0.md](./Reporting-Constitution-Enforcement-Framework-v1.0.md) |

---

## Registry maintenance

| Event | Action |
|-------|--------|
| New constitution Draft | Add row Status=Draft |
| Submit for adoption | Status=Pending Review |
| Authority adopts | Status=Adopted; set Effective Date on document |
| Major supersession | Prior → Deprecated; new row; CV-05 migration notes on successor |
| Long-term retention | Deprecated → Archived |

**Previous Version / Successor Version** live primarily on each constitution’s CV-01 header; Registry Status must stay synchronized.
