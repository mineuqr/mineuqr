# ADR-ARCH-021: Event Idempotency Governance

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | EVENT-IDEMPOTENCY-GOVERNANCE-ADR-1 |
| **Date** | 2026-07-22 |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-014](./ADR-ARCH-014.md) (transport delivery + eventId ledger remain mandatory; this ADR adds **business-fact** idempotency governance) |
| **Related ADRs** | ADR-ARCH-004 · ADR-ARCH-008 · ADR-ARCH-010 · ADR-ARCH-012 · ADR-ARCH-014 |
| **Related programs** | ORDER-EVENTS-1B · P10-ORDER-COMPLETION-IDEMPOTENCY-1 · EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1 |
| **Implementation status** | **Partial** — Transport Ledger is platform-wide (ADR-014). Durable Business Claim is production-certified for P-10 Order completion. Remaining consumer categories require separate hardening programs; this ADR does not authorize runtime changes. |

---

## 1. Purpose

This ADR defines the **official Event Idempotency Governance** for MineuQR.

It answers, without tribal knowledge:

> **When implementing a new Event Consumer, how do engineers select the correct idempotency strategy?**

ADR-ARCH-014 remains the authority for **at-least-once delivery** and the **transport ledger** `(consumerName, eventId)`.  
This ADR is the authority for **which additional idempotency pattern** a consumer must use so that **duplicate business facts** cannot produce duplicate business effects.

---

## 2. Scope

### In scope

- All **Integration Consumers** registered in `OrderEventConsumerRegistry`
- All **Projection Consumers** registered in `OrderProjectionConsumerRegistry`
- Future Order Domain event consumers (Kitchen queue, Print queue, Reporting side-effects, Settlement enrollment, Membership, channel integrations)
- Replay, rebuild, backfill, duplicate delivery, and out-of-order handling **as they relate to consumer idempotency**
- Classification of consumer effects (projection, accumulation, side effect, etc.)

### Out of scope

- Changing publisher / outbox / relay behavior
- Requiring every consumer to use Durable Business Claims
- Introducing a new framework or shared library in this ADR
- Implementing hardening for existing unsafe consumers (separate programs)
- Non–Order Domain event buses (unless they later adopt this governance by citation)

---

## 3. Definitions

| Term | Definition |
|------|------------|
| **Transport Idempotency** | Processing the **same envelope `eventId`** more than once does not re-execute consumer work. Achieved by the durable ledger `(consumerName, eventId)` in `order_domain_consumer_processed` (ADR-ARCH-014). |
| **Business Idempotency** | Applying the **same business fact** more than once (even with **distinct `eventId`s**) does not produce an additional business effect. Requires a pattern beyond the transport ledger when the handler accumulates or emits irreversible side effects. |
| **Replay Safety** | Re-driving historical events against a consumer leaves persisted business outcomes **correct and unchanged** relative to the intended once-applied result (no inflation, no duplicate side effects). |
| **Rebuild Safety** | A replace/recount operation from an authoritative source (e.g. Order Read / write model) produces correct projection facts **without** requiring a full event replay; subsequent event delivery must not re-inflate those facts. |
| **Side Effect** | An irreversible or externally visible action: notification insert, push send, print job, email, third-party call, physical ticket. |
| **Materialization** | Building or refreshing a read-model row from an authoritative source snapshot (typically Order write/read context). |
| **Projection** | A derived read model updated by events and/or rebuild; may be overwrite-shaped or accumulating. |
| **Integration Consumer** | A consumer on the Order event bus that performs operational/integration work (notify, session, print, kitchen telemetry), not an Order Read projection id. |
| **Projection Consumer** | A consumer bound to an Order Read projection id (P-01…P-12 catalog) that updates projection stores. |
| **Business Key** | A durable identifier of the **business fact** being applied (e.g. `c:{restaurantId}:{orderId}` for one Order completion), independent of transport `eventId`. |
| **Duplicate Delivery (transport)** | Relay/outbox redelivery of the **same** `eventId`. |
| **Duplicate Publication (business)** | Two or more envelopes with **different** `eventId`s representing the **same** business fact (certified failure mode in P-10 forensics). |

**Constitutional rule:** Transport Idempotency ≠ Business Idempotency. Satisfying ADR-ARCH-014 alone does **not** prove business safety.

---

## 4. Decision

### 4.1 Platform stance

1. The platform **SHALL** continue to guarantee **at-least-once** delivery (ADR-ARCH-014).
2. Every live consumer **SHALL** participate in the **Transport Ledger** (Pattern A).
3. Every consumer **SHALL** be classified by effect type (Decision Matrix §6).
4. Accumulating and irreversible side-effect consumers **SHALL** implement an approved **business** pattern (B, D, or E) in addition to Pattern A.
5. Overwrite materialization consumers **MAY** rely on Pattern A + Pattern C without a business claim.
6. Durable Business Claim is **not** mandatory for all consumers.
7. Publisher de-duplication is **not** a substitute for consumer business idempotency.

### 4.2 Selection algorithm (mandatory — no interpretation)

Engineers **SHALL** select the strategy by executing these steps **in order**. The first matching branch wins.

```
STEP 0 — Mandatory base
  Apply Pattern A (Transport Ledger) for every consumer.
  If the consumer is not registered with (consumerName, eventId) processing, REJECT.

STEP 1 — Classify the primary effect of handle()
  Ask: “If the same business fact arrived again with a NEW eventId, what happens?”

  1a. Effect is Pure / telemetry only (no persisted business state, no external action)
        → Pattern A only. STOP.

  1b. Effect is Overwrite Materialization / state projection from SSOT snapshot
        (upsert current order/status/details from source; last write converges)
        → Pattern A + Pattern C. STOP.

  1c. Effect is Accumulating (counters, sums, deltas, append-only stats)
        → Pattern A + Pattern B (Durable Business Claim) is REQUIRED.
          Optional: Pattern D if a version/CAS gate is the claim mechanism.
          Rebuild (Pattern R in §7) MAY be used for recovery but MUST NOT
          replace Pattern B for live incremental accumulation.
        STOP.

  1d. Effect is irreversible Side Effect (notify, print, push, webhook, email)
        → Pattern A + ONE of:
             Pattern B (business claim before effect), OR
             Pattern D (CAS / version guard on the affected entity), OR
             Pattern E (natural uniqueness that prevents a second effect)
          STOP.
          If none of B/D/E can be proven → REJECT design.

  1e. Effect is Natural / constraint-guarded enrollment (unique membership, etc.)
        → Pattern A + Pattern E (prove acceptance criteria in §5.E). STOP.

  1f. Unclassified / mixed effects
        → Split handlers OR apply the STRICTEST pattern required by any sub-effect
          (Accumulating or Side Effect rules win over Overwrite). STOP.
```

**Pass/fail test (required in design review):**

> Under duplicate publication of the same business fact with distinct `eventId`s, does persisted business state or an external side effect change more than once?  
> **If YES → non-compliant.**

---

## 5. Supported Idempotency Patterns

### A. Transport Ledger `(consumerName, eventId)`

| | |
|--|--|
| **Purpose** | Make relay retry and same-envelope redelivery harmless. |
| **Mechanism** | Durable row in `order_domain_consumer_processed`; registry skips when `hasProcessed(consumerName, eventId)`. Mark after successful `handle`. |
| **Strengths** | Universal; simple; correct for transport duplicates; already platform-wide. |
| **Limitations** | **Does not** protect against duplicate publications with new `eventId`s. Insufficient alone for accumulating or irreversible side effects. |
| **Mandatory?** | **Yes** for every consumer. |

### B. Durable Business Claim

| | |
|--|--|
| **Purpose** | Apply a business fact **at most once**, regardless of how many envelopes represent it. |
| **Mechanism** | Durable claim keyed by `(consumerName, businessKey)` (may reuse `order_domain_consumer_processed` with a dedicated consumer namespace, or an equivalent durable store). Claim **before** applying the effect; only the first successful claim applies deltas/side effects. |
| **Business Key** | Derived from the **business fact**, not transport identity. Examples: `c:{restaurantId}:{orderId}` (one Order completion); `order:{orderId}:OrderCreated` (one Created side effect); print `order:{orderId}:{eventType}`. Keys MUST be stable across restart, retry, replay, and outbox redelivery. |
| **Strengths** | Correct under the certified duplicate-publication failure mode; restart-safe; replay-safe when claims are seeded on rebuild. |
| **Limitations** | Requires careful key design; claim-then-fail can under-apply until rebuild/ops recovery; not needed for pure overwrite projections. |
| **Suitable consumers** | Analytics counters; KPI increments; once-per-order notifications; once-per-order print intents; any accumulating handler. |
| **Reference** | P10-ORDER-COMPLETION-IDEMPOTENCY-1 — namespace `P10AnalyticsOrderCompletion`, key `c:{restaurantId}:{orderId}`. |

### C. Overwrite Materialization

| | |
|--|--|
| **Purpose** | Keep a read model equal to the current authoritative Order (or source) snapshot. |
| **Mechanism** | Load source → upsert projection row(s). Repeated application converges. |
| **Suitable consumers** | Owner Orders (P-01), Active Orders (P-02), Order Details (P-03), Public Order Status (P-11), future overwrite operational read models. |
| **Tradeoffs** | Safe for state convergence; does **not** fix accumulating siblings; `lastEventId` may churn under duplicates without business harm. |
| **With Pattern A** | Required. |

### D. Compare-and-Set / Version Guard

| | |
|--|--|
| **Purpose** | Allow an effect only when entity state matches an expected precondition. |
| **Mechanism** | Conditional update (e.g. `WHERE readyPushSentAt IS NULL`); success = claim acquired. |
| **Suitable consumers** | Ready push send; future once-per-status external actions; optimistic concurrency–gated effects (ADR-ARCH-011 related). |
| **Tradeoffs** | Excellent for entity-tied side effects; may not fit pure aggregate counters without a claim row; must define release/compensation if effect fails after claim. |
| **Reference** | `claimReadyPushSend` on Order (`readyPushSentAt`). |

### E. Natural Idempotency

| | |
|--|--|
| **Definition** | Re-application is a no-op because of domain rules or unique constraints, without a separate claim table. |
| **Acceptance criteria (all required)** | (1) Second apply cannot insert a second logical row or second external action; (2) proven by unique key, “already enrolled” return, or delete-all convergence; (3) documented in the consumer checklist; (4) still uses Pattern A. |
| **Suitable consumers** | Check membership enroll (already enrolled); push subscription cleanup (delete-all); pure telemetry; unique job rows **when the unique key is business-scoped** (not eventId-scoped). |
| **Non-examples** | Print jobs keyed by `order-event:{eventType}:{eventId}` — unique per eventId, **not** natural business idempotency. Notification inserts without a business unique key. |

---

## 6. Consumer Decision Matrix

Approved pattern(s) by **category**. Pattern A is always included.

| Category | Effect class | Approved pattern(s) | Notes |
|----------|--------------|---------------------|-------|
| **Operational Read Model** (overwrite) | Materialization | **A + C** | P-01, P-02, P-03, P-11 |
| **Projection — timeline / append-shaped** | Accumulating history | **A + B** (or business-unique PK equivalent to B) | Distinct eventIds must not create duplicate business transitions |
| **Analytics Counter** (completed sales, order counts) | Accumulating | **A + B** | P-10 completion = certified B; Created path must follow B if incremental |
| **Operational KPI counters** | Accumulating | **A + B** | Live incremental without B is non-compliant |
| **Reporting** (DTO readers) | None (not consumers) | N/A | Reporting reads projections; no Order-bus handler |
| **Notification** (owner alerts) | Side Effect | **A + B or E** | Ready push may use **A + D**; Created notify must not rely on A alone |
| **Printing** | Side Effect | **A + B or E** | Idempotency key MUST be business-scoped (order + event type), not eventId |
| **Kitchen** (telemetry) | Pure | **A** | Until a KDS queue projection exists |
| **Kitchen** (future queue projection) | Projection / Side Effect | **A + C** and/or **A + B** per effect | Catalog P-07 must pass checklist before registration |
| **Session / visit aggregates** | Accumulating | **A + B** | Membership dual-write may be **A + E** separately |
| **Membership** | Natural enroll | **A + E** | Unique / already-enrolled semantics required |
| **Settlement** | Not Order-bus today | N/A on Order bus | If introduced: treat money side effects as **A + B or D**; never accumulate tenders on eventId alone |
| **Future Integrations** | Unknown | Run §4.2 algorithm | Strictest applicable pattern; design review required |

### Live consumer mapping (audit cross-check)

| Live consumer | Category | Compliant pattern today | Gap (governance; not this ADR’s implementation) |
|---------------|----------|-------------------------|--------------------------------------------------|
| OwnerOrders / Active / Details / Public | Operational Read Model | A + C | None |
| OrderTimeline | Timeline | A only (+ eventId PK) | Needs B/business transition key for biz-duplicates |
| OperationalKpi | KPI counters | A only | Needs B |
| OrderAnalytics | Analytics | A + B (Completed); Created incomplete | Extend B to Created or stop incremental Created |
| OrderNotification | Notification | A; Ready uses D | Created needs B/E |
| OrderPrinting | Printing | A + eventId-scoped job key | Job key must become business-scoped (B/E) |
| OrderSession | Session aggregates | A only | Needs B for ± aggregates / session events |
| OrderKitchen | Kitchen telemetry | A | None for current telemetry scope |

---

## 7. Replay, Rebuild, Backfill, Duplicate, Out-of-Order Governance

| Concern | Requirement |
|---------|-------------|
| **Duplicate Delivery (same eventId)** | Pattern A MUST skip. No additional business effect. |
| **Duplicate Publication (distinct eventIds, same business fact)** | Patterns B/D/E (as selected) MUST prevent a second business effect. Pattern A alone is insufficient. |
| **Replay** | Replaying envelopes MUST leave business outcomes identical to once-applied. Accumulating/side-effect consumers MUST have claims or natural guards; overwrite consumers MUST converge. |
| **Rebuild** | Rollup/rebuild from SSOT is an approved **recovery** path for daily facts (P-06/P-10). After rebuild of accumulating projections that use Pattern B, **claims MUST be seeded** for already-applied facts so live duplicates cannot re-inflate. Rebuild does **not** retract notifications/prints already emitted. |
| **Backfill** | Backfill MAY bypass the live consumer ledger when it rematerializes from source (Pattern C) or replaces rollups. Backfill MUST NOT re-fire irreversible side effects unless guarded by B/D/E. |
| **Out-of-order Delivery** | Overwrite materialization (C) MUST tolerate out-of-order by reading current source state, not by trusting event payload order alone for final state. Accumulating handlers MUST use business keys that do not assume global total order. Status-bucket KPIs that assume ordered transitions SHOULD prefer rebuild recovery or transition claims; they MUST NOT assume perfect order under at-least-once. |

---

## 8. Future Consumer Checklist (mandatory)

Every new or materially changed Event Consumer **SHALL** answer all items in design review / PR. Incomplete checklists **block** merge.

1. **Consumer name** and registry (integration vs projection)?  
2. **Subscribed event types**?  
3. **Primary effect class** (Pure / Overwrite / Accumulating / Side Effect / Natural)?  
4. **Can duplicate delivery (same eventId) change business state?** (Must be **No** via Pattern A.)  
5. **Can duplicate publication (new eventId, same business fact) change business state?** (Must be **No** via B/D/E or proven C/E.)  
6. **Does replay change persisted data beyond convergence / no-op?**  
7. **Can rebuild safely recover facts?** If yes, are Pattern B claims seeded?  
8. **Is a business key required?** If yes, state the exact key format.  
9. **Which approved pattern(s) are used?** (Must cite A + … from §5.)  
10. **Side effects inventory** (notify / print / push / external / none)?  
11. **Out-of-order behavior** documented?  
12. **§4.2 selection algorithm step that applied?** (e.g. “1c → A+B”)

---

## 9. Examples

### Example 1 — Overwrite projection (compliant)

**Consumer:** Owner Orders (P-01)  
**Algorithm:** Step 1b → **A + C**  
**Behavior:** `syncOrderProjections` upserts from source. Distinct eventIds rematerialize the same order row.

### Example 2 — Accumulating analytics completion (compliant reference)

**Consumer:** Order Analytics (P-10) on `OrderCompleted`  
**Algorithm:** Step 1c → **A + B**  
**Business key:** `c:{restaurantId}:{orderId}` under namespace `P10AnalyticsOrderCompletion`  
**Behavior:** Only first claim increments `completedSales` / `completedOrderCount`. Rebuild seeds claims.

### Example 3 — Side effect with CAS (compliant reference)

**Consumer:** Notification Ready path  
**Algorithm:** Step 1d → **A + D**  
**Behavior:** `claimReadyPushSend` sets `readyPushSentAt` only when null; second delivery skips send.

### Example 4 — Side effect with eventId-scoped print key (non-compliant under this ADR)

**Consumer:** Printing with key `order-event:{eventType}:{eventId}`  
**Algorithm:** Step 1d fails Pattern E (unique key is not business-scoped) and lacks B/D  
**Required direction:** Business-scoped key or durable claim (separate implementation program).

### Example 5 — Pure telemetry (compliant)

**Consumer:** Kitchen ops log only  
**Algorithm:** Step 1a → **A**

---

## 10. Consequences

### Positive

- Unambiguous consumer design rule; no tribal knowledge  
- Aligns platform with certified P-10 / Ready-push lessons  
- Preserves ADR-014 at-least-once model without forcing claims on overwrite projections  
- Gives Architecture Authority a merge gate (checklist)

### Negative / costs

- Existing accumulating and some side-effect consumers are **governance-noncompliant** until hardened  
- Engineers must design business keys carefully  
- Claim-after-partial-failure needs ops/rebuild playbooks  

### Neutral

- This ADR does **not** change runtime by itself  
- ADR-014 transport semantics unchanged  

---

## 11. Migration Guidance

1. **Do not** big-bang refactor all consumers under this ADR alone.  
2. Treat EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1 gap list as the backlog; each hardening is a **separate approved program**.  
3. Priority guidance (governance only): accumulating financial/ops counters and physical side effects (print) before cosmetic timeline duplicates.  
4. New consumers **MUST** ship checklist-compliant on day one.  
5. When hardening an accumulating projection, prefer Pattern B + rebuild seed (P-10 model) over publisher redesign.  
6. Registry / lifecycle catalog entries for dormant projections (P-05/P-07/P-08) **MUST** pass this ADR before first registration.

---

## 12. Non-Goals (restated)

This ADR does **not**:

- Modify code or runtime behavior  
- Refactor existing consumers  
- Introduce a new framework  
- Require Durable Business Claims for all consumers  
- Replace ADR-ARCH-014  

---

## 13. Validation against EVENT-CONSUMER-IDEMPOTENCY-GOVERNANCE-1

| Audit finding | Covered in this ADR |
|---------------|---------------------|
| Transport ledger insufficient for business duplicates | §3 definitions · §4.1 rule 7 · Pattern A limitations |
| P-10 completion as reference business claim | Pattern B reference · Example 2 |
| Ready push CAS as reference | Pattern D reference · Example 3 |
| Overwrite P-01/P-02/P-03/P-11 safe | Matrix + Example 1 |
| P-06 / P-10 Created / Printing / Notification Created / Session / Timeline gaps | Matrix live mapping · Migration §11 |
| No Settlement/Expo/Waiter Order-bus consumers | Settlement / Future rows in matrix |
| Multi-pattern governance (not claim-everywhere) | Purpose · Non-goals · Patterns C/E |
| New ADR recommended to refine ADR-014 | This document |

---

## 14. Related documents

- [ADR-ARCH-014 — Event Delivery Guarantees](./ADR-ARCH-014.md)  
- [P10-ORDER-COMPLETION-IDEMPOTENCY-1 Implementation Report](../../engineering/programs/P10-ORDER-COMPLETION-IDEMPOTENCY-1/IMPLEMENTATION-REPORT.md)  
- Architecture Constitution · ADR Lifecycle  

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)

**Binding question (answered):** Engineers select the strategy by executing **§4.2 Selection Algorithm** and recording the matching step on the **§8 Checklist**. No other selection path is authorized.
