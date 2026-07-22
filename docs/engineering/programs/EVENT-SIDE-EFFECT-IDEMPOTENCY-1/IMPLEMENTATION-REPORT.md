# EVENT-SIDE-EFFECT-IDEMPOTENCY-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-021 Event Idempotency Governance  
**Related:** EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1 · P10-ORDER-COMPLETION-IDEMPOTENCY-1 · ADR-ARCH-014

---

## Architecture Notes

Transport Ledger `(consumerName, eventId)` is **unchanged** (ADR-014 / Pattern A).

Business protection was added **per ADR-021 §4.2**, not via a single pattern:

| Consumer | Effect | Algorithm step | Pattern | Mechanism |
|----------|--------|----------------|---------|-----------|
| Printing | Side effect | 1d | **A + E** | Print job unique key `order:{orderId}:{eventType}` |
| Notifications (Created) | Side effect | 1d | **A + B** | Durable claim `BizClaim:NotifyNewOrder` / `n:{rid}:{oid}` |
| Notifications (Ready) | Side effect | 1d | **A + D** | Existing `readyPushSentAt` CAS (unchanged) |
| Notifications (cleanup) | Natural | 1e | **A + E** | Delete-all (unchanged) |
| Session Created/Cancelled | Accumulating | 1c | **A + B** | Claims `s:{rid}:{oid}:c` / `:x` |
| P-06 Operational KPI | Accumulating | 1c | **A + B** | Claims `k:{rid}:{oid}:c` and `k:{rid}:{oid}:{from}>{to}`; rebuild seeds canonical path |

Shared primitive: `DurableBusinessClaimStore` (in-memory + Drizzle) reusing `order_domain_consumer_processed` with dedicated namespaces (business keys ≤ varchar(36)).

---

## Per-consumer review

### 1. Printing (`OrderPrintingConsumer` / `OrderPrintDispatchAdapter`)

1. **Current:** `idempotencyKey = order-event:{eventType}:{eventId}`  
2. **Side effect:** Create/dispatch `print_jobs`  
3. **Unsafe why:** Distinct eventIds → distinct keys → duplicate jobs/tickets  
4. **Pattern:** **E** (natural uniqueness) + A  
5. **Why:** Print store already unique on `(restaurantId, idempotencyKey)`; business-scoped key satisfies ADR-021 Pattern E acceptance criteria without a separate claim table  
6. **Change:** Key → `order:{orderId}:{eventType}`  
7. **Verify:** Same key for distinct eventIds → `requestPrint` returns existing job; replay does not create a second job; rebuild of projections does not reprint (jobs not deleted by rollup)

### 2. Notifications (`OrderNotificationConsumer`)

1. **Current:** Unconditional `createNotification` on Created; Ready uses CAS; cleanup deletes  
2. **Side effect:** Owner `new_order` row  
3. **Unsafe why:** Duplicate Created publications insert multiple unread notifications  
4. **Pattern:** **B** for Created; **D** Ready; **E** cleanup  
5. **Why:** Insert has no natural unique key; claim-before-insert is minimal  
6. **Change:** `tryClaim` before `createNotification`  
7. **Verify:** Distinct eventIds → one notification; Ready still CAS-guarded

### 3. Session (`OrderSessionConsumer`)

1. **Current:** Always `recordSessionEvent` + ± aggregates  
2. **Side effect:** Session event log + totalOrders/totalAmount deltas  
3. **Unsafe why:** Duplicate Created/Cancelled inflate/deflate aggregates and duplicate log rows  
4. **Pattern:** **B**  
5. **Why:** Accumulating deltas (ADR-021 1c) require business claim; membership enroll remains E via existing “already enrolled”  
6. **Change:** Claim once per order for create and cancel before side effects  
7. **Verify:** Distinct eventIds → single increment/decrement and single session event

### 4. P-06 (`OperationalKpiProjectionConsumer` / `adjustOperationalKpi`)

1. **Current:** Incremental ± pending/preparing/ready on Created/StatusChanged  
2. **Side effect:** Accumulating daily KPI counters  
3. **Unsafe why:** Same failure class as pre-fix P-10 — distinct eventIds skew counters  
4. **Pattern:** **B** + rebuild seed  
5. **Why:** Accumulating projection; rebuild recount from snapshot then seed created + canonical transitions so replay cannot re-apply  
6. **Change:** Claim Created and each `from>to` transition; `rebuildRollupsForRestaurant` seeds claims  
7. **Verify:** Duplicate delivery, rebuild, replay after rebuild, repeated rebuild — counters stable

---

## Files modified

| File | Change |
|------|--------|
| `server/order/infrastructure/events/consumers/idempotency/DurableBusinessClaimStore.ts` | **Added** — Pattern B store + key helpers + print key helper |
| `server/printing/infrastructure/adapters/OrderPrintDispatchAdapter.ts` | Pattern E business print key |
| `server/order/infrastructure/events/consumers/OrderNotificationConsumer.ts` | Pattern B on Created |
| `server/order/infrastructure/events/consumers/OrderSessionConsumer.ts` | Pattern B on Created/Cancelled |
| `server/order/consumerComposition.ts` | Wire shared Drizzle/in-memory claim store |
| `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` | P-06 claims + rebuild seed |
| `server/order/read/readPersistenceComposition.ts` | Wire `kpiClaims` |
| Tests under consumers / printing / materializers / claim store | Unit coverage |

---

## Validation (tests)

| Scenario | Coverage |
|----------|----------|
| Single delivery | Notification, Session, P-06, Printing |
| Duplicate delivery (distinct eventIds) | All four |
| Replay after rebuild | P-06 |
| Repeated rebuild | P-06 |
| Concurrent duplicate claim | `DurableBusinessClaimStore` (20 parallel tryClaim → 1 win) |
| Transport ledger | Unchanged (not modified) |

Commands:

```text
pnpm exec vitest run \
  server/printing/__tests__/OrderPrintDispatchAdapter.test.ts \
  server/order/infrastructure/events/consumers/__tests__/OrderNotificationConsumer*.test.ts \
  server/order/infrastructure/events/consumers/__tests__/OrderSessionConsumer*.test.ts \
  server/order/infrastructure/events/consumers/idempotency/__tests__/DurableBusinessClaimStore.test.ts \
  server/order/read/projections/materializers/__tests__/OrderReadProjectionMaterializer.p06Idempotency.test.ts
```

**Result:** PASS

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| No duplicate printing under biz-duplicate events | **Yes** (Pattern E) |
| No duplicate Created notifications | **Yes** (Pattern B) |
| No inflated session metrics / event log | **Yes** (Pattern B) |
| No inflated P-06 KPIs; rebuild/replay safe | **Yes** (Pattern B + seed) |
| Transport Ledger unchanged | **Yes** |
| ADR-021 pattern selection (not claim-everywhere) | **Yes** |
| Minimal complexity | Shared claim store; print uses existing unique index |

---

## Out of scope (unchanged)

- P-04 Timeline  
- P-10 OrderCreated residual (separate from this side-effect program; completion already certified)  
- Publisher / outbox redesign  
- Kitchen telemetry  

---

## Production readiness

Deploy the code changes. Existing print jobs with old `order-event:…:eventId` keys remain historical; **new** dispatches use business keys. Optional ops: rebuild P-06 for tenants if live counters were already skewed (BD rollup backfill seeds KPI claims).
