# EVENT-PROJECTION-IDEMPOTENCY-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-021 Event Idempotency Governance  
**Related:** EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1 · EVENT-SIDE-EFFECT-IDEMPOTENCY-1 · P10-ORDER-COMPLETION-IDEMPOTENCY-1

---

## Scope

Remaining projection consumers classified **unsafe / residual** by the governance audit:

| Consumer | Class | This program |
|----------|-------|--------------|
| **P-10 Created** (`orderCount`) | Accumulating | **Hardened** |
| **P-04 Timeline** | Append-shaped projection | **Hardened** |
| P-01 / P-02 / P-03 / P-11 | Overwrite (A+C) | Already compliant — unchanged |
| P-06 / side-effects | Covered by EVENT-SIDE-EFFECT-IDEMPOTENCY-1 | Out of scope |

No additional live projection consumers of the accumulating/append class were found beyond P-10 Created and P-04.

---

## Per-consumer review

### P-10 Created (`OrderAnalyticsProjectionConsumer` / `adjustAnalytics`)

| Field | Detail |
|-------|--------|
| **Current behavior** | `orderCount += 1` on every `OrderCreated` with a new transport `eventId` |
| **Projection responsibility** | Daily Order Analytics facts (`order_read_analytics_daily`) |
| **Failure mode** | Duplicate `OrderCreated` publications inflate `orderCount` (and thus daily/monthly aggregates that sum days) |
| **ADR-021 pattern** | **A + B** (accumulating → Durable Business Claim) |
| **Reasoning** | Overwrite cannot apply to counters; same pattern as P-10 completion / P-06 |
| **Implementation** | Claim `BizClaim:P10Created` / `a:{restaurantId}:{orderId}:c` before increment; rebuild seeds claims for every scanned order |
| **Replay safety** | Claimed → no second increment |
| **Rebuild safety** | Recount from orders + seed Created claims → post-rebuild Created is harmless |

### P-04 Timeline (`OrderTimelineProjectionConsumer` / `appendTimeline`)

| Field | Detail |
|-------|--------|
| **Current behavior** | Upsert timeline row keyed by transport `eventId` |
| **Projection responsibility** | Order status history (`order_read_order_timeline`) |
| **Failure mode** | Distinct eventIds for the same Created/transition create duplicate history rows |
| **ADR-021 pattern** | **A + E** (natural uniqueness via business-scoped PK) |
| **Reasoning** | Timeline PK already unique on `eventId`; making `eventId` the **business** identity is Pattern E without a separate claim table. First-write wins for `occurredAt` (Drizzle `onDuplicateKeyUpdate` / matching in-memory merge). |
| **Implementation** | Deterministic ids: `t:{rid}:{oid}:c`, `t:{rid}:{oid}:{from}>{to}`. Transport id kept on `lastEventId`. Rebuild deletes restaurant timeline and rematerializes canonical path from order snapshot. |
| **Replay safety** | Same business id → upsert no-op for payload; ordering preserved |
| **Rebuild safety** | Delete + rematerialize; repeated rebuild converges |

---

## Files modified

| File | Change |
|------|--------|
| `DurableBusinessClaimStore.ts` | `p10Created` namespace, `p10OrderCreatedKey`, timeline business eventId helpers |
| `OrderReadProjectionMaterializer.ts` | P-10 Created claim; P-04 business eventIds; timeline rematerialize on rebuild |
| `ProjectionRepositoryContracts.ts` | `orderTimeline.deleteAllForRestaurant` |
| `InMemoryOrderReadProjectionStore.ts` | Timeline delete-all; first-write-wins upsert merge |
| `DrizzleOrderReadProjectionStore.ts` | `deleteTimelineForRestaurant` |
| `PersistingOrderReadProjectionRepositories.ts` | Wire timeline delete-all |
| `__tests__/…projectionIdempotency.test.ts` | **Added** |
| `__tests__/OrderReadProjectionMaterializer.test.ts` | Fresh materializer per test (claim isolation) |

---

## Validation

| Scenario | Result |
|----------|--------|
| Single delivery | PASS |
| Duplicate delivery (distinct eventIds) | PASS — P-10 count=1; P-04 single row per fact |
| Concurrent duplicate Created | PASS (`Promise.all` on adjustAnalytics) |
| Replay after rebuild | PASS |
| Rebuild / repeated rebuild | PASS |
| Projection rebuild from empty (timeline wipe + rematerialize) | PASS |
| Ordering preserved | PASS (monotonic rebuild timestamps + first-write `occurredAt`) |

Transport Ledger, ADR-014/021 text, event bus, and side-effect consumers were **not** modified.

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| P-10 Created cannot inflate under biz-duplicates | **Yes** |
| P-04 never duplicates history under biz-duplicates | **Yes** |
| Replay / rebuild / repeated rebuild converge | **Yes** |
| Overwrite projections unchanged | **Yes** |
| No regressions outside projection consumers | **Yes** (materializer test isolation fix only) |

---

## Production readiness

Deploy code. Optional: run BD rollup backfill for tenants to seed P-10 Created claims and rematerialize P-04 with business eventIds (clears legacy transport-keyed timeline rows for that restaurant).
