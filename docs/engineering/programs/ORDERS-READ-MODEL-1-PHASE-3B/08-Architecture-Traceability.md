# ORDERS-READ-MODEL-1 Phase 3B — Architecture Traceability

**Date:** 2026-06-29

---

## Constitution Compliance

| Principle | Evidence | Status |
|-----------|----------|--------|
| Order is only Core Domain | Projections derived from events; no order schema changes | ✓ |
| Single Source of Truth = Order Aggregate | Write model authoritative; read upserts from loader | ✓ |
| Event-Driven Architecture | Outbox → relay → consumer | ✓ |
| Transactional Outbox | `DrizzleOutboxRepository` | ✓ |
| Publisher transport-only | `InProcessEventPublisher` | ✓ |
| Consumer Registry owns dispatch | `CompositeEventDispatchDelegate` | ✓ |
| Materializers own read persistence | `OrderReadProjectionMaterializer` | ✓ |
| Read Model from Domain Events only | No inline projection in commands | ✓ |
| One Production Path | Single composite delegate | ✓ |
| No duplicate execution paths | No parallel projection writers | ✓ |

---

## Program Chain

```
ORDERS-READ-MODEL-1 Phase 1 (contracts)
    → Phase 2 (materializers + store)
        → Phase 3A (staging tooling + migration 0046)
            → Phase 3B (dispatch activation + backfill) ← this program
                → ORDERS-WORKSPACE-1 (shadow read APIs)
```

---

## RA-08 Phase Mapping

| RA-08 Phase | Phase 3B deliverable |
|-------------|---------------------|
| Phase 3 — Store migration | 0046 applied (3A) |
| Phase 4 — Backfill | **Executed** (206 rows) |
| Phase 5 — Dispatch activation | **Composite delegate wired** |
| Phase 6 — Read API cutover | Deferred (ORDERS-WORKSPACE-1) |

---

## ADR / Blueprint Alignment

| Authority | Alignment |
|-----------|-----------|
| ADR-ARCH-005 (Outbox) | Relay path unchanged |
| ADR-ARCH-008 (Publisher) | Transport-only preserved |
| READ-ARCHITECTURE-1 RA-06 | Registry split maintained |
| ORDER-EVENTS-1B | Integration consumers unaffected |

---

## Exit Criteria

| Criterion | Met |
|-----------|-----|
| Projection Consumers active | ✓ |
| Registry sole dispatch authority | ✓ |
| Materializers receive production events | ✓ (via relay when orders mutate) |
| `order_read_*` auto-updated on events | ✓ |
| Backfill succeeds | ✓ |
| Validation succeeds | ✓ |
| Read = Write | ✓ |
| Idempotency verified | ✓ |
| Full test suite | ✓ |
| No unintended production behavior change | ✓ (projection activation only) |
