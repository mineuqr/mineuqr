# MineuQR Architecture Documentation

Official architectural reference for MineuQR 2.0. Start here for onboarding, governance, and implementation program alignment.

**Constitution status:** v1.0.0 — Ratified (2026-06-27)  
**Next authorized program:** ORDER-1

## Quick navigation

| I want to… | Go to |
|---|---|
| Understand platform vision | [North Star](./constitution/North-Star.md) |
| Read supreme authority | [Architecture Constitution v1.0](./constitution/Architecture-Constitution-v1.0.md) |
| Design Order domain | [Order-Centric Blueprint](./blueprints/Order-Centric-Architecture.md) |
| Find a decision | [ADR Registry](./constitution/ADR-Registry.md) |
| Apply document identity rules | [Operational Document Identity Standard](./standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md) |
| Start a program | [Program Charter template](./templates/Program-Charter.md) |
| Pass compliance | [Compliance Checklist](./governance/Compliance-Checklist.md) |
| Look up a term | [Glossary](./glossary/Architecture-Glossary.md) |
| Apply Reporting UX rules | [Reporting UX Constitution v1.0](./constitution/Reporting-UX-Constitution-v1.0.md) |
| Apply KPI ownership rules | [KPI Ownership Constitution v1.0](./constitution/KPI-Ownership-Constitution-v1.0.md) |
| Apply Object Model / KPI lifecycle | [Object Model & KPI Lifecycle Constitution v1.0](./constitution/Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) |
| Apply KPI classification / promotion | [Classification & Promotion Constitution v1.0](./constitution/KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) |
| Apply Presentation Scope | [Presentation Scope Constitution v1.0](./constitution/KPI-Presentation-Scope-Constitution-v1.0.md) |
| Apply Executive Eligibility / Governance Metadata | [Executive Eligibility & Governance Metadata Constitution v1.0](./constitution/Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md) |
| Apply Operational Mirror / Truth Layers | [Operational Mirror & Truth Layer Constitution v1.0](./constitution/Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md) |
| Enforce Reporting Constitution | [Reporting Constitution Enforcement Framework v1.0](./constitution/Reporting-Constitution-Enforcement-Framework-v1.0.md) |
| Version any Constitution | [Architecture Constitution Versioning Framework v1.0](./constitution/Architecture-Constitution-Versioning-Framework-v1.0.md) |
| Look up all Constitutions | [Constitution Registry](./constitution/Constitution-Registry.md) |
| Govern cross-domain authority | [Enterprise Architecture Governance Framework v1.0](./constitution/Enterprise-Architecture-Governance-Framework-v1.0.md) |
| Run Architecture Ops | [Architecture Governance Operations Index](./operations/Architecture-Governance-Operations-Index.md) |

## Documentation hierarchy

```
README (you are here)
    ↓
Constitution (supreme authority)
    ↓
Blueprint (Part I operational specification)
    ↓
ADRs (decision records)
    ↓
Governance (processes)
    ↓
Templates (reusable forms)
    ↓
Diagrams (editable Mermaid sources)
```

## Architecture Constitution

The [Architecture Constitution v1.0](./constitution/Architecture-Constitution-v1.0.md) is the **permanent governing authority**. It includes:

- [North Star](./constitution/North-Star.md) — evaluation principles for all decisions
- [Quality Attributes](./constitution/Quality-Attributes.md) — NFR permanence (availability, security, tenant isolation, …)
- [Governance](./constitution/Governance.md) — Part II §18–27
- [Compliance](./constitution/Compliance.md) — §28 certification requirements
- [ADR Registry](./constitution/ADR-Registry.md) — authoritative ADR index
- [Reporting UX Constitution v1.0](./constitution/Reporting-UX-Constitution-v1.0.md) — UX-01…UX-07 (pending adoption)
- [KPI Ownership Constitution v1.0](./constitution/KPI-Ownership-Constitution-v1.0.md) — KPI-01…KPI-10 (pending adoption)
- [Object Model & KPI Lifecycle Constitution v1.0](./constitution/Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) — OBJ-01…04, KPI-07 (pending adoption)
- [Classification & Promotion Constitution v1.0](./constitution/KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) — KPI-08…09 (pending adoption)
- [Presentation Scope Constitution v1.0](./constitution/KPI-Presentation-Scope-Constitution-v1.0.md) — KPI-10 (pending adoption)
- [Executive Eligibility & Governance Metadata Constitution v1.0](./constitution/Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md) — GOV-01…05 (pending adoption)
- [Operational Mirror & Truth Layer Constitution v1.0](./constitution/Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md) — GOV-06…10 (pending adoption)
- [Reporting Constitution Enforcement Framework v1.0](./constitution/Reporting-Constitution-Enforcement-Framework-v1.0.md) — GOV-11…16 final enforcement layer (pending adoption)
- [Architecture Constitution Versioning Framework v1.0](./constitution/Architecture-Constitution-Versioning-Framework-v1.0.md) — CV-01…06 (pending review)
- [Constitution Registry](./constitution/Constitution-Registry.md) — authoritative index of all constitutions
- [Enterprise Architecture Governance Framework v1.0](./constitution/Enterprise-Architecture-Governance-Framework-v1.0.md) — CD-01…06 cross-domain (pending review)

## Architecture Ops

Operating manuals (not constitutions): [Architecture Governance Operations Index](./operations/Architecture-Governance-Operations-Index.md) — Authority, ADR Ops, Constitution Ops, Programs, Certification, ARB, Exceptions, Debt, Compliance, Audit, Metrics, Annual Review.

## Architecture Blueprint

The [Order-Centric Architecture Blueprint](./blueprints/Order-Centric-Architecture.md) (Part I, §1–17) defines the Order domain, lifecycle, events, production path, and constraints. Ratified as Part I of the Constitution.

## ADRs

Architecture Decision Records live in [adrs/](./adrs/). Ratified ADRs (ADR-ARCH-001 through ADR-ARCH-014, ADR-ARCH-016, ADR-ARCH-017) have individual documents. The [registry](./constitution/ADR-Registry.md) is the constitutional index.

## Governance

| Process | Document |
|---|---|
| Architecture review | [Architecture-Review-Process.md](./governance/Architecture-Review-Process.md) |
| ADR lifecycle | [ADR-Lifecycle.md](./governance/ADR-Lifecycle.md) |
| Blueprint amendments | [Blueprint-Amendment-Process.md](./governance/Blueprint-Amendment-Process.md) |
| Compliance | [Compliance-Checklist.md](./governance/Compliance-Checklist.md) |
| Program certification | [Program-Certification.md](./governance/Program-Certification.md) |
| Exceptions | [Architecture-Exception-Process.md](./governance/Architecture-Exception-Process.md) |

## Diagrams

Editable Mermaid sources in [diagrams/](./diagrams/). Edit `.mmd` files — do not recreate diagrams in other formats.

| Diagram | File |
|---|---|
| Decision hierarchy | [architecture-overview.mmd](./diagrams/architecture-overview.mmd) |
| Domain landscape | [domain-landscape.mmd](./diagrams/domain-landscape.mmd) |
| Order aggregate | [order-aggregate.mmd](./diagrams/order-aggregate.mmd) |
| Production path | [production-path.mmd](./diagrams/production-path.mmd) |
| Dependency rules | [dependency-rules.mmd](./diagrams/dependency-rules.mmd) |
| Order lifecycle | [lifecycle.mmd](./diagrams/lifecycle.mmd) |
| Event flow | [event-flow.mmd](./diagrams/event-flow.mmd) |
| Package architecture | [package-architecture.mmd](./diagrams/package-architecture.mmd) |

## Templates

Future architecture programs must use [templates/](./templates/):

- [ADR-Template.md](./templates/ADR-Template.md)
- [Architecture-Review.md](./templates/Architecture-Review.md)
- [Blueprint-Amendment.md](./templates/Blueprint-Amendment.md)
- [Architecture-Traceability-Matrix.md](./templates/Architecture-Traceability-Matrix.md)
- [Program-Charter.md](./templates/Program-Charter.md)

## Foundation programs (completed)

| Document | Program |
|---|---|
| [RESET-1-CLOSURE.md](./RESET-1-CLOSURE.md) | Printing architecture retirement |
| [SHARED-FOUNDATION.md](./SHARED-FOUNDATION.md) | ARCH-1A shared layer consolidation |

## Decision hierarchy

See [Architecture Decision Hierarchy](./constitution/Architecture-Decision-Hierarchy.md) and [architecture-overview.mmd](./diagrams/architecture-overview.mmd).

**Rule:** No implementation may contradict a higher layer.

---

*Published under ARCH-CONSTITUTION-1 · Repository documentation only*
