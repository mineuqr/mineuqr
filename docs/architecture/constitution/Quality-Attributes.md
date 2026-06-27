# Architectural Quality Attributes

> **Authority:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · Amendment 2
> **Status:** Ratified · Effective 2026-06-27

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

---

**Related:** [North Star](./North-Star.md) · [Blueprint](../blueprints/Order-Centric-Architecture.md) · [ADR Registry](./ADR-Registry.md)