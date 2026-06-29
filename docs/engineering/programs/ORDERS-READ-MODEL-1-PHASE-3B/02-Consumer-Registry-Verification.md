# ORDERS-READ-MODEL-1 Phase 3B — Consumer Registry Verification

**Date:** 2026-06-29

---

## Registry Authority

| Registry | Role | Dispatch owner |
|----------|------|----------------|
| `OrderEventConsumerRegistry` | Integration consumers (notification, session, kitchen, printing) | Yes — integration path |
| `OrderProjectionConsumerRegistry` | Projection consumers (P-01–P-06, P-10, P-11) | Yes — projection path |
| `CompositeEventDispatchDelegate` | Chains both registries | Sole publisher entry point when enabled |

**Publisher (`InProcessEventPublisher`)** delegates only to `orderEventDispatchDelegate` — no consumer list, no ordering logic.

---

## Registered Projection Consumers

| Order | Consumer | Projection |
|-------|----------|------------|
| 10 | `OwnerOrdersProjectionConsumer` | P-01 |
| 20 | `ActiveOrdersProjectionConsumer` | P-02 |
| 30 | `OrderDetailsProjectionConsumer` | P-03 |
| 40 | `OrderTimelineProjectionConsumer` | P-04 |
| 50 | `OperationalKpiProjectionConsumer` | P-06 |
| 60 | `OrderAnalyticsProjectionConsumer` | P-10 |
| 70 | `PublicOrderStatusProjectionConsumer` | P-11 |

Registration: `registerOrderProjectionConsumers()` in `readComposition.ts` at module load.

**Not registered (deferred):** `KitchenQueueProjectionConsumer`, `PrintingQueueProjectionConsumer`.

---

## Verification

| Check | Result |
|-------|--------|
| No manual dispatch outside registry | ✓ |
| No duplicate registration | ✓ |
| No publisher-side consumer list | ✓ |
| Integration + projection independence | ✓ (ORDER-EVENTS-1B R1–R7) |
| Tests: `readComposition.test.ts` | PASS |
| Tests: `OrderProjectionConsumerRegistry.test.ts` | PASS |

---

## Verdict

**Consumer Registry is the sole dispatch authority** for both integration and projection paths.
