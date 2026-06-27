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
| Start a program | [Program Charter template](./templates/Program-Charter.md) |
| Pass compliance | [Compliance Checklist](./governance/Compliance-Checklist.md) |
| Look up a term | [Glossary](./glossary/Architecture-Glossary.md) |

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

## Architecture Blueprint

The [Order-Centric Architecture Blueprint](./blueprints/Order-Centric-Architecture.md) (Part I, §1–17) defines the Order domain, lifecycle, events, production path, and constraints. Ratified as Part I of the Constitution.

## ADRs

Architecture Decision Records live in [adrs/](./adrs/). All thirteen ratified ADRs (ADR-ARCH-001 through ADR-ARCH-013) have individual documents. The [registry](./constitution/ADR-Registry.md) is the constitutional index.

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
