# EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1 — Architecture Audit

**Status:** Audit complete (no implementation)  
**Date:** 2026-07-19  
**Authority:** Chief Software Architect  
**Related:** ADR-ARCH-014, P10-ORDER-COMPLETION-IDEMPOTENCY-1, REPORTING-ORDER-SALES-POST-RESET-FORENSICS-1  
**Method:** Repository code evidence only — not documentation-assumed

---

## 1. Executive Summary

**Can every Event Consumer in MineuQR safely operate under At-Least-Once Delivery without duplicate business effects?**

### Answer: **NO**

### Precise meaning of “safe”

| Duplicate class | Platform coverage today | Verdict |
|-----------------|-------------------------|---------|
| **Same `eventId` redelivery** (relay retry / outbox redelivery of one outbox row) | ADR-ARCH-014 `(consumerName, eventId)` ledger on both integration and projection registries | **YES** — all live consumers skip via `hasProcessed` |
| **Same business fact, distinct `eventId`s** (duplicate publications — the P-10 forensic class) | Only **P-10 completion** has a durable business claim; Ready Push has an order-level claim outside the ledger | **NO** — several consumers remain vulnerable |

P10-ORDER-COMPLETION-IDEMPOTENCY-1 correctly hardened the known financial inflation path. It does **not** generalize safety across the consumer platform.

**Reference finding (forensics):** duplicate `OrderCompleted` rows existed with distinct `eventId`s. EventId-scoped dedupe alone cannot stop that class of inflation for accumulating consumers.

---

## 2. Consumer Inventory

### 2.1 Dispatch topology (evidence)

```
Order mutation → order_domain_outbox
  → OrderEventRelay
  → InProcessEventPublisher
  → CompositeEventDispatchDelegate
       ├─ OrderEventConsumerRegistry          (integration)
       └─ OrderProjectionConsumerRegistry     (if ORDER_READ_PROJECTIONS_ENABLED)
```

Wiring:

- Integration: `server/order/consumerComposition.ts`
- Projection: `server/order/read/readComposition.ts` → `createOrderReadProjectionConsumers`
- Shared ledger table: `order_domain_consumer_processed`
- Official transport key: `(consumerName, eventId)` — ADR-ARCH-014

### 2.2 Live integration consumers (4)

| # | Consumer name | File | Subscribed events | Registration |
|---|---------------|------|-------------------|--------------|
| 1 | `OrderNotificationConsumer` | `server/order/infrastructure/events/consumers/OrderNotificationConsumer.ts` | Created, Ready, Completed, Cancelled | order 10, parallel |
| 2 | `OrderSessionConsumer` | `…/OrderSessionConsumer.ts` | Created, Cancelled | order 20, parallel; gated by `ENV.tableSessionDualWrite` |
| 3 | `OrderKitchenConsumer` | `…/OrderKitchenConsumer.ts` | Created, StatusChanged | order 30, parallel |
| 4 | `OrderPrintingConsumer` | `…/OrderPrintingConsumer.ts` | Created, Ready | order 40, parallel |

### 2.3 Live projection consumers (7)

| # | Consumer name | Projection | File (factory) | Subscribed events | Handler |
|---|---------------|------------|----------------|-------------------|---------|
| 5 | `OwnerOrdersProjectionConsumer` | P-01 | `createOrderReadProjectionConsumers.ts` | Created, StatusChanged, Ready, Completed, Cancelled, LifecycleStageChanged | `syncOrderProjections` |
| 6 | `ActiveOrdersProjectionConsumer` | P-02 | same | same | `syncOrderProjections` |
| 7 | `OrderDetailsProjectionConsumer` | P-03 | same | same | `syncOrderProjections` |
| 8 | `OrderTimelineProjectionConsumer` | P-04 | same | Created, StatusChanged, Ready, Completed, Cancelled | `appendTimeline` |
| 9 | `OperationalKpiProjectionConsumer` | P-06 | same | Created, StatusChanged, Completed, Cancelled, LifecycleStageChanged | `adjustOperationalKpi` |
| 10 | `OrderAnalyticsProjectionConsumer` | P-10 | same | Created, Completed | `adjustAnalytics` |
| 11 | `PublicOrderStatusProjectionConsumer` | P-11 | same | same as P-01 | `syncOrderProjections` |

Shared materializer: `OrderReadProjectionMaterializer.ts`.

### 2.4 Searched areas with **no** Order Domain event consumer

| Area | Evidence |
|------|----------|
| Expo / Pickup / Waiter screens | No `OrderEventConsumer` / `OrderProjectionConsumer` |
| Settlement / Check settlement | P-09 catalog: `consumerName: null`, `subscribedEventTypes: []` — not Order-bus driven |
| Customer Display (dedicated) | No dedicated consumer; closest is P-11 public order status |
| Membership (standalone) | Indirect via Session consumer → `dualWriteEnrollOrderForSession` |
| Reporting API / Dashboard | Read P-06/P-10; not event consumers |

### 2.5 Dormant / catalog-only (not registered)

| Name | Status |
|------|--------|
| `DashboardOverviewProjectionConsumer` (P-05) | Name in lifecycle registry; **not** in `CONSUMER_SPECS` |
| `KitchenQueueProjectionConsumer` (P-07) | `consumerName: null` in catalog |
| `PrintingQueueProjectionConsumer` (P-08) | Catalog lists events; **live print** is integration `OrderPrintingConsumer` |
| P-12 Session Workspace | `consumerName: null` |

### 2.6 Dual paths (not registry consumers)

| Path | Entry | Notes |
|------|--------|-------|
| Order-read backfill | `OrderReadProjectionBackfillService` | Bypasses consumer ledger; uses runId as `lastEventId` |
| BD rollup rebuild | `rebuildRollupsForRestaurant` / rollup backfill CLI | Rebuilds P-06/P-10; seeds P-10 completion markers |
| Category / offer backfill | Separate services | Not Order Domain event consumers |

---

## 3. Idempotency Assessment (per consumer)

Legend for operation kinds: **Pure** / **Accumulating** / **State Transition** / **Projection** / **Materialization** / **Side Effect**.

Classification tags (multi-tag allowed):

| Tag | Meaning |
|-----|---------|
| **A** Naturally Idempotent | Re-application converges / no extra business effect |
| **B** Durable Claim Protected | Business-key claim before effect |
| **C** Version Protected | Aggregate/version / CAS gate |
| **D** Replay Safe | Historical re-drive (same or rebuilt state) remains correct |
| **E** Unsafe | Distinct-`eventId` business duplicates can change effects |

Transport ledger `(consumerName, eventId)` is assumed for all live consumers and is **not** repeated as sufficient business protection.

---

### 3.1 `OrderNotificationConsumer`

| Field | Assessment |
|-------|------------|
| **Operation** | Side Effect |
| **Created** | `createNotification` — unconditional insert (`server/db.ts`) |
| **Ready** | `sendReadyPushForOrder` → `claimReadyPushForOrder` (CAS on `orders.readyPushSentAt IS NULL`) |
| **Completed / Cancelled** | `cleanupPushSubscriptionsForOrder` — delete-all |
| **Duplicate changes state?** | **YES** for `new_order` notifications when distinct `eventId`s. **NO** for Ready push (order claim). **NO** for cleanup (delete is convergent). |
| **Strategy** | eventId ledger + Ready **business claim** + cleanup natural idempotency. **No** business claim for Created. |
| **Replay after rebuild** | N/A rebuild. Replay of **new** eventIds re-inserts notifications. Same eventIds skipped. |
| **Duplicate impacts** | Duplicate owner notifications; duplicate Ready push **prevented**; cleanup noise only |

**Class:** **E** (Created) · **B** (Ready) · **A** (cleanup)

---

### 3.2 `OrderSessionConsumer`

| Field | Assessment |
|-------|------------|
| **Operation** | Accumulating + Side Effect (+ membership dual-write) |
| **Created** | `recordSessionEvent` (always inserts) + `incrementSessionAggregatesForOrder` (`totalOrdersDelta: +1`, amount delta) + `dualWriteEnrollOrderForSession` + `recalculateOpenCheckForSession` |
| **Cancelled** | `decrementSessionAggregatesForCancelledOrder` (deltas) |
| **Duplicate changes state?** | **YES** — session aggregates and session event log inflate/deflate under distinct-`eventId` duplicates. Membership enroll returns `"already"` (natural). Open Check recalculation from Session order money may **self-heal Check totals** while Session rollups remain wrong. |
| **Strategy** | eventId ledger only for consumer; membership natural; **no** once-per-order claim on aggregates |
| **Replay after rebuild** | No Session rebuild from this consumer. Replaying Created with new eventIds re-increments. |
| **Duplicate impacts** | Duplicate session events; inflated/deflated `totalOrders` / `totalAmount`; Check may diverge from Session aggregates until recalculated from orders |

**Class:** **E** (aggregates + session events) · **A** (membership enroll)

---

### 3.3 `OrderKitchenConsumer`

| Field | Assessment |
|-------|------------|
| **Operation** | Pure (telemetry) — code comment: no KDS UI |
| **Business state change?** | **NO** — `opsLog` only |
| **Strategy** | eventId ledger |
| **Replay** | Duplicate ops logs only |
| **Duplicate impacts** | Log noise only — **not** kitchen tickets |

**Class:** **A** (business) · **D** (no material state)

---

### 3.4 `OrderPrintingConsumer`

| Field | Assessment |
|-------|------------|
| **Operation** | Side Effect |
| **Path** | `OrderPrintDispatchAdapter` → `PrintingService.requestPrint` |
| **Print idempotency key** | `order-event:{eventType}:{eventId}` — **includes eventId** |
| **Duplicate changes state?** | **YES** for distinct `eventId`s of the same business Created/Ready — **new print jobs**. Same `eventId` retry: **NO** (job unique key + consumer ledger). |
| **Strategy** | eventId ledger + print-job unique key **scoped to eventId** (not order) |
| **Replay** | New eventIds → new jobs |
| **Duplicate impacts** | Duplicate kitchen/receipt print jobs; duplicate physical tickets |

**Class:** **E** under business-duplicate publication · transport-safe for same eventId

---

### 3.5–3.7 `OwnerOrders` / `ActiveOrders` / `OrderDetails` (P-01 / P-02 / P-03)

| Field | Assessment |
|-------|------------|
| **Operation** | Projection / Materialization (overwrite upsert from write-model source) |
| **Duplicate changes state?** | **NO** for order row content — rematerialize converges. `ensureAssigned` is assign-once allocator (convergent). |
| **Strategy** | eventId ledger + **overwrite** natural idempotency |
| **Replay after rebuild** | **YES** — sync from source remains correct |
| **Duplicate impacts** | Extra work / lastEventId churn only |

**Class:** **A** · **D**

---

### 3.8 `OrderTimelineProjectionConsumer` (P-04)

| Field | Assessment |
|-------|------------|
| **Operation** | Projection (append-shaped upsert keyed by `eventId`) |
| **Storage PK** | `(restaurantId, orderId, eventId)` on `order_read_order_timeline` |
| **Duplicate changes state?** | **YES** under distinct `eventId`s — additional timeline rows for the same business transition. Same eventId: upsert no-op. |
| **Materializer note** | Ready/Completed/Cancelled subscriptions are effectively no-ops in `appendTimeline` (only Created + StatusChanged write). |
| **Strategy** | eventId ledger + PK natural for **same** eventId |
| **Replay after rebuild** | Timeline is **not** fully rebuilt by rollup rebuild (rollup is P-06/P-10). Event replay with new ids adds rows. |
| **Duplicate impacts** | Duplicate timeline rows / history inflation |

**Class:** **E** (business-duplicate StatusChanged/Created) · transport-safe

---

### 3.9 `OperationalKpiProjectionConsumer` (P-06)

| Field | Assessment |
|-------|------------|
| **Operation** | Accumulating Projection |
| **Mutating events in materializer** | `OrderCreated` (+pending), `OrderStatusChanged` (bucket transfer). Completed/Cancelled/Lifecycle subscribed but **no-op** in `adjustOperationalKpi`. |
| **Duplicate changes state?** | **YES** — distinct-`eventId` duplicates skew counters |
| **Strategy** | eventId ledger only — **no** business claim |
| **Replay after rebuild** | Rebuild recounts from current orders (**correct**). Incremental replay of status events **after** rebuild without clearing ledger / without business claims can **re-skew** live counters. |
| **Duplicate impacts** | Duplicate / skewed pending/preparing/ready/active statistics |

**Class:** **E** (incremental) · rebuild path **D** if used as recovery

---

### 3.10 `OrderAnalyticsProjectionConsumer` (P-10)

| Field | Assessment |
|-------|------------|
| **Operation** | Accumulating Projection |
| **Created** | `orderCount += 1` — **eventId ledger only** |
| **Completed** | `tryClaimCompletion` → `P10AnalyticsOrderCompletion` / `c:{restaurantId}:{orderId}` then increment sales/count |
| **Duplicate changes state?** | Completed: **NO** (business claim). Created: **YES** if duplicate `OrderCreated` publications with distinct eventIds. |
| **Strategy** | eventId ledger + **durable business claim** (completion only); rebuild seeds completion markers |
| **Replay after rebuild** | Completion: **YES**. Created increments: still vulnerable to new eventIds. |
| **Duplicate impacts** | Completion inflation **mitigated**. `orderCount` inflation still possible under Created duplicates. |

**Class:** **B** (completion) · **E** (Created path residual) · rebuild **D** for completion stats

---

### 3.11 `PublicOrderStatusProjectionConsumer` (P-11)

Same as P-01 overwrite path when tracking token present.

**Class:** **A** · **D**

---

### 3.12 Pseudo-consumer (idempotency namespace only)

| Name | Role |
|------|------|
| `P10AnalyticsOrderCompletion` | Not a registry consumer; durable business-claim namespace inside P-10 materializer |

---

## 4. Replay Assessment

| Consumer | Same-eventId replay | Distinct-eventId “business” replay | After P-06/P-10 rebuild |
|----------|---------------------|------------------------------------|-------------------------|
| Notification Created | Safe (skip) | Re-notifies | N/A |
| Notification Ready | Safe + claim | Claim blocks | N/A |
| Session aggregates | Safe (skip) | Re-increments | N/A |
| Kitchen | Safe | Log noise | N/A |
| Printing | Safe (skip + job key) | New jobs | N/A |
| P-01/P-02/P-03/P-11 | Safe | Converges | Safe |
| P-04 Timeline | Safe | Extra rows | Not healed by rollup rebuild |
| P-06 KPI | Safe | Re-skews | Healed by rebuild; re-skew if incremental duplicates follow |
| P-10 Analytics | Safe | Completion blocked; Created can inflate | Completion markers seeded; Created residual |

---

## 5. Duplicate Delivery Assessment

### 5.1 What ADR-ARCH-014 actually guarantees

> Each consumer records processed `(consumerName, eventId)` … Duplicate deliveries are skipped.

This is **transport idempotency**, not **business-fact idempotency**.

### 5.2 Impact matrix (distinct-`eventId` business duplicates)

| Impact | Consumers at risk |
|--------|-------------------|
| Duplicate counters / statistics | P-06; P-10 `orderCount` (Created); Session aggregates |
| Duplicate financial sales | ~~P-10 completedSales~~ **mitigated** by P10-ORDER-COMPLETION-IDEMPOTENCY-1 |
| Duplicate rows | P-04 timeline; Session events; Notifications |
| Duplicate notifications | `OrderNotificationConsumer` Created |
| Duplicate printing / kitchen tickets | `OrderPrintingConsumer` (print key embeds eventId) |
| Duplicate kitchen tickets (KDS projection) | **None live** (Kitchen consumer is telemetry; P-07 dormant) |
| Duplicate settlements | **None** on Order bus |
| Duplicate membership rows | **Mitigated** (`enrollOrderInCheck` already/natural) |

---

## 6. Architecture Risks

1. **EventId conflated with business identity**  
   ADR-014 ledger and print keys treat `eventId` as sufficient. Forensic proof shows duplicate publications break that assumption for accumulating / side-effect consumers.

2. **Accumulating projections without business claims**  
   P-06 and P-10 Created still increment on every unclaimed eventId.

3. **Side-effect consumers inherit the same gap**  
   Notifications and Printing are safe for relay retry, unsafe for duplicate publication.

4. **Session money vs Check money asymmetry**  
   Duplicate Session increments can drift Session rollups while Check recalculation from orders may still look correct — silent inconsistency.

5. **Rebuild is not a universal safety net**  
   Rollup rebuild heals P-06/P-10 facts but does not retract notifications, prints, session events, or timeline rows.

6. **Mark-after-handle**  
   Registries mark processed **after** successful `handle` (failure → retry). Correct for at-least-once; amplifies need for handler-level business idempotency.

7. **Dormant projection names**  
   Future Kitchen/Print queue projections must not ship without an approved idempotency pattern.

---

## 7. Consumers Requiring Hardening

Ordered by severity under the proven duplicate-publication failure mode:

| Priority | Consumer | Why |
|----------|----------|-----|
| **P0** | `OperationalKpiProjectionConsumer` (P-06) | Accumulating counters; same failure class as pre-fix P-10 |
| **P0** | `OrderAnalyticsProjectionConsumer` Created path | Residual accumulating gap after completion fix |
| **P0** | `OrderPrintingConsumer` | Physical duplicate tickets; key includes eventId |
| **P1** | `OrderNotificationConsumer` Created | Duplicate owner notifications |
| **P1** | `OrderSessionConsumer` | Inflated session aggregates / event log |
| **P2** | `OrderTimelineProjectionConsumer` | Duplicate history rows |
| **Done** | P-10 Completed | Business claim certified |
| **Watch** | Ready push | Already B (order claim) — keep as reference side-effect pattern |
| **None** | P-01/P-02/P-03/P-11, Kitchen telemetry, cleanup paths | Already A/D for business state |

---

## 8. Gap Analysis Table

| Consumer | Risk | Duplicate Safe* | Replay Safe* | Rebuild Safe | Recommended Fix (audit only) |
|----------|------|-----------------|--------------|--------------|------------------------------|
| OrderNotificationConsumer | **High** | Partial (Ready yes / Created no) | Partial | N/A | Business claim for `new_order` per order (or unique natural key) |
| OrderSessionConsumer | **High** | No | No | N/A | Once-per-order claim before aggregate ±1; session event dedupe by order+type |
| OrderKitchenConsumer | Low | Yes (no biz state) | Yes | N/A | None |
| OrderPrintingConsumer | **Critical** | No (biz-dup) | No | N/A | Print key = business identity e.g. `order:{orderId}:{eventType}` (or claim) |
| OwnerOrders P-01 | None | Yes | Yes | Yes | None |
| ActiveOrders P-02 | None | Yes | Yes | Yes | None |
| OrderDetails P-03 | None | Yes | Yes | Yes | None |
| OrderTimeline P-04 | Medium | No (biz-dup) | Partial | No (rollup) | Dedupe by business transition key or accept + rebuild tooling |
| OperationalKpi P-06 | **Critical** | No | Partial | Yes (rollup) | Business claim / rebuild-only incremental / transition claim |
| OrderAnalytics P-10 | Medium† | Completion yes; Created no | Completion yes | Yes | Extend claim to Created (`orderCount`) or rebuild-only Created |
| PublicOrderStatus P-11 | None | Yes | Yes | Yes | None |
| P10AnalyticsOrderCompletion | — | Yes | Yes | Seeded | Reference pattern |

\*“Safe” = no extra **business** effect under distinct-`eventId` duplicates of the same business fact.  
†Financial completion path certified; Created residual remains.

---

## 9. Reference Architecture — Platform Governance

### 9.1 Should Durable Consumer Claim become the sole platform standard?

**No — not as the only pattern.**

P-10’s `(consumerName, businessKey)` claim is the **reference for accumulating and irreversible side effects**. Overwrite materializations should **not** be forced into claim-per-event noise.

### 9.2 Approved pattern set (recommended governance)

| Pattern | When to use | Example today |
|---------|-------------|---------------|
| **T1 Transport ledger** `(consumerName, eventId)` | All consumers — mandatory (ADR-014) | Both registries |
| **B1 Business durable claim** `(consumerName, businessKey)` | Accumulating stats; once-per-order side effects | P-10 completion; Ready push (order CAS) |
| **N1 Natural / overwrite idempotency** | State projections rematerialized from SSOT | P-01/P-02/P-03/P-11 |
| **N2 Natural unique constraint** | Membership / jobs with business unique keys | Check membership enroll; print jobs **if** key is business-scoped |
| **R1 Rebuild / replace** | Daily rollups recovery | P-06/P-10 rollup rebuild |

### 9.3 Architectural tradeoffs

| Approach | (+) | (−) |
|----------|-----|-----|
| EventId-only (ADR-014 as-is) | Simple; perfect for transport retry | Fails on duplicate publication |
| Business claim everywhere | Strong once-per-fact | Overkill for overwrite projections; key design burden |
| Multi-pattern governance | Fits consumer kinds; matches P-10 lesson | Requires classification discipline + review gates |
| Publisher de-duplication only | Fixes source | Violates “consumers must tolerate duplicates”; still need consumer defense |

**Governance stance:** Keep at-least-once + transport ledger. **Require business idempotency (B1/N1/N2) for any consumer classified Accumulating or Side Effect.** Overwrite projections may rely on N1 + T1.

### 9.4 Whether a new ADR should be introduced

**YES — recommend a new ADR (do not amend quietly).**

Suggested scope (for a future ratified ADR; **not authored in this program**):

- Distinguish **transport idempotency** vs **business-fact idempotency**
- Codify the multi-pattern matrix above
- Adopt P-10 completion claim + Ready Push claim as reference examples
- Require idempotency classification in consumer registration / projection lifecycle catalog
- Explicitly state that `(consumerName, eventId)` alone is **insufficient** for accumulating consumers under duplicate publication

Relation to ADR-ARCH-014: **complement / refine**, not replace outbox or at-least-once.

---

## 10. Success Criteria — Final Answers

| Question | Answer |
|----------|--------|
| Safe under same-`eventId` at-least-once redelivery? | **YES** for all 11 live consumers (ADR-014 ledger). |
| Safe under duplicate business publications (distinct eventIds)? | **NO**. |
| Violating / residual-risk consumers | **P-06**, **P-10 Created**, **Printing**, **Notification Created**, **Session aggregates/events**, **P-04 Timeline**. |
| Already hardened reference | **P-10 Completed** (`c:{restaurantId}:{orderId}`); **Ready Push** (`readyPushSentAt` CAS). |
| Settlement / Expo / Waiter / Kitchen tickets on Order bus? | **No live Order-event consumers** for those effects. |

---

## 11. Explicit Non-Actions (this program)

- No code changes  
- No consumer refactors  
- No new abstractions  
- No ADR text modifications  

Implementation requires separate approved programs per hardening target.

---

## Appendix A — Evidence index

| Evidence | Path |
|----------|------|
| Integration registration | `server/order/consumerComposition.ts` |
| Projection specs | `server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts` |
| Registry eventId skip | `server/order/infrastructure/events/registry/OrderEventConsumerRegistry.ts` |
| Projection idempotency store | `server/order/read/infrastructure/persistence/idempotency/DrizzleProjectionConsumerIdempotencyStore.ts` |
| P-10 business claim | `server/order/read/projections/materializers/p10AnalyticsCompletionIdempotency.ts` |
| KPI / analytics increments | `OrderReadProjectionMaterializer.adjustOperationalKpi` / `adjustAnalytics` |
| Print key | `server/printing/infrastructure/adapters/OrderPrintDispatchAdapter.ts` |
| Ready push claim | `server/db.ts` `claimReadyPushSend` |
| Session increments | `server/diningSession/sessionAggregateWriters.ts` |
| Notification insert | `server/db.ts` `createNotification` |
| Delivery ADR | `docs/architecture/adrs/ADR-ARCH-014.md` |
| Lifecycle catalog | `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` |

## Appendix B — Classification rollup

| Consumer | Tags |
|----------|------|
| OrderNotificationConsumer | E (Created), B (Ready), A (cleanup) |
| OrderSessionConsumer | E |
| OrderKitchenConsumer | A, D |
| OrderPrintingConsumer | E |
| OwnerOrders / Active / Details / Public | A, D |
| OrderTimeline | E |
| OperationalKpi | E (incremental), D (via rebuild) |
| OrderAnalytics | B (Completed), E (Created), D (rebuild completion) |
