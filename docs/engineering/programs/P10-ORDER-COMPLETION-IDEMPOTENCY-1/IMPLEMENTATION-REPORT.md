# P10-ORDER-COMPLETION-IDEMPOTENCY-1 — Implementation Report

**Status:** Implemented + today’s P-10 rebuilt  
**Date:** 2026-07-19  
**Priority:** P0 — Financial correctness  
**Related:** REPORTING-ORDER-SALES-POST-RESET-FORENSICS-1, REPORTING-ARCHITECTURE-1, ADR-ARCH-001/002/020

---

## Implementation Summary

P-10 Analytics completion processing is now **idempotent per business order**. Duplicate `OrderCompleted` publications (distinct `eventId`s) no longer inflate `completedSales` or `completedOrderCount`.

No Order Domain, publisher, Reporting API, Dashboard, Check, Settlement, or Business Day changes.

Production tenant `720007` Business Day `2026-07-19` was rebuilt:

| Metric | Expected | Actual (post-rebuild) |
|--------|----------|------------------------|
| Order Sales (`completedSales`) | 30.00 SAR | **30.00** |
| Completed Orders | 3 | **3** |
| Order Count | 3 | **3** |

---

## Idempotency Design

At-least-once delivery is preserved platform-wide. Only the P-10 Analytics completion path is hardened.

```
OrderCompleted envelope
  → adjustAnalytics
  → durable tryClaimCompletion(restaurantId, orderId)
       false → update lastEventId only; no sales/count delta
       true  → increment completedOrderCount / completedSales → upsert
```

Claim uses a unique insert into `order_domain_consumer_processed`. Only the first successful claim applies financial deltas (prevents inflation under concurrent / retried delivery).

Rebuild (`rebuildRollupsForRestaurant` / BD rollup backfill) recounts from Order Read served orders, then **seeds** the same durable markers so post-rebuild redelivery cannot re-inflate.

Event-Id consumer dedupe (`OrderAnalyticsProjection` / `order_domain_consumer_processed` by `eventId`) remains unchanged and is **insufficient** alone — forensic duplicates used distinct eventIds.

---

## Idempotency Key Definition

| Field | Value |
|-------|--------|
| Store | `order_domain_consumer_processed` |
| Consumer namespace | `P10AnalyticsOrderCompletion` |
| Key (`eventId` column) | `c:{restaurantId}:{orderId}` |
| Example | `c:720007:5580001` |
| Scope | Business order completion (not process memory, not runtime-only) |
| Survival | Restart, retry, replay, outbox redelivery |

Derived from the business completion identity, not the transport `eventId`.

---

## Files Modified

| File | Change |
|------|--------|
| `server/order/read/projections/materializers/p10AnalyticsCompletionIdempotency.ts` | **Added** — key helper + in-memory / Drizzle stores |
| `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` | Idempotent `adjustAnalytics` completion; seed markers on rebuild; options bag for deps |
| `server/order/read/readPersistenceComposition.ts` | Wire `DrizzleP10AnalyticsCompletionIdempotencyStore` |
| `server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts` | `getAnalyticsDay` for durable day load |
| `server/order/read/infrastructure/persistence/PersistingOrderReadProjectionRepositories.ts` | `getDay` falls back to Drizzle after restart |
| `server/order/read/projections/materializers/__tests__/OrderReadProjectionMaterializer.completionIdempotency.test.ts` | **Added** — single / duplicate / rebuild / replay / repeated rebuild |

---

## Projection Validation

Unit tests (`vitest`):

- Single completion → +1 order, +sales once  
- Duplicate completions (distinct eventIds) → no inflation  
- Three orders × two events each → 30.00 / 3  
- Rebuild then replay completions → unchanged  
- Repeated rebuild → stable  

All 5 new tests + existing materializer suites: **PASS**.

---

## Replay Validation

| Scenario | Result |
|----------|--------|
| Historical rebuild from Order Read served rows | Identical totals |
| Replay `OrderCompleted` after rebuild | No delta (markers seeded) |
| Repeated `rebuildRollupsForRestaurant` | Identical results |

---

## Duplicate Event Validation

| Scenario | Result |
|----------|--------|
| Two `OrderCompleted` for same order, different `eventId` | Second is no-op for sales/count |
| Same `eventId` replayed | No-op (business marker + existing eventId consumer path) |
| Outbox-style redelivery | Harmless to P-10 completion stats |

Other consumers still receive retries; no global suppression.

---

## Analytics Rebuild Report

**CLI:**

```text
ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts \
  --scope tenant --restaurant-id 720007
```

**Run:** `ce4ec63c-26c6-4870-931c-b46f29182a97`  
**Status:** completed  
**Orders scanned:** 3  
**Day keys written:** 1  

**Post-rebuild probe (720007 / 2026-07-19):**

- P-10: `completedSales=30.00`, `completedOrderCount=3`, `orderCount=3`
- Order Read served: 3 × 10.00 SAR
- Markers: `c:720007:5580001`, `c:720007:5580002`, `c:720007:5580003`

Dashboard/Reporting unchanged — they continue to read corrected P-10 DTOs.

---

## Regression Validation

| Check | Status |
|-------|--------|
| Order Domain / publishers | Untouched |
| Order Read entity persistence | Untouched |
| Check / Settlement | Untouched |
| Reporting API / Dashboard | Untouched |
| Business Day resolver | Untouched |
| P-10 OrderCreated path | Unchanged (still incremental) |
| Other projections | Untouched |
| Architectural boundaries (ADR-ARCH-001/002/020) | Preserved |

---

## Production Readiness

1. **Code must be deployed** — markers are only consulted by the new materializer path. Until deploy, a live process on old code can still inflate on new duplicate completions.
2. **Today’s inflated row is already corrected** by the BD rollup rebuild above; markers are seeded for the three served orders.
3. **No migration** — reuses existing `order_domain_consumer_processed`.
4. **Restart-safe** — durable markers + Drizzle `getDay` fallback for incremental adjust after process restart.

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| Duplicate `OrderCompleted` no longer inflates analytics | **Yes** |
| Legitimate single completion increments once | **Yes** |
| Projection replay identical | **Yes** |
| Outbox retries harmless | **Yes** |
| Order Sales = Order Read totals (30 / 3) | **Yes** |
| Dashboard shows corrected values without Dashboard changes | **Yes** |
| No other projection behavior changes | **Yes** |
| No architectural boundary violations | **Yes** |

---

## Final instruction compliance

This program is **projection idempotency hardening only**. Event bus and publisher behavior were not redesigned. The authoritative fix lives in the P-10 Analytics materializer; today’s analytics were rebuilt and reconciled to the canonical Order Read Model after that fix.
