# Architecture Governance

> **Constitution Part II §18–27** · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md)

This document indexes governance sections. Detailed process documents live in [governance/](../governance/).

# Part II — Governance & Evolution

---

## §18. Architecture Decision Hierarchy

```
Architecture Vision & North Star     (Constitution — Preamble, North Star, §1)
        ↓
Architecture Principles              (Constitution §1, North Star)
        ↓
Architecture Governance              (Constitution §18–29, ADR-ARCH-013)
        ↓
ADRs                                 (ADR-ARCH-001 … ADR-ARCH-013+)
        ↓
Architecture Blueprint               (Constitution Part I §1–17)
        ↓
Implementation Programs              (ORDER-1, ORDER-EVENTS-1, …)
        ↓
Code
```

**Precedence:** Higher layers win. **Conflict resolution** and **authority roles** as ratified in ARCH-1 Constitution elevation (§18 full text incorporated).

**Constitutional rule:** *No implementation may contradict a higher layer.*

---

## §19. Dependency Rules

**Layers:** Presentation → Application → Domain → Infrastructure.

**Domain depends on nothing.** **Infrastructure is business-unaware.** **Application orchestrates without business rules.** **Presentation renders only.**

Allowed and forbidden dependency matrix as ratified — see ARCH-1 Constitution §19 (incorporated by reference without modification).

---

## §20. Package Architecture

Official logical packages under `server/order/` (application, domain/aggregate, domain/policies, domain/events, repositories, infrastructure, acl) plus `shared/`, `client/`, integration subscribers.

Dependency direction **inward to domain**. Repository file moves authorized only by implementation programs.

---

## §21. Anti-Corruption Layer (ACL)

ACLs: CommercialACL, RestaurantACL, TableACL, IdentityACL, MenuPricingACL, IntegrationACL (future Kitchen, Printing, Session).

Purpose: inbound/outbound translation, dependency isolation, extensibility — as ratified.

---

## §22. Domain Versioning Strategy

Event versioning, contract versioning, read model versioning, backward compatibility, deprecation policy, migration rules — as ratified.

---

## §23. Domain Error Architecture

Classification: Domain, Application, Infrastructure, Transport errors.

Official Order domain errors: OrderAlreadyCompleted, InvalidTransition, OrderImmutable, RestaurantClosed, CommercialRestriction, OrderingDisabled, AccessDenied, ConcurrencyConflict, etc.

Propagation: domain semantics → application → transport mapping at adapter only.

---

## §24. Architecture Fitness Functions

Permanent rules FF-01 through FF-18 (no SQL in domain, no UI KPI math, single mutation path, no cross-domain router writes, RESET-1 print guard, etc.).

Certification requires declared fitness function evidence (§28).

---

## §25. Evolution Rules

Capability placement decision tree; never expand Order indefinitely; domain split triggers; RESET-1 re-entry rules; Session graduation policy — as ratified.

---

## §26. ADR Governance

Statuses: Draft → Proposed → Accepted → Implemented → Deprecated / Superseded / Rejected.

Quarterly hygiene; mandatory ADR triggers; ownership; documentation in `docs/architecture/adrs/` (convention).

---

## §27. Blueprint Governance

Architecture Authority owns Constitution; Principal Engineer maintains Part I; BAR process for amendments; program traceability to Blueprint § and ADRs required.

**Constitution version:** **1.0.0 — Ratified Constitution**

---

## §28. Architecture Compliance

Per-program package: Architecture Traceability Matrix, affected ADRs, affected Blueprint §, compliance verification, architecture review (entry/exit), exit criteria, certification outcomes, Architecture Exception Process (30-day max).

**Rule:** *Implementation cannot be certified until compliance is verified.*

---

## Standalone process documents

| Topic | Document |
|---|---|
| Architecture review | [Architecture-Review-Process.md](../governance/Architecture-Review-Process.md) |
| ADR lifecycle | [ADR-Lifecycle.md](../governance/ADR-Lifecycle.md) |
| Blueprint amendments | [Blueprint-Amendment-Process.md](../governance/Blueprint-Amendment-Process.md) |
| Compliance | [Compliance.md](./Compliance.md) |
| Program certification | [Program-Certification.md](../governance/Program-Certification.md) |
| Exceptions | [Architecture-Exception-Process.md](../governance/Architecture-Exception-Process.md) |

**Related:** [ADR-ARCH-013](../adrs/ADR-ARCH-013.md) · [Templates](../templates/)

## Full constitutional text (§19–§25)

]

---

]

---

]

---

]

---

]

---

]

---

]