# RA-10 — ADR Assessment

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Assessment Method

For each ADR: coverage of Read Side reference architecture, gaps, amendment need, and recommendation.

---

## ADR-ARCH-006 — UI as Presentation Only

| Field | Assessment |
|-------|------------|
| **Coverage** | **Principle-level complete** — mandates server projections, forbids client KPIs |
| **Implementation** | **Not implemented** — `buildOrderStatistics` still in production |
| **Read architecture alignment** | RA-01, RA-03 Q-05/Q-06, RA-08 Phase 3 directly implement this ADR |
| **Amendment required?** | **No** — ADR is sufficient; needs implementation per ORDERS-READ-MODEL-1 |
| **Recommendation** | Mark implementation status → In Progress when ORDERS-READ-MODEL-1 starts; Complete when Phase 3 migration ends |

---

## ADR-ARCH-008 — Order Outbox and Event Relay

| Field | Assessment |
|-------|------------|
| **Coverage** | **Fully covers** projection refresh transport |
| **Implementation** | **Implemented** (ORDER-EVENTS-1A) |
| **Read architecture alignment** | RA-04, RA-07 — projections consume same outbox pipeline |
| **Amendment required?** | **No** |
| **Recommendation** | Reference ADR-ARCH-008 explicitly in projection consumer design docs; no change |

---

## ADR-ARCH-009 — Order Read Models Own Dashboard Analytics

| Field | Assessment |
|-------|------------|
| **Coverage** | **Principle complete** — today/month summaries from server read models |
| **Implementation** | **Not implemented** |
| **Gap** | Does not name specific projections (P-10), queries (Q-06/Q-07), or migration from `order.list` |
| **Amendment required?** | **Minor amendment optional** — add reference to READ-ARCHITECTURE-1 RA-02 P-10 and RA-03 query catalog |
| **Recommendation** | Ratify READ-ARCHITECTURE-1 as implementation blueprint for ADR-ARCH-009; update ADR notes section with program link |

---

## ADR-ARCH-014 — Event Delivery Guarantees

| Field | Assessment |
|-------|------------|
| **Coverage** | **Fully covers** projection consumer idempotency, at-least-once, parallel dispatch |
| **Implementation** | **Implemented** (ORDER-EVENTS-1B) |
| **Gap** | Does not distinguish integration vs projection consumer classes |
| **Amendment required?** | **Minor amendment recommended** — add subsection: "Projection consumers follow same idempotency and isolation rules; must not perform integration side effects" |
| **Recommendation** | Amend ADR-ARCH-014 notes or add non-normative appendix referencing RA-05 and RA-06 |

---

## Related ADRs (Full Review)

| ADR | Read Side Coverage | Status | Recommendation |
|-----|-------------------|--------|----------------|
| **ADR-ARCH-002** SSOT | Covered by projection-only reads | Partial impl | Satisfied when ADR-006/009 implemented |
| **ADR-ARCH-004** Event-Driven Integration | Projection consumers extend event model | Partial | No amendment |
| **ADR-ARCH-012** Kitchen/Print as Consumers | Integration via events; **read models required** for UI | Events only | No amendment — RA-02 P-07/P-08 fulfill read portion |
| **ADR-ARCH-001** Order Core Domain | Read path still violates — migration fixes | Partial | Tracked in RA-08 |
| **ADR-ARCH-011** Optimistic Concurrency | Write side; read shows committed state | Implemented | No read amendment |

---

## New ADR Recommendation

### Proposed: ADR-ARCH-015 — Read Model Architecture

| Field | Proposed content |
|-------|------------------|
| **Status** | Proposed — pending Architecture Authority ratification |
| **Owner** | Architecture Authority |
| **Program** | READ-ARCHITECTURE-1, ORDERS-READ-MODEL-1 |
| **Decision summary** | (1) All owner operational order reads go through projection store. (2) Projection consumers are separate from integration consumers. (3) Query catalog RA-03 is normative for read APIs. (4) Legacy `order.list` deprecated per RA-08. (5) Read model versioning on projection schema. |
| **Why needed** | ADR-ARCH-009 covers analytics only; no single ADR defines full read layer topology, projection catalog, or integration/projection consumer split |
| **Supersedes** | None — complements ADR-ARCH-006, ADR-ARCH-009 |
| **Consequences** | Clear implementation gate; enables ORDERS-READ-MODEL-1 certification |

**Recommendation:** **Ratify ADR-ARCH-015** referencing READ-ARCHITECTURE-1 deliverables as normative appendix.

---

## ADR Coverage Summary

| ADR | Fully covers Read Side? | Action |
|-----|-------------------------|--------|
| ADR-ARCH-006 | Yes (principle) | Implement |
| ADR-ARCH-008 | Yes | None |
| ADR-ARCH-009 | Partial (analytics focus) | Optional note update |
| ADR-ARCH-014 | Mostly | Minor amendment |
| **ADR-ARCH-015** | **Would fully codify** | **Create and ratify** |

---

## ADR Registry Update (Recommended)

After Authority approval:

| ADR | Implementation status change |
|-----|------------------------------|
| ADR-ARCH-006 | Not implemented → Design approved (READ-ARCHITECTURE-1) |
| ADR-ARCH-009 | Not implemented → Design approved (READ-ARCHITECTURE-1) |
| ADR-ARCH-015 | New → Accepted — Ratified |

---

## References

- [ADR Registry](../../constitution/ADR-Registry.md)
- READ-ARCHITECTURE-1 RA-01 through RA-09
- ORDERS-READ-MODEL-1 investigation implementation-readiness.md
