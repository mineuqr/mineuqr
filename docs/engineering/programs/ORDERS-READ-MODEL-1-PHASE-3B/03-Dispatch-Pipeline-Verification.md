# ORDERS-READ-MODEL-1 Phase 3B — Dispatch Pipeline Verification

**Date:** 2026-06-29

---

## Pipeline Stages

```
1. Order Aggregate (command handler)
      ↓ commit + emit domain event
2. DrizzleOutboxRepository (transactional outbox, same TX as order write)
      ↓
3. OrderEventRelay.processBatch()
      ↓ reads pending outbox rows
4. InProcessEventPublisher.publish(envelope)
      ↓ transport-only; metrics only
5. orderEventDispatchDelegate.dispatch(envelope)
      ↓ CompositeEventDispatchDelegate when projections enabled
6a. OrderEventConsumerRegistry.dispatch()     [integration]
6b. OrderProjectionConsumerRegistry.dispatchProjections()  [projections]
      ↓ per-consumer idempotency check (eventId)
7. OrderProjectionConsumer.handle(envelope)
      ↓
8. OrderReadProjectionMaterializer
      ↓ syncOrderProjections / appendTimeline / adjustKpi / adjustAnalytics
9. PersistingOrderReadProjectionRepositories → DrizzleOrderReadProjectionStore
      ↓ upsert
10. order_read_* tables
```

---

## Transition Verification

| Transition | Mechanism | Bypass risk |
|------------|-----------|-------------|
| Aggregate → Outbox | Same transaction in command path | None |
| Outbox → Relay | `runOrderEventRelayBatch()` post-mutation | None |
| Relay → Publisher | `OrderEventRelay` | None |
| Publisher → Registry | `dispatchDelegate.dispatch()` | None |
| Registry → Materializer | Consumer `handle()` | None |
| Materializer → DB | Drizzle upsert | None |

**No synchronous projection updates in command path.** Projections update only via outbox relay.

---

## Feature Flag

| Environment | `orderReadProjectionsEnabled` |
|-------------|-------------------------------|
| `NODE_ENV=test` | `false` (unless `ORDER_READ_PROJECTIONS_ENABLED=true`) |
| dev / production | `true` (unless `ORDER_READ_PROJECTIONS_ENABLED=false`) |

---

## Verdict

**Pipeline verified.** All stages use existing certified infrastructure. No alternate paths introduced.
