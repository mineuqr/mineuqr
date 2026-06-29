# Architecture Traceability Matrix

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Constitution & Blueprint Traceability

| Architectural Decision | Constitution / Blueprint | READ-ARCHITECTURE-1 Artifact | Investigation Evidence |
|------------------------|--------------------------|------------------------------|------------------------|
| Order Aggregate is SSOT | Constitution; Blueprint §2 | RA-01 — write/read separation | ORDER-1 certified |
| Read models are projections only | Principle 2; Blueprint §11 | RA-02 Projection Catalog | RM-03 |
| No business logic on read side | Principle 4; §14 constraints | RA-05 boundaries | RM-07 BV-R02 |
| UI consumes read models only | ADR-ARCH-006; Blueprint §11 | RA-03 Query Catalog | INV-11, RM-05 |
| Server performs aggregation | ADR-ARCH-009; Principle 6 | P-06, P-10; Q-05–Q-07 | RM-09 SA-01 |
| Purpose-built queries | Principle 7; Blueprint OrderQueryFacade | RA-03 | RM-04 |
| Read/write independent evolution | Principle 8 | RA-01 module topology | RM-01 read/write mixing |
| Consumers produce projections | Principle 9; Blueprint §13 | RA-04, RA-06 | RM-03 gap |
| One production path per capability | Principle 10 | RA-01 production path table | RM-02 |
| Event-driven refresh | ADR-ARCH-008, ADR-ARCH-014 | RA-04, RA-07 | RM-07 |
| Kitchen/print via events + read models | ADR-ARCH-012; Blueprint §12 | P-07, P-08; Q-20, Q-30 | RM-12 |
| Tenant isolation | Quality Attributes | RA-09 SP-01 | RM-11 |
| Deprecate client buildOrderStatistics | ADR-ARCH-009 notes | RA-08 Phase 3 | INV-08, RM-05 |
| Deprecate order.list | Blueprint §11 OwnerOrderList | RA-08 | GAP-R01 |

---

## ADR Traceability

| ADR | Requirement | Design Response | Deliverable |
|-----|-------------|-----------------|-------------|
| ADR-ARCH-006 | No client KPI computation | Q-05, Q-06, Q-07; remove client builders Phase 3 | RA-03, RA-08 |
| ADR-ARCH-008 | Outbox + relay | Projection consumers on same bus | RA-04, RA-07 |
| ADR-ARCH-009 | Server analytics read models | P-10 Analytics Projection | RA-02, RA-03 |
| ADR-ARCH-014 | Idempotent parallel consumers | Projection consumer registration + idempotency | RA-04, RA-05, RA-06 |
| ADR-ARCH-015 (proposed) | Full read architecture | Entire READ-ARCHITECTURE-1 program | RA-01–RA-10 |

---

## Investigation → Design Traceability

### ORDERS-READ-MODEL-1

| Finding ID | Design resolution |
|------------|-------------------|
| BLOCK-R01 No read module | RA-01 `server/order/read/` |
| BLOCK-R02 Client KPIs | P-06, P-10; Q-05–Q-07 |
| BLOCK-R03 No event projections | RA-04 projection consumers |
| BLOCK-R04 Kitchen read | P-07, Q-20 |
| BLOCK-R05 Print read | P-08, Q-30 |
| BLOCK-R06 db.ts coupling | RA-08 migration; RA-05 boundaries |
| GAP-R03 N+1 | RA-09 SP-03; denormalized projections |
| GAP-R04 Unbounded list | Q-01 pagination; P-02 |
| GAP-R08 Metric drift | P-06 glossary; RA-02 P-06 |
| GAP-R12 Polling | RA-07 transitional strategy |
| RR-03 Downstream on legacy | RA-08 program sequencing |

### ORDERS-WORKSPACE-1

| Finding ID | Design resolution |
|------------|-------------------|
| BLOCK-01 ADR-006 | Q-05, Q-06; RA-08 Phase 3 |
| BLOCK-02 ADR-009 | Full query catalog |
| BLOCK-04 Settlement derivation | P-12 server settlementState |
| BLOCK-05 Inconsistent metrics | P-06 canonical; Q-10 sources P-06 |
| GAP-13 No order detail | Q-03 |

---

## Program → Artifact Traceability

| Downstream Program | Depends on READ-ARCHITECTURE-1 |
|--------------------|-------------------------------|
| ORDERS-READ-MODEL-1 | RA-01, RA-02, RA-04, RA-05, RA-06, RA-07, RA-08 Phases 1–2, 4 |
| ORDERS-WORKSPACE-1 | RA-03, RA-08 Phase 3 |
| KITCHEN-DISPLAY-1 | RA-02 P-07, RA-03 Q-20, RA-08 Phase 5 |
| PRINTING-1 | RA-02 P-08, RA-04, RA-08 Phase 5 |
| PRINT-WORKSPACE-1 | RA-03 Q-30 |
| PRINT-CONNECTOR-1 | RA-03 Q-31 |

---

## Principle Compliance Matrix

| # | Principle | RA Document | Compliant by design? |
|---|-----------|-------------|----------------------|
| 1 | Order Aggregate SSOT | RA-01 | Yes |
| 2 | Projections only | RA-02 | Yes |
| 3 | Projections not SSOT | RA-02, RA-05 | Yes |
| 4 | No read-side business logic | RA-05 | Yes |
| 5 | UI reads projections only | RA-03, RA-08 | Yes (post-migration) |
| 6 | Server aggregation | RA-02 P-06/P-10 | Yes |
| 7 | Purpose-built queries | RA-03 | Yes |
| 8 | Independent evolution | RA-01, RA-08 | Yes |
| 9 | Consumers → projections | RA-04, RA-06 | Yes |
| 10 | One path per capability | RA-01, RA-03 | Yes |

---

## Fitness Functions (Read Side — Target)

| ID | Rule | Verified by |
|----|------|-------------|
| FF-R01 | No `trpc.order.list` in client | Migration Phase 4 gate |
| FF-R02 | No `buildOrderStatistics` in client | Phase 3 gate |
| FF-R03 | Order read routers import only `order/read/` | Static import lint |
| FF-R04 | Projection consumers registered in registry | Composition test |
| FF-R05 | Integration consumers do not import projection repositories | Dependency test |

---

## Approval Checklist for Architecture Authority

- [ ] RA-01 layer model approved
- [ ] RA-02 projection catalog complete for Phase 1 scope
- [ ] RA-03 query catalog approved as normative API design
- [ ] RA-04 event mapping approved
- [ ] RA-08 migration phases accepted
- [ ] ADR-ARCH-015 ratification decision
- [ ] ORDERS-READ-MODEL-1 implementation gate issued
