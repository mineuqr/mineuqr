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

## Architecture Governance Operations (Architecture Ops)

| Topic | Document | Status |
|---|---|---|
| Operations Index | [Architecture-Governance-Operations-Index.md](../operations/Architecture-Governance-Operations-Index.md) | Pending Architecture Authority adoption (ARCHITECTURE-GOVERNANCE-OPERATIONS-1) |
| Program package | [ARCHITECTURE-GOVERNANCE-OPERATIONS-1](../../engineering/programs/ARCHITECTURE-GOVERNANCE-OPERATIONS-1/00-PROGRAM-PACKAGE.md) | Operating framework only — **not** a constitution |

Operates existing constitutions and `docs/architecture/governance/` processes. Does not redesign or duplicate them.

## Standalone process documents

| Topic | Document |
|---|---|
| Architecture review | [Architecture-Review-Process.md](../governance/Architecture-Review-Process.md) |
| ADR lifecycle | [ADR-Lifecycle.md](../governance/ADR-Lifecycle.md) |
| Blueprint amendments | [Blueprint-Amendment-Process.md](../governance/Blueprint-Amendment-Process.md) |
| Compliance | [Compliance.md](./Compliance.md) |
| Program certification | [Program-Certification.md](../governance/Program-Certification.md) |
| Exceptions | [Architecture-Exception-Process.md](../governance/Architecture-Exception-Process.md) |

## Constitution Versioning (platform-wide)

| Topic | Document | Status |
|---|---|---|
| Versioning Framework (CV-01…06) | [Architecture-Constitution-Versioning-Framework-v1.0.md](./Architecture-Constitution-Versioning-Framework-v1.0.md) | Pending Review (ARCHITECTURE-CONSTITUTION-VERSIONING-1) |
| Constitution Registry | [Constitution-Registry.md](./Constitution-Registry.md) | Seeded — sync on every constitution transition |
| Program package | [ARCHITECTURE-CONSTITUTION-VERSIONING-1](../../engineering/programs/ARCHITECTURE-CONSTITUTION-VERSIONING-1/00-PROGRAM-PACKAGE.md) | Governance only |

Applies to **all** MineuQR constitutions (Architecture, Reporting, future domains). Deletion of constitutions is prohibited.

## Enterprise Cross-Domain Governance

| Topic | Document | Status |
|---|---|---|
| Enterprise Architecture Governance Framework (CD-01…06) | [Enterprise-Architecture-Governance-Framework-v1.0.md](./Enterprise-Architecture-Governance-Framework-v1.0.md) | Pending Review (CROSS-DOMAIN-GOVERNANCE-1) |
| Program package | [CROSS-DOMAIN-GOVERNANCE-1](../../engineering/programs/CROSS-DOMAIN-GOVERNANCE-1/00-PROGRAM-PACKAGE.md) | Enterprise governance only |

Coordinates domain sovereignty, dependencies, shared principles, and conflict resolution across Order, Settlement, Reporting, Register, Session, Kitchen, Menu, Device, Waiter, and future platforms.

## Reporting Product Constitutions

| Topic | Document | Status |
|---|---|---|
| Reporting UX | [Reporting-UX-Constitution-v1.0.md](./Reporting-UX-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-UX-CONSTITUTION-1) |
| KPI Ownership | [KPI-Ownership-Constitution-v1.0.md](./KPI-Ownership-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-UX-CONSTITUTION-1) |
| Object Model & KPI Lifecycle | [Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md](./Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-UX-CONSTITUTION-EXTENSION-1) |
| Classification & Promotion | [KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md](./KPI-Classification-and-Promotion-Governance-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-UX-CONSTITUTION-EXTENSION-2) |
| Presentation Scope | [KPI-Presentation-Scope-Constitution-v1.0.md](./KPI-Presentation-Scope-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-UX-CONSTITUTION-EXTENSION-3) |
| Executive Eligibility & Governance Metadata | [Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md](./Executive-Eligibility-and-Governance-Metadata-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1) |
| Operational Mirror & Truth Layers | [Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md](./Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md) | Pending Architecture Authority adoption (REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2) |
| Enforcement Framework (final layer) | [Reporting-Constitution-Enforcement-Framework-v1.0.md](./Reporting-Constitution-Enforcement-Framework-v1.0.md) | Pending Architecture Authority adoption (REPORTING-CONSTITUTION-ENFORCEMENT-1) |
| Program package (base) | [REPORTING-UX-CONSTITUTION-1](../../engineering/programs/REPORTING-UX-CONSTITUTION-1/00-PROGRAM-PACKAGE.md) | Governance only |
| Program package (extension 1) | [REPORTING-UX-CONSTITUTION-EXTENSION-1](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-1/00-PROGRAM-PACKAGE.md) | Governance extension only |
| Program package (extension 2) | [REPORTING-UX-CONSTITUTION-EXTENSION-2](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-2/00-PROGRAM-PACKAGE.md) | Governance extension only |
| Program package (extension 3) | [REPORTING-UX-CONSTITUTION-EXTENSION-3](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-3/00-PROGRAM-PACKAGE.md) | Governance extension only |
| Program package (governance metadata) | [REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1](../../engineering/programs/REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1/00-PROGRAM-PACKAGE.md) | Governance extension only |
| Program package (mirror & truth layers) | [REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2](../../engineering/programs/REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2/00-PROGRAM-PACKAGE.md) | Governance constitution only |
| Program package (enforcement) | [REPORTING-CONSTITUTION-ENFORCEMENT-1](../../engineering/programs/REPORTING-CONSTITUTION-ENFORCEMENT-1/00-PROGRAM-PACKAGE.md) | Enforcement only |

Canonical status/version for the above: [Constitution Registry](./Constitution-Registry.md).

Reporting implementations that violate UX-01…UX-07, KPI-01…KPI-10, OBJ-01…OBJ-04, or GOV-01…GOV-16 are Architecture Violations and must not be Production Certified.

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