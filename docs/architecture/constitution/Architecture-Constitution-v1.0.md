> **Navigation:** [Architecture Home](../README.md) · [North Star](./North-Star.md) · [Quality Attributes](./Quality-Attributes.md) · [ADR Registry](./ADR-Registry.md) · [Blueprint](../blueprints/Order-Centric-Architecture.md)

# MineuQR 2.0 — Architecture Constitution

**Version:** 1.0.0  
**Status:** Ratified Constitution  
**Effective:** 2026-06-27  
**Authority:** Architecture Authority  
**Supersedes:** All prior architecture drafts, blueprints, and working papers including ARCH-1 Blueprint (content ratified herein)

---

## Constitutional Preamble

MineuQR 2.0 is governed by **Order as the sole Core Domain**. This Constitution ratifies the ARCH-1 architectural blueprint (Part I, §1–17) and establishes **permanent governance** for architecture, engineering, evolution, and compliance (Part II, §18–29).

**Binding hierarchy:** No implementation, program, or code may contradict a higher layer (§18).

**Retired domains:** Printing architecture was permanently retired under RESET-1. Re-entry is permitted only through future implementation programs (PRINTING-1, PRINT-CONNECTOR-1) under §12, §25, and ADR-ARCH-012.

**Constitutional supremacy:** This document is the **supreme architectural authority** of MineuQR 2.0 unless explicitly amended by Architecture Authority through the processes defined in §26–27.

---

## Architecture North Star

*Ratification Amendment 1 — inserted per Architecture Authority review.*

The **Architecture North Star** is the permanent evaluation lens for every architectural decision, ADR, program charter, and engineering review in MineuQR 2.0. If a proposal cannot be justified against the North Star, it must not proceed.

### North Star statement

**MineuQR is an Order-centric restaurant operating platform where operational truth lives in one sovereign domain, surrounding capabilities integrate through explicit contracts and domain events, and the platform grows by adding bounded contexts—not by enlarging Order.**

### Evaluation principles

Every architectural decision is judged against the following permanent principles:

| Principle | Meaning |
|---|---|
| **Order remains the operational center** | Guest placement, lifecycle, lines, and totals are owned exclusively by the Order bounded context. Fulfillment, alerts, analytics, and future print/kitchen capabilities orbit Order—they do not co-own it. |
| **Capabilities are added through bounded contexts** | New product surfaces (kitchen display, print connector, session settlement) arrive as integration or supporting contexts with declared ownership—not as router procedures or UI logic. |
| **Every business rule has one owner** | Lifecycle, pricing-at-create, cancellation, visibility, and commercial gating each have exactly one authoritative module (aggregate, policy, specification, or ACL port). Duplication is a constitutional defect. |
| **Every business object has one authority** | `orders` / `order_items` state is mutated only through the Order production path (§13). Read models, notifications, and projections are derived—not co-authoritative. |
| **Integrations use explicit contracts or domain events** | Cross-context effects publish past-tense domain events after commit (ADR-ARCH-004). Direct cross-table writes and inline side effects in command handlers are forbidden (§14, §19). |
| **Evolve by adding domains, not expanding Order indefinitely** | Order absorbs only order lifecycle and invariants (§25). Print jobs, kitchen queues, session settlement, and analytics facts live elsewhere. |
| **Long-term consistency over short-term convenience** | Structural clarity, compliance gates (§28), and fitness functions (§24) take precedence over expedient coupling in routers, UI, or feature flags. |

### How decisions are evaluated

When reviewing any proposal, Architecture Authority asks:

1. Does it respect Order sovereignty (ADR-ARCH-001, ADR-ARCH-007)?
2. Does it preserve a single source of truth (ADR-ARCH-002)?
3. Does it stay within service ownership boundaries (ADR-ARCH-003)?
4. Does it integrate via events or ACL—not inline orchestration (ADR-ARCH-004, §21)?
5. Does it use the single certified production path (ADR-ARCH-005)?
6. Does it keep business logic out of presentation (ADR-ARCH-006)?
7. Does it comply with governance in ADR-ARCH-013?

Affirmative answers on all applicable questions are required for acceptance.

---

## Architectural Quality Attributes

*Ratification Amendment 2 — new constitutional section.*

Quality attributes define **non-functional permanence**. The architecture preserves them through mechanisms in Part I, governance in Part II, and ADRs—not through ad hoc implementation choices.

### Summary matrix

| Attribute | Primary mechanisms | ADRs | Blueprint |
|---|---|---|---|
| Availability | Stateless API, non-blocking event subscribers, graceful degradation | 004, 005, 008 | §8, §13, §16 |
| Reliability | Outbox, idempotent subscribers, invariant enforcement | 002, 004, 007, 008 | §6, §8, §10 |
| Scalability | Event-driven integration, read models, optional future service split | 004, 012 | §8, §11, §25 |
| Maintainability | Layered packages, ACLs, fitness functions | 001, 003, 013 | §9, §19–21, §24 |
| Extensibility | Domain events, ACL, evolution rules | 004, 012, 013 | §8, §12, §25 |
| Observability | Ops taxonomy, correlation IDs, event audit trail | 004, 008 | §8, §15 |
| Security | Identity ACL, tracking-token capability, tenant isolation | 003, 007 | §6, §12, §21 |
| Performance | Read models, projection async, optimistic concurrency | 008, 011 | §10, §11 |
| Tenant Isolation | Restaurant-scoped aggregates, access specs, slug+token public reads | 002, 003, 007 | §6, §12 |
| Consistency | Aggregate transaction boundaries, SSOT, eventual projection consistency | 002, 007, 010 | §3, §10, §13 |
| Evolvability | Event/contract versioning, ADR governance, bounded context growth | 013, 022 | §22, §25–27 |

---

### Availability

| Field | Content |
|---|---|
| **Definition** | The platform remains usable for guest ordering and owner operations under expected failure modes (subscriber lag, notification failure, DB transient errors). |
| **Why it matters** | Restaurants depend on live order flow; guest checkout cannot fail because a non-critical subscriber failed. |
| **Mechanisms** | Single production path with try/fail isolation at **integration** layer only post-ORDER-1; domain commit succeeds before side effects; health probes on API entry (`createApiApp` pattern); read models may lag without blocking writes. |
| **ADRs** | ADR-ARCH-004, ADR-ARCH-005, ADR-ARCH-008 |
| **Blueprint** | §8 (failure handling), §13 (production path), §16 (risk mitigation) |

---

### Reliability

| Field | Content |
|---|---|
| **Definition** | Order state remains correct and recoverable; events are not lost after commit; duplicate delivery does not corrupt state. |
| **Why it matters** | Financial and operational integrity of orders is the platform’s core trust contract. |
| **Mechanisms** | Order aggregate invariants (§6); transactional outbox (ADR-ARCH-008); idempotent event subscribers (§8); optimistic concurrency (ADR-ARCH-011); drift detection for session aggregates (integration). |
| **ADRs** | ADR-ARCH-002, ADR-ARCH-004, ADR-ARCH-007, ADR-ARCH-008, ADR-ARCH-011 |
| **Blueprint** | §6, §8, §10 |

---

### Scalability

| Field | Content |
|---|---|
| **Definition** | Capacity grows with restaurants, order volume, and integration consumers without redesigning the Order core. |
| **Why it matters** | SaaS longevity requires horizontal scaling of reads and integrations, not monolithic router growth. |
| **Mechanisms** | Read model separation (§11); event-driven subscribers scaled independently; future service extraction via ADR (§25); no COUNT+1 order numbers post-ORDER-1 (sequence allocation §10). |
| **ADRs** | ADR-ARCH-004, ADR-ARCH-012 |
| **Blueprint** | §8, §11, §25 |

---

### Maintainability

| Field | Content |
|---|---|
| **Definition** | Engineers can locate, change, and test business rules without spanning unrelated modules. |
| **Why it matters** | ARCH-1A.1 audit showed router-centric Order logic as the primary maintenance liability. |
| **Mechanisms** | Package architecture (§20); dependency rules (§19); policies isolated in domain (§7); fitness functions (§24); compliance traceability (§28). |
| **ADRs** | ADR-ARCH-001, ADR-ARCH-003, ADR-ARCH-013 |
| **Blueprint** | §7, §9, §19–21 |

---

### Extensibility

| Field | Content |
|---|---|
| **Definition** | New capabilities (kitchen, print, session, analytics) attach without modifying Order invariants. |
| **Why it matters** | RESET-1 proved that embedding print in Order creates retirement cost; extensibility must be structural. |
| **Mechanisms** | Domain events (§8); ACLs (§21); evolution rules (§25); ADR-ARCH-012 consumer pattern. |
| **ADRs** | ADR-ARCH-004, ADR-ARCH-012, ADR-ARCH-013 |
| **Blueprint** | §8, §12, §25 |

---

### Observability

| Field | Content |
|---|---|
| **Definition** | Operators and engineers can trace order lifecycle, integration failures, and compliance violations. |
| **Why it matters** | Event-driven systems require visibility into outbox relay, subscriber failures, and lifecycle transitions. |
| **Mechanisms** | Ops event taxonomy; correlation IDs on requests; domain event audit trail via outbox; activity feed projections (§11); fitness function CI signals (§24). |
| **ADRs** | ADR-ARCH-004, ADR-ARCH-008 |
| **Blueprint** | §8, §11, §15 |

---

### Security

| Field | Content |
|---|---|
| **Definition** | Guest, owner, and platform boundaries are enforced; capabilities are unguessable; PII exposure is minimized. |
| **Why it matters** | Public order creation and tracking are attack surfaces; multi-tenant isolation is mandatory. |
| **Mechanisms** | Tracking token + slug tenant boundary; Identity ACL (§21); no internal IDs in public projections; verified owner procedures; commercial gate separate from auth. |
| **ADRs** | ADR-ARCH-003, ADR-ARCH-007 |
| **Blueprint** | §6 (INV-07, INV-08), §12, §21, §23 |

---

### Performance

| Field | Content |
|---|---|
| **Definition** | Guest checkout and owner status updates meet operational latency expectations under normal load. |
| **Why it matters** | Perceived speed at checkout and kitchen board updates drives product quality. |
| **Mechanisms** | Authoritative pricing in one domain service pass; async projections; polling read models not raw aggregate scans for dashboards (§11); push/notifications off critical path post-commit. |
| **ADRs** | ADR-ARCH-008, ADR-ARCH-009, ADR-ARCH-011 |
| **Blueprint** | §10, §11, §13 |

---

### Tenant Isolation

| Field | Content |
|---|---|
| **Definition** | Each restaurant’s orders, data, and operations are inaccessible to other tenants. |
| **Why it matters** | Multi-tenant SaaS fundamental requirement. |
| **Mechanisms** | `restaurantId` on aggregate root; `assertRestaurantAccess`; public queries scoped by slug; order numbers unique per restaurant not globally. |
| **ADRs** | ADR-ARCH-002, ADR-ARCH-003, ADR-ARCH-007 |
| **Blueprint** | §6 (INV-09), §12 |

---

### Consistency

| Field | Content |
|---|---|
| **Definition** | Order write consistency is strong within aggregate; cross-context views are eventually consistent unless explicitly synchronized by contract. |
| **Why it matters** | Mixing strong and eventual consistency without declaration causes split-brain (session aggregates vs orders). |
| **Mechanisms** | Single transaction per command (§10); outbox atomic with commit (ADR-ARCH-008); session integration via events only (ADR-ARCH-010); no dual-write flags in certified production (§14). |
| **ADRs** | ADR-ARCH-002, ADR-ARCH-007, ADR-ARCH-008, ADR-ARCH-010 |
| **Blueprint** | §3, §10, §13 |

---

### Evolvability

| Field | Content |
|---|---|
| **Definition** | The platform adapts over years via versioned events, ADRs, and new contexts without breaking certified paths. |
| **Why it matters** | Constitution must remain stable while the codebase evolves through programs. |
| **Mechanisms** | Domain versioning strategy (§22); ADR lifecycle (§26); blueprint governance (§27); evolution rules (§25); deprecation policy. |
| **ADRs** | ADR-ARCH-013 |
| **Blueprint** | §22, §25–27 |

---

# Part I — Architecture Foundation (Ratified Blueprint)

*Sections §1–§17 remain authoritative as ratified in ARCH-1. Full specification is binding; this index preserves constitutional traceability.*

| § | Subject | Constitutional status |
|---|---|---|
| §1 | Architecture Vision | Ratified |
| §2 | Domain Landscape | Ratified |
| §3 | Order Aggregate Blueprint | Ratified |
| §4 | Domain Model | Ratified |
| §5 | Order Lifecycle Architecture | Ratified |
| §6 | Business Invariants | Ratified |
| §7 | Policy Architecture | Ratified |
| §8 | Domain Events Architecture | Ratified |
| §9 | Service Architecture | Ratified |
| §10 | Repository Architecture | Ratified |
| §11 | Read Model Architecture | Ratified |
| §12 | Integration Architecture | Ratified |
| §13 | Production Path | Ratified |
| §14 | Architectural Constraints | Ratified |
| §15 | Sequence Diagrams | Ratified |
| §16 | Architectural Risks | Ratified |
| §17 | Architectural Decisions (ADR-ARCH-008 through ADR-ARCH-012 proposals, now ratified — see Registry) | Ratified |

### Part I — binding summaries (non-exhaustive; full ARCH-1 text remains incorporated by reference)

- **§1 Vision:** Order-centric; event-first integration; thin presentation; one production path.
- **§2 Domains:** Order (core); Commercial, Restaurant, Identity (supporting); Notifications, Analytics, Ops (generic); Session, Kitchen, Printing (future integration — Printing retired per RESET-1).
- **§3 Aggregate:** Order root + OrderLine entities; immutable lines post-create; tracking token capability.
- **§5 Lifecycle:** `pending → preparing → ready → served | cancelled`; terminal states final; server-enforced transitions.
- **§8 Events:** OrderCreated, OrderStatusChanged, OrderReady, OrderCompleted, OrderCancelled; outbox after commit.
- **§13 Production path:** Command → Application → Aggregate → Policies → Repository → Commit → Events → Subscribers → Read Models → Presentation.
- **§14 Constraints:** Must/Must Not/Never/Only/Allowed/Forbidden catalogue — binding on all programs.

*Cross-reference validation (Amendment 7): Part I section numbers §1–§17 are contiguous and referenced consistently throughout Part II, Quality Attributes, and ADR Registry.*

---

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

## §29. ADR-ARCH-013 — Architecture Constitution & Governance

*Ratification Amendment 4 — renamed from “Architecture Governance Constitution”.*

| Field | Content |
|---|---|
| **ADR** | ADR-ARCH-013 |
| **Title** | **Architecture Constitution & Governance** |
| **Status** | **Accepted — Ratified** |
| **Problem** | Lack of permanent governance enabled router-centric erosion (ARCH-1A.1 findings). |
| **Context** | RESET-1, ARCH-1A, ARCH-1 blueprint, Order audit complete; ORDER-1 pending. |
| **Decision** | Elevate blueprint to **Architecture Constitution v1.0**; establish hierarchy (§18), dependency rules (§19), packages (§20), ACLs (§21), versioning (§22), errors (§23), fitness functions (§24), evolution (§25), ADR governance (§26), blueprint governance (§27), compliance (§28); North Star and Quality Attributes as constitutional amendments. |
| **Consequences** | (+) Long-lived consistency, measurable compliance, clear evolution path. (−) Documentation overhead, migration from non-compliant baseline via ORDER-1. |
| **Alternatives rejected** | Informal README governance; code-first documentation; premature microservices mandate. |

All references to “Architecture Governance Constitution” in prior drafts are superseded by **Architecture Constitution & Governance**.

---

# Architecture Decision Registry

*Ratification Amendment 3 — authoritative constitutional index.*

| ADR | Title | Status | Owner | Program | Supersedes | Affected Blueprint § | Implementation Status | Notes |
|---|---|---|---|---|---|---|---|---|
| ADR-ARCH-001 | Order as the Core Domain | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §1, §2, §3, §9, §25 | Not implemented | Baseline code non-compliant (router-centric) |
| ADR-ARCH-002 | Single Source of Truth | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §6, §10, §11, §13 | Partial | Server pricing authoritative; client KPIs violate until ORDER-1 |
| ADR-ARCH-003 | Service Ownership Boundaries | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §2, §6, §12, §21 | Partial | Inline notification/session coupling violates |
| ADR-ARCH-004 | Event-Driven Domain Integration | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDER-EVENTS-1 | — | §8, §12, §13, §15 | Not implemented | Sync side effects in current router |
| ADR-ARCH-005 | Production Path Authority | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §13, §14 | Partial | `TABLE_SESSION_DUAL_WRITE` divergent path |
| ADR-ARCH-006 | UI as Presentation Only | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDERS-WORKSPACE-1 | — | §11, §14 | Not implemented | Dashboard computes statistics client-side |
| ADR-ARCH-007 | Order Aggregate Authority | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §3–§7, §10 | Not implemented | No aggregate module; db direct mutation |
| ADR-ARCH-008 | Order Outbox and Event Relay | **Accepted — Ratified** | Architecture Authority | ORDER-EVENTS-1 | — | §8, §10, §15 | Not implemented | Proposed in ARCH-1; ratified with Constitution |
| ADR-ARCH-009 | Order Read Models Own Dashboard Analytics | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDERS-WORKSPACE-1 | — | §11, §14 | Not implemented | Replaces client `buildOrderStatistics` |
| ADR-ARCH-010 | Session Integration via Order Events Only | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDER-EVENTS-1 | — | §8, §12, §15 | Not implemented | Retire inline session aggregate writes |
| ADR-ARCH-011 | Optimistic Concurrency on Order Root | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §10, §23 | Not implemented | Prevent lost updates on status |
| ADR-ARCH-012 | Printing and Kitchen as Event Consumers | **Accepted — Ratified** | Architecture Authority | KITCHEN-DISPLAY-1, PRINTING-1 | — | §2, §12, §15 | N/A (future) | RESET-1 retired print; re-entry via events only |
| ADR-ARCH-013 | **Architecture Constitution & Governance** | **Accepted — Ratified** | Architecture Authority | Constitution v1.0 | — | §18–29, entire Constitution | **Implemented (governance)** | This document; engineering compliance pending ORDER-1 |

**Registry maintenance:** Principal Engineer updates Implementation Status at program exit certification. Status changes require Architecture Authority approval per §26.

---

# Document Control

*Ratification Amendments 5 & 7.*

| Field | Value |
|---|---|
| **Document title** | MineuQR 2.0 Architecture Constitution |
| **Version** | **1.0.0** |
| **Status** | **Ratified Constitution** |
| **Effective date** | 2026-06-27 |
| **Ratifies** | ARCH-1 Blueprint Part I (§1–§17); ARCH-1A foundation; RESET-1 baseline |
| **Governance framework** | ADR-ARCH-013 Architecture Constitution & Governance |
| **Next authorized program** | **ORDER-1** |
| **Amendment process** | Blueprint Amendment Request (§27) + Architecture Authority approval |
| **Cross-reference validation** | **PASS** — see below |

### Cross-reference validation certificate (Amendment 7)

| Check | Result |
|---|---|
| Part I sections §1–§17 referenced consistently | ✓ |
| Part II sections §18–§29 numbering contiguous | ✓ |
| North Star & Quality Attributes reference ADRs and Blueprint § | ✓ |
| ADR Registry complete (001–013) | ✓ |
| ADR-ARCH-013 rename applied throughout | ✓ |
| ADR-ARCH-008–012 status elevated to Ratified with Constitution | ✓ |
| Diagram hierarchy (§18) aligns with §19 layers | ✓ |
| Program references (ORDER-1, ORDER-EVENTS-1, etc.) consistent with §12, §25, Registry | ✓ |
| RESET-1 printing retirement consistent in Preamble, §2, §12, FF-18, ADR-012 | ✓ |
| No “proposed” / “draft” / “working draft” remains in document control | ✓ |

---

# Architecture Authority Ratification

*Ratification Amendment 6 — final constitutional page.*

---

## Architecture Authority Decision

**APPROVED AND RATIFIED**

The Architecture Authority has reviewed the MineuQR 2.0 Architecture Constitution, including:

- Part I — Architecture Foundation (§1–§17)
- Part II — Governance & Evolution (§18–§29)
- Architecture North Star
- Architectural Quality Attributes
- Architecture Decision Registry
- ADR-ARCH-013 Architecture Constitution & Governance

The Constitution is judged **architecturally sound**. No redesign is required before ORDER-1. Amendments 1–7 are incorporated. This document is the **supreme architectural authority** of MineuQR 2.0 unless future Architecture Authority action explicitly amends it under §26–§27.

---

## Ratification Record

| Field | Value |
|---|---|
| **Ratification date** | 2026-06-27 |
| **Constitution version** | **1.0.0** |
| **Effective date** | 2026-06-27 |
| **Governance status** | **Active — Ratified Constitution** |

### Ratified ADRs

ADR-ARCH-001, ADR-ARCH-002, ADR-ARCH-003, ADR-ARCH-004, ADR-ARCH-005, ADR-ARCH-006, ADR-ARCH-007, ADR-ARCH-008, ADR-ARCH-009, ADR-ARCH-010, ADR-ARCH-011, ADR-ARCH-012, **ADR-ARCH-013 (Architecture Constitution & Governance)**

### Next authorized program

**ORDER-1** — Order domain extraction, aggregate, policies, repository, and production path compliance per Part I and §28.

---

## Certification Statement

By authority of Architecture Authority ratification, **MineuQR 2.0 Architecture Constitution v1.0** is hereby certified as the **permanent governing authority** for all architectural decisions, implementation programs, ADRs, engineering reviews, and compliance verification on this platform.

No implementation program may certify exit without demonstrating compliance with this Constitution (§28).

No architectural redesign is authorized by this ratification except through future **Accepted** ADRs and Constitution amendments per §26–§27.

---

**END OF CONSTITUTION v1.0.0 — RATIFIED**

*Published to repository under ARCH-CONSTITUTION-1. Engineering implementation begins only under ORDER-1 charter and [§28 Compliance](./Compliance.md).*

**See also:** [North Star](./North-Star.md) · [Quality Attributes](./Quality-Attributes.md) · [Governance](./Governance.md) · [Compliance](./Compliance.md) · [ADR Registry](./ADR-Registry.md)

[REDACTED]