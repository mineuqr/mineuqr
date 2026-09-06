# CASHIER-POST-PAYMENT-LATENCY-ROOT-CAUSE-INVESTIGATION-1

| Field | Value |
|-------|-------|
| **Program** | CASHIER-POST-PAYMENT-LATENCY-ROOT-CAUSE-INVESTIGATION-1 |
| **Type** | Architecture / runtime / production performance investigation |
| **Mode** | **INVESTIGATION ONLY** — no implementation |
| **Date** | 2026-09-06 |
| **Primary production sample** | `restaurantId=720007`, `orderId=9150001`, `ORD-0071`, `businessDay=2026-09-06` |
| **Related programs** | SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1 · CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-* · CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1 · CUSTOMER-DATA-FLOW-ARCHITECTURE-ROOT-CAUSE-1 · MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 |

---

## Executive Summary

The Cashier does **not** wait for Saudi Tax Invoice generation inside the payment HTTP response. After Collection Fact / PAID, Tax Invoice creation runs as **best-effort fire-and-forget** work. The user-visible post-PAID wait is the time until that async Compliance path produces a Phase 1–ready row **and** Cashier polling (`getPhase1ByOrder`) observes it.

For order **9150001**, production timestamps show ~**3.97 s** between `payment_collection_fact_committed` (11:14:17.762) and observed `OrderStatusChanged` (~11:14:21.730). That interval is **evidence of Order outbox/relay/consumer lag on a parallel path**. It is **not** proven to be the Tax Invoice gate: Cashier Tax Invoice readiness does **not** await `OrderStatusChanged`, projections, or Realtime.

A prior performance program removed HTML/QR PNG from Cashier polls and shortened the poll interval. That correctly reduced **secondary** read-path cost. It could **not** remove a multi-second wait dominated by **async generation / post-commit contention / isolate scheduling**, which matches operator reports that delay did not improve (and may feel worse because the Tax Invoice dialog now opens immediately into a longer “loading” state).

**Verdict:** **PASS — MULTIPLE CONTRIBUTING FACTORS IDENTIFIED** (with a residual production observability gap that prevents proving the exact millisecond split for 9150001).

---

## Scope

### In scope

- End-to-end runtime path: Cashier Confirm → Payment/PAID → Collection Fact → Compliance → Tax Invoice → Cashier read/display
- Order outbox / relay / projections / Realtime relevance to that path
- Client polling and prior POST-PAYMENT-PERFORMANCE-1 changes
- Interpretation of production timestamps for 9150001 and related log classes

### Out of scope (explicit)

- Any code, config, schema, migration, or behavior change
- Architecture redesign of Collection Fact / PAID / Compliance
- Re-opening Customer → Sale linkage (prior evaluation stands unless contradicted)

### Customer note

CUSTOMER-DATA-FLOW-ARCHITECTURE-ROOT-CAUSE-1 established Customer is **not** the proven cause of the ~4–5 s post-PAID delay. No new evidence in this investigation contradicts that. Customer lookup remains a small, sequential step inside `loadIssuanceContext` only when `orders.customerId` is set.

---

## Evidence

### E1 — Production timestamps (order 9150001)

| Event | Timestamp (local observation) | Notes |
|-------|-------------------------------|--------|
| `business_identity_assignment_started` | 11:14:16.109 | Inside Confirm persist path |
| `business_identity_assignment_completed` | 11:14:16.306 | Δ ≈ 197 ms |
| `payment_collection_fact_commit_attempt` | 11:14:17.450 | |
| `payment_collection_fact_committed` | 11:14:17.762 | Δ ≈ 312 ms for commit attempt→committed |
| `OrderStatusChanged` observed | ≈ 11:14:21.730 | ≈ **3.97 s after CF committed** |

**Not available for 9150001 (UNKNOWN):** compliance start/end, Tax Invoice insert time, Phase 1 persist time, settlement HTTP response time, first `getPhase1ByOrder` request/response, first READY, browser `paidToTaxInvoiceReadyMs`.

### E2 — Source: payment does not await Tax Invoice

`finalizeCashierPreparedInvoice` commits Order + Collection Fact under `runOrderCommand({ awaitRelay: false })`, builds `paidReceipt`, then:

1. `dispatchComplianceAfterProductionCollectionFact(...)` — non-awaiting
2. `dispatchBestEffortDownstreamDelivery(() => deliverCashierPosOperationalSettlementAfterPaid(...))` — non-awaiting
3. Returns `{ orderId, grandTotal, paidReceipt }` to Cashier

`dispatchBestEffortDownstreamDelivery` is literally `void delivery().catch(onFailure)`.

### E3 — Source: Cashier post-PAID UX (current)

On settlement success for Saudi Cashier:

- Marks payment success, sets `lastPaidOrderId`, **opens Tax Invoice dialog immediately**
- Defers `invalidateOrderReads()` via `queueMicrotask`
- Enables `saudiTaxInvoice.getPhase1ByOrder` with `includeHtml: false`, `refetchInterval` **300 ms** until document ready / terminal / 15 s timeout
- Dialog availability shows `loading` until document present

### E4 — Source: Tax Invoice ensure + Phase 1

Compliance path:

```
CF commit (HTTP already past financial truth)
  → dispatchCompliance (void)
  → ComplianceOrchestrator → SA module
  → ensureSaudiTaxInvoiceForCollectionFact
       → loadIssuanceContext (CF, order, profile, optional customer, items, snapshots)
       → insert/upgrade saudi_tax_invoices
       → applySaudiPhase1Generation (QR TLV payload, allocate number, persist phase1Document)
```

`getPhase1ByOrder`:

- Returns `null` if **no row** yet (does **not** call ensure-from-CF)
- If row exists without Phase 1 doc and status is `generated`/`retryable`, runs `applySaudiPhase1Generation` on the **read** path
- HTML/QR PNG render only when `includeHtml: true` (Cashier sends false)

### E5 — Source: OrderStatusChanged timing vs CF

For cashier prepared Confirm, `PlaceOrderService` folds `pending → preparing` into the **same** persist transaction that also commits Collection Fact. `OrderStatusChanged` is written to **outbox in that TX**, then relayed with `awaitRelay: false` via `scheduleOrderEventRelay` (`setImmediate` → `runOrderEventRelayBatch`, default limit **50**).

Therefore CF committed → OrderStatusChanged **observed** lag is primarily **queue/relay/consumer/observability lag**, not “Order status transition waiting after CF.”

### E6 — Source: outbox batch `durationMs`

`order_outbox_relay_batch.durationMs` = wall time of **one** `OrderEventRelay.processBatch` call (`Date.now() - started` around the batch loop). It is **not** Cashier Confirm duration and **not** Tax Invoice readiness duration. A reported **73–74 s** batch means that relay invocation was slow/backlogged; it does **not** prove the Cashier waited 73 s.

### E7 — Source: Vercel / durability asymmetry

Prior forensics (CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1): production entry `scripts/vercel-handler.ts` has **no `waitUntil`**. Best-effort after-response work may be truncated when the isolate freezes.

Operational Check/ST/OS/SR has a **durable** recovery sweep/cron. **Saudi Tax Invoice ensure has no equivalent durable recovery job** in source. Read path can finish Phase 1 only if a Tax Invoice **row already exists**.

### E8 — Prior performance program outcome

SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1 diagnosed:

- Confirm → PAID ≈ 2–3 s (operator)
- PAID → Tax Invoice ready ≈ +4–5 s (operator)
- Payment does not await TI; HTML PNG on every poll was unnecessary; 1 s poll coarse

Live browser re-timing was **not** run in-agent. Operator subsequent observation: delay **did not improve** / may have increased — consistent with fixing secondary costs while the primary wait remained async generation (+ possible longer visible loading because dialog opens earlier).

### E9 — Observability gaps in Compliance

No structured ops timeline events were found for: compliance dispatch start/end, `ensureSaudiTaxInvoice` duration, Phase 1 allocate/persist duration, or correlation of those to `collectionFactId` / Cashier request IDs. Failure uses a generic deferred-failure ops event. Client `paidToTaxInvoiceReadyMs` logs only in **DEV**.

---

## Investigation Method

1. Mapped Confirm → TI visibility from Cashier UI through POS finalize, Compliance, Phase 1 view, and poll behavior (source as ground truth).
2. Correlated 9150001 timestamps with Order persist/outbox semantics.
3. Interpreted outbox/projection/Realtime consumers against whether Cashier TI waits on them.
4. Compared prior PERFORMANCE-1 diagnosis vs residual delay after HTML/poll changes.
5. Cross-checked Vercel waitUntil / downstream recovery docs for durability asymmetry.
6. Did **not** mutate code, config, DB, or production data. Did **not** claim wall-clock numbers without evidence.

---

## Observed Timeline

### Order 9150001 (partial — production)

```
11:14:16.109  business_identity_assignment_started
11:14:16.306  business_identity_assignment_completed          (+0.197 s)
     …        UNKNOWN: remaining Order persist / invoice allocate / CF prep
11:14:17.450  payment_collection_fact_commit_attempt
11:14:17.762  payment_collection_fact_committed              (+0.312 s attempt→commit)
     │
     ├─ SAME TX (code): OrderCreated + OrderStatusChanged outbox rows written
     ├─ AFTER TX (code): scheduleOrderEventRelay (setImmediate)
     ├─ AFTER TX (code): void Compliance ensure + Phase 1
     ├─ AFTER TX (code): void operational Check/ST/OS/SR delivery
     └─ AFTER TX (code): HTTP returns PAID + paidReceipt
              │
              UNKNOWN: exact HTTP response time for this order
              │
≈11:14:21.730 OrderStatusChanged observed (relay/consumer path)  (~+3.97 s after CF)

PARALLEL (user path after HTTP — code + prior operator baseline):
  Cashier opens Tax Invoice dialog → poll getPhase1ByOrder @ 300ms
  until Phase 1 document READY or 15s timeout
              │
              UNKNOWN for 9150001: first null poll, first READY, READY wall time
```

### Architectural end-to-end (code-proven sequence)

| Step | Sync on Cashier HTTP? | Blocks TI UI READY? |
|------|----------------------|---------------------|
| Confirm click → settlement.initiate | Yes | N/A (pre-PAID) |
| Business identity + Order + CF TX | Yes | Indirect (must finish for PAID) |
| paidReceipt build + HTTP return | Yes | Ends “Confirm→PAID”; starts post-PAID wait |
| Outbox relay batch | No (deferred) | **No** (TI does not await) |
| Projection consumers / Realtime | No | **No** (Cashier TI does not subscribe) |
| Operational Check/ST/OS/SR | No (best-effort) | **No** (not TI gate); may **contend** for DB/CPU |
| Compliance ensure + Phase 1 | No (best-effort) | **Yes — produces artifact** |
| getPhase1ByOrder poll | Client after PAID | **Yes — detects READY** |
| HTML QR PNG render | Off Cashier path (`includeHtml: false`) | **No** (current code) |

---

## Critical Path

### User-visible “Confirm → Tax Invoice available”

```
A. Confirm → PAID (blocking HTTP)
   identity + Order+CF transaction + receipt projection
   Operator baseline ≈ 2–3 s
   9150001 partial: identity+CF alone ≈ 1.65 s from identity start → CF committed
     (pre-identity work UNKNOWN)

B. PAID → Tax Invoice READY (async + poll)
   Compliance ensure + Phase 1 persistence  ‖  optional contention with
   deferred outbox relay + operational settlement on same isolate/pool
   Client polls until document present
   Operator baseline ≈ +4–5 s
   Exact 9150001 READY time: UNKNOWN
```

**True critical path for Tax Invoice visibility after PAID:**

1. Best-effort Compliance `ensureSaudiTaxInvoiceForCollectionFact` (+ Phase 1) **or** read-path `ensurePhase1Ready` if a partial row exists  
2. Cashier poll observing non-null Phase 1 document  

**Not on the TI critical path:** OrderStatusChanged consumption, kitchen/timeline/owner/active/details/public projections, Realtime SSE, operational ST/OS/SR completion, Paid Receipt HTML.

---

## Answers to Primary Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Where does user-visible delay occur? | **Two segments:** (A) Confirm→PAID HTTP; (B) PAID→TI READY while dialog loads/polls. Segment B is the “additional waiting” after payment succeeds. |
| 2 | True critical path Confirm→TI visibility? | Settlement HTTP (Order+CF) → HTTP PAID → async Compliance ensure/Phase1 → poll `getPhase1ByOrder` → dialog READY. |
| 3 | Synchronous/blocking? | Identity, Order+CF TX, invoice allocate, paidReceipt, settlement HTTP. |
| 4 | Asynchronous/non-blocking? | Compliance TI, operational settlement, outbox relay (`awaitRelay: false`), projections, Realtime. |
| 5 | Is ~4 s after CF related to Cashier delay? | **Temporally similar** to operator PAID→TI (~4–5 s). **Causally unproven** as OrderStatusChanged→TI. Likely **shared post-commit scheduling/contention environment**, not TI awaiting OrderStatusChanged. |
| 6 | Order lifecycle involved? | Lifecycle **persist** is on Confirm→PAID. Lifecycle **event fanout** is parallel, not TI gate. |
| 7 | Outbox/Relay involved? | On Confirm path as deferred work; **not** TI gate. Can contend with Compliance on same isolate. 73 s batch ≠ user wait. |
| 8 | Projections involved? | Not on Cashier TI path. |
| 9 | Realtime involved? | Cashier TI uses tRPC poll, not Realtime. |
| 10 | Compliance dispatch involved? | **Yes — necessary producer** of TI; fire-and-forget after CF. |
| 11 | TI generation involved? | **Yes — on critical path for READY.** |
| 12 | TI persistence involved? | **Yes** (insert + Phase 1 artifact persist). |
| 13 | getPhase1ByOrder involved? | **Yes — detection path**; cannot create from CF if row missing; may complete Phase 1 if row incomplete. |
| 14 | Polling involved? | **Yes — client wait mechanism**; 300 ms adds ≤~300 ms detection jitter, not multi-second root. |
| 15 | Browser/client involved? | Dialog open + poll + loading UI; not generation. Earlier dialog open can **lengthen perceived** wait. |
| 16 | Network latency involved? | Each poll RTT adds; multi-second total unexplained by RTT alone without measured slow responses. **UNKNOWN** for 9150001. |
| 17 | Database latency involved? | Plausible inside ensure/Phase1/settlement/relay; CF commit itself ~312 ms. Exact TI DB ms **UNKNOWN**. |
| 18 | Duplicate/repeated work? | Possible: background `applySaudiPhase1Generation` vs poll `ensurePhase1Ready`; `loadIssuanceContext` even on immutable replay; many polls while null. |
| 19 | Observability/correlation problem? | **Yes.** Missing compliance/TI timing ops; `correlationId` often unset on outbox; no end-to-end Cashier correlation for 9150001. |
| 20 | More than one contributing latency? | **Yes.** Confirm→PAID (A) + async TI readiness (B) + possible contention/durability factors + secondary poll/UI perception. |

---

## Performance Findings

### F1 — Post-PAID wait is readiness lag, not payment await (PROVEN)

Payment HTTP returns without awaiting Compliance. User-visible TI availability cannot improve by further “not awaiting TI” — that is already true.

### F2 — Prior HTML/poll remediation addressed secondary costs (PROVEN in code; residual delay explained)

Removing `renderSaudiPhase1InvoiceHtml` / QR PNG from Cashier polls removes work **after** a document exists or on near-ready reads. It does not accelerate `ensureSaudiTaxInvoiceForCollectionFact`. Changing poll 1000→300 ms saves at most ~0.7 s of detection delay, not a 4–5 s generation gap. Opening the dialog earlier increases time spent in `loading` if generation is unchanged — consistent with “felt worse.”

### F3 — OrderStatusChanged +3.97 s is parallel infrastructure lag (HIGH confidence)

Event is outboxed in the CF TX; observation delay is relay/consumer/log path. Cashier TI does not wait for it. **Do not treat 3.97 s as proven TI root cause.** Treat as **supporting evidence of post-commit lag in the same time window**.

### F4 — `order_outbox_relay_batch` 73–74 s is batch wall time (PROVEN interpretation)

Measures one relay batch duration. Unrelated as a direct Cashier wait metric. Relevant only as a **system health / contention / backlog** signal.

### F5 — Post-commit fan-out contention is a plausible amplifier (MEDIUM confidence)

Immediately after CF, the same Node isolate may run:

- deferred outbox relay (up to 50 pending events)
- Compliance TI ensure + Phase 1
- operational Check finalize / ST / OS / SR

All share event loop and likely DB pool. This can stretch Compliance completion into the multi-second range without any single “await TI” bug.

### F6 — Serverless freeze risk without waitUntil (PROVEN architecture; impact on 9150001 UNKNOWN)

If Compliance is truncated before insert, polls return null until something else creates the row — and **no durable TI recovery cron exists**. If insert completes and Phase 1 does not, poll can finish Phase 1. Order 9150001 eventually showed TI availability in operator narrative patterns, but exact durability path for that order is UNKNOWN.

### F7 — Confirm→PAID remains a separate multi-second cost (PROVEN as separate segment)

Identity + CF timestamps alone consume ~1.65 s mid-request for 9150001; operator total Confirm→PAID ≈ 2–3 s. This is **not** the “after PAID” complaint, but it is part of total Confirm→usable invoice time (~8–9 s baseline).

---

## Root Cause Analysis

### Proven

1. **Architectural root of post-PAID wait:** Tax Invoice is produced **after** financial commit on a **best-effort async** path; Cashier **polls** until READY.  
2. **Non-root (eliminated as primary):** Payment awaiting TI; Cashier waiting on OrderStatusChanged/projections/Realtime; Customer recreation; current HTML PNG on Cashier poll (`includeHtml: false`).  
3. **Why PERFORMANCE-1 did not clear the symptom:** It optimized detection/secondary read cost, not Compliance generation / post-commit contention / durability.

### Not proven for 9150001 (insufficient instrumentation)

Exact dominant milliseconds among:

- `loadIssuanceContext` DB reads  
- Tax Invoice insert  
- number allocation + Phase 1 persist  
- event-loop/DB contention with relay + operational settlement  
- isolate scheduling / freeze / resume  
- slow `getPhase1ByOrder` responses  

### Engineering statement

The **systemic cause** of the remaining user-visible post-PAID delay is: **async Compliance Tax Invoice readiness lag after Collection Fact, observed via Cashier polling**, potentially **amplified by concurrent post-commit work and fragile serverless continuation**. The **OrderStatusChanged ~4 s observation** is a **correlated parallel symptom**, not the proven TI dependency.

---

## Contributing Factors

| Factor | Role | Confidence |
|--------|------|------------|
| Fire-and-forget Compliance after CF | Primary producer delay for READY | High |
| Cashier poll until document | Detection / UX wait surface | High |
| Parallel operational settlement after CF | Contention amplifier | Medium |
| Deferred outbox relay on same isolate | Contention / backlog amplifier; explains OrderStatusChanged lag class | Medium |
| No `waitUntil` / no durable TI recovery | Tail latency / intermittent delay risk | Medium (arch proven; instance impact unknown) |
| Dialog opens immediately into loading | Perception of longer wait after PERFORMANCE-1 | Medium |
| Confirm→PAID TX work (identity, CF) | Separate segment of total time | High |
| Optional duplicate Phase 1 on read vs background | Extra work under race | Low–Medium |
| `correlationId` often undefined | Measurement difficulty, not latency itself | High (as gap) |

---

## Non-Causes / Eliminated Hypotheses

| Hypothesis | Disposition | Why |
|------------|-------------|-----|
| Payment HTTP awaits Tax Invoice | **Eliminated** | `void` dispatch; HTTP returns paidReceipt first |
| TI waits for OrderStatusChanged | **Eliminated as dependency** | No code edge; event is parallel fanout |
| Projections gate Cashier TI | **Eliminated** | Cashier uses `getPhase1ByOrder` only |
| Realtime gates Cashier TI | **Eliminated** | No Realtime usage in Cashier TI flow |
| Customer flow is root cause | **Eliminated (prior + no contradiction)** | Optional lookup only; prior evaluation |
| HTML/QR PNG on Cashier poll (current) | **Eliminated as current primary** | `includeHtml: false` |
| 73 s outbox batch = Cashier waited 73 s | **Eliminated** | Metric semantics = batch wall time |
| Poll interval alone explains 4–5 s | **Eliminated** | 300–1000 ms cannot account for multi-second READY lag |

---

## Hypothesis Register

### H1 — Async Compliance generation dominates PAID→READY

- **Why considered:** Architecture + PERFORMANCE-1 baseline.  
- **For:** TI only appears after ensure/Phase1; payment does not await it; HTML fix did not remove delay.  
- **Against:** No per-order generation duration for 9150001.  
- **Explains observed delay?** Yes, as primary class.  
- **Confidence:** **High** (class), **Medium** (exact ms).

### H2 — Post-commit contention (relay + settlement + compliance)

- **Why considered:** All three start immediately after CF on same isolate.  
- **For:** OrderStatusChanged ~4 s lag same window; heavy operational delivery; relay batch can be huge.  
- **Against:** No concurrent trace proving lockstep.  
- **Explains?** Partial amplifier.  
- **Confidence:** **Medium**.

### H3 — OrderStatusChanged lag *is* the Cashier TI bottleneck

- **Why considered:** Similar ~4 s magnitude.  
- **For:** Temporal coincidence.  
- **Against:** No dependency in code; different subsystems.  
- **Explains?** **No** as causal TI gate.  
- **Confidence:** **Rejected as root**; retained as correlated symptom.

### H4 — getPhase1ByOrder / polling is the root

- **Why considered:** User waits on poll.  
- **For:** Detection path.  
- **Against:** Polling cannot create missing CF-backed row; interval too small to explain 4–5 s alone.  
- **Explains?** Detection surface, not generation root.  
- **Confidence:** **High as mechanism**, **Low as root cause**.

### H5 — Serverless freeze delays TI until later request

- **Why considered:** No waitUntil; no TI cron.  
- **For:** Architecture.  
- **Against:** Consistent ~4–5 s (not ~60 s cron) suggests work often completes in-process, not minute-scale recovery.  
- **Explains?** Tail/intermittent cases more than steady 4–5 s.  
- **Confidence:** **Medium for risk**, **Low as sole explanation of steady delay**.

### H6 — PERFORMANCE-1 made delay worse via more polls

- **Why considered:** Operator “may have increased.”  
- **For:** More frequent polls + earlier dialog loading state.  
- **Against:** Extra polls are light when result is null; unlikely to add seconds unless server/DB saturated.  
- **Explains?** Perception and possible mild contention, not multi-second generation.  
- **Confidence:** **Medium (perception)**, **Low (true generation regression)**.

---

## Observability Gaps

1. No production spans for Compliance ensure / Phase 1 tied to `collectionFactId` / `orderId`.  
2. No Cashier production mark for `paidToTaxInvoiceReadyMs` (DEV-only).  
3. No correlated first `getPhase1ByOrder` timing for 9150001.  
4. Outbox `correlationId` frequently undefined — weak cross-event joins.  
5. Cannot separate queue latency vs execution latency for Compliance on Vercel.  
6. Cannot prove whether 9150001 Phase 1 finished in background vs on-read `ensurePhase1Ready`.  
7. Relay batch logs lack per-event publish timestamps in the metric record itself.

**Correlation available today:** `restaurantId`, `orderId`, `orderNumber`, `collectionFactId` (when logged), approximate timestamps.  
**Correlation missing:** end-to-end `correlationId` / request id spanning settlement HTTP → compliance → TI → poll.

---

## Cross-System Findings

| System | Relationship to Cashier TI delay |
|--------|----------------------------------|
| Collection Fact / PAID | Financial authority; **start gun** for Compliance; not the TI artifact |
| Compliance / Saudi TI | **Producer** of user-visible artifact |
| Order outbox / relay / consumers | Parallel; may contend; **not** TI gate |
| Operational Check/ST/OS/SR | Parallel; durable recovery exists; may contend; **not** TI gate |
| Realtime | Not used by Cashier TI |
| Customer Core | Not root cause (prior evaluation) |
| Vercel isolate lifecycle | Best-effort TI continuation fragile vs operational recovery |

---

## Recommended Next Step

**Do not implement a fix in this program.**

### Recommended remediation direction (future program only)

1. **Instrument first (required to prove ms):** structured timing for compliance start/end, ensure outcome, Phase 1 persist, and Cashier `paidToTaxInvoiceReadyMs` in production-safe form, correlated by `collectionFactId` + `orderId`. Capture 20–50 Saudi cashier payments.  
2. **Only after measurements:** choose among (examples, not commitments):
   - Reduce post-commit contention (isolate Compliance from heavy relay/settlement on the same turn)
   - Durable TI ensure recovery (mirror operational settlement recovery — without changing CF/PAID semantics)
   - Platform `waitUntil` for Compliance (best-effort immediate completion)
   - Optional: allow read path to trigger ensure-from-CF when row missing (behavioral change — separate design review)

### Implementation Program Required

A separate, explicitly approved program after reviewing this report and (ideally) the instrumentation capture. This investigation **must not** start that program automatically.

---

## Final Verdict

**PASS — MULTIPLE CONTRIBUTING FACTORS IDENTIFIED**

| Layer | Finding |
|-------|---------|
| Proven systemic cause of post-PAID wait | Async Compliance Tax Invoice readiness + Cashier poll detection |
| Proven non-causes | Payment awaiting TI; TI gated on OrderStatusChanged/projections/Realtime; Customer as root; current Cashier HTML PNG |
| Correlated but not causal TI gate | ~3.97 s CF→OrderStatusChanged observation; large outbox batch durations |
| Residual gap | Exact millisecond attribution for order 9150001 |

---

## Scope Certification

| Certification | Status |
|---------------|--------|
| NO CODE CHANGES WERE MADE | **CERTIFIED** |
| NO DATABASE CHANGES WERE MADE | **CERTIFIED** |
| NO MIGRATION WAS CREATED | **CERTIFIED** |
| NO PRODUCTION DATA WAS MODIFIED | **CERTIFIED** |
| NO CONFIGURATION WAS CHANGED | **CERTIFIED** |
| NO PAYMENT SEMANTICS WERE CHANGED | **CERTIFIED** |
| NO COLLECTION FACT SEMANTICS WERE CHANGED | **CERTIFIED** |
| NO PAID SEMANTICS WERE CHANGED | **CERTIFIED** |
| NO CUSTOMER CHANGES WERE MADE | **CERTIFIED** |
| NO TAX INVOICE BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO QR BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO POLLING BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO ORDER LIFECYCLE BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO OUTBOX BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO PROJECTION BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO REALTIME BEHAVIOR WAS CHANGED | **CERTIFIED** |
| NO CASHIER UX BEHAVIOR WAS CHANGED | **CERTIFIED** |

**Git note:** Deliverable is this evaluation document only. No implementation commits or pushes were made as part of this program.

---

## STOP

Investigation complete. No fix implemented. No follow-on implementation program started.
