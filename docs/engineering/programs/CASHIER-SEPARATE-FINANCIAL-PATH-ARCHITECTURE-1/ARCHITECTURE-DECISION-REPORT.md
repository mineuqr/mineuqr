# CASHIER-SEPARATE-FINANCIAL-PATH-ARCHITECTURE-1

**Architecture Investigation and Decision Report**

This document is **investigation + architecture decision only**. It does not authorize implementation, schema, ADR text edits, or runtime change.

| Field | Value |
|---|---|
| **Program** | CASHIER-SEPARATE-FINANCIAL-PATH-ARCHITECTURE-1 |
| **Date** | 2026-08-20 |
| **Status** | Architecture decision — **REJECT Option B** |
| **Hypothesis under investigation** | Cashier financial completion is independent of the `operational_checks` Check Aggregate |
| **Commercial Capability Impact** | **NO** |
| **Implementation authorized** | **NO** |

Layers (do not collapse):

| Layer | This program |
|---|---|
| **Investigation** | Done in this report |
| **Architecture decision** | Option B rejected |
| **Implementation** | Not started; not authorized |
| **Validation** | Not applicable |

---

## 1. Executive Summary

The Cashier left-side totals UI is **already** not the Check Aggregate. `displayCashierTicketMoney` is preview. ADR-ARCH-038 already forbids requiring an OPEN `operational_checks` row **before** Confirm. That presentation vs domain distinction is valid and must be kept.

Independence of **financial completion** from Check is **not** the same distinction.

A Cashier-only canonical fact that is not a paid Check is, in this platform, a **second monetary root**. That is forbidden by:

- I-FIN-01 / ADR-020 R5 (Check is the only monetary settlement aggregate for restaurant sales)
- I-FIN-02 (Revenue = paid Check `grandTotal`)
- ADR-020 (“Must not invent new monetary roots”; sessionless channels **MUST** enroll Orders into Check to collect Revenue)
- I-PAY-03 / I-PAY-15 (Payment must not become a competing SSOT; no `payments` table to establish ownership)
- This program’s own non-goal: **do not create a generic second monetary root**
- ADR-038 itself: Check remains the frozen obligation; Confirm materializes+finalizes Check in one TX (I-PAY-22/23)

The cashier is the **operational** decision-maker. The **financial** authority is still server-side Check freeze via Payment Confirm. The system does not re-prove that cash physically changed hands; it **does** enroll the collected sale into the single Revenue / Refund / SR publication model.

**Option A** (Cashier remains Check-owned at completion; distinct entry already exists) is the only architecture that preserves one financial truth.

**Option B** (separate Cashier canonical path, Check excluded from completion) is **rejected**.

**Option C** (hybrid: PAID without OS/SR, or PAID then background Check) is **rejected** (I-OS-07, SR-INV-04, I-PAY-23).

The 5–6 second Confirm symptom does not change domain ownership. ADR-038 I-PAY-24 already retained the financial-TX wall. Attribution, print, and realtime are **already** after COMMIT (`awaitAttribution: false`; print uses `settlementRecordId` after PAID).

---

## 2. Current Cashier Runtime Flow

```
Cashier UI (ticket) — presentation “check” view
  displayCashierTicketMoney (live tax; NOT operational_checks)
  → pos.sale.create (Order, cashier_pos, enrollCheck: false)
  → payment sheet (tender local state, I-PAY-11)
  → Confirm (saleReady + preview + tender; NOT Check.grandTotal)
  → pos.settlement.initiate
       restaurant / terminal / CRMP fail-closed
       idempotency exclusive + fingerprint
       paid membership → replay
       else confirmPayment({ orderId, awaitAttribution: false })
            settleCashierPosOrderPaidByIdDetailed
            one withCheckOwnedTransaction:
              materialize OPEN Check + Charges + membership
              finalizeOpenCheckById:
                CAS → computeCheckMoney → ST → PAID → OS settled → SR
  → COMMIT → HTTP PAID
  → print / realtime / projections / Attribution (after COMMIT)
```

`OrderSessionConsumer` skips `ensureCheckForOrder` for `cashier_pos` (I-PAY-21). Other sessionless channels still enroll.

Evidence: `CashierWorkspacePanel`, `cashierTicketMoney.ts`, `PosSettlementInitiateService`, `PaymentConfirmService`, `CheckService.settleCashierPosOrderPaidByIdDetailed`, `OrderSessionConsumer`.

---

## 3. Current Check-Based Financial Flow

Session / kiosk / waiter:

```
OPEN Check already exists (visit bill / enrollCheck)
  → confirmPayment({ checkId })
  → settleCheckPaidByIdDetailed
  → finalizeOpenCheckById   // SAME host as Cashier
  → Attribution often awaited (default true)
```

Cashier and Session **share completion**. They **do not** share entry.

---

## 4. Cashier vs Session / Kiosk / Waiter Ownership Comparison

| Concern | Cashier | Session / Kiosk / Waiter |
|---|---|---|
| Operational core | Order (`cashier_pos`) | Session? + Order(s) |
| Presentation totals | `displayCashierTicketMoney` (preview) | Check / bill UI often bound to OPEN Check |
| Human payment decision | Cashier Confirm | Staff / guest Confirm against existing bill |
| Confirm identity | `orderId` | `checkId` |
| Pre-payment OPEN Check | **Forbidden as readiness** (I-PAY-19) | Required where that channel’s bill already exists (I-PAY-20) |
| Monetary aggregate | **Paid Check** (same) | Paid Check |
| Session | Not required | Table: required; kiosk: optional |
| `ensureCheckForOrder` | Not on Cashier Confirm | Still used for sessionless non-cashier enroll |
| PAID word | `Check.outcome = paid` | Same |

The “Cashier Check UI” is a **restaurant UX label**. It is not `operational_checks`. Confusing those two is the defect this program correctly wants to avoid. Excluding Check from **completion** is a different, invalid leap.

---

## 5. Current 5–6s Confirm Path

No new production samples were taken in this program (read-only; Gate 16 of the 038 implementation remains the production-evidence gap). Classification uses repository instrumentation and ADR-038 evidence.

| Segment | Approx / source | Classification |
|---|---|---|
| `pos.sale.create` | Separate HTTP, before Confirm | **Not Confirm.** Commercial Order (I-PAY-09) |
| Pre-038 `ensureCheckForOrder` / intake (~2.85s, ~2.5s TX) | ADR-038 §3–4 | **Removed from Cashier enablement.** Architectural coupling of *readiness*, not of *completion* |
| Confirm HTTP: CRMP + idempotency | POS settlement | **Required** for authority / replay |
| Confirm TX: Check INSERT + Charges + membership | Inside `withCheckOwnedTransaction` | **Required for Check-owned completion** (038 §7). Under Option B this is what proponents want out. Constitutionally it is **financial freeze**, not “unrelated downstream” |
| Confirm TX: `computeCheckMoney` | Same TX; historically ~0 ms | **Required** payable authority (I-PAY-04) |
| Confirm TX: ST + PAID + OS + SR | Same TX; dominant remaining wall (~2.5s historically for Check-owned write) | **Required** under 022/026/038. **Architectural coupling** if one wants Option B; **not** redundant |
| Attribution | After COMMIT (`awaitAttribution: false`) | **Already downstream** |
| Print | After PAID + `settlementRecordId` | **Already downstream** |
| Realtime / kitchen listing | After paid Check visibility (I-PAY-10) | **Already downstream** of PAID; **not** of Confirm HTTP except as listing consumers |
| Reporting projections | Read models | **Already downstream** |

**Unknown without new production samples:** exact 5–6s split on current origin (Confirm TX vs network vs client post-settlement UI). Client marks `settlementDurationMs` as request→response; that includes the whole server Confirm.

Do **not** treat “unknown exact milliseconds” as license to drop Check.

---

## 6. Domain Ownership Analysis

| Domain | Owns | Does not own |
|---|---|---|
| Cashier UI | Ticket UX, tender local state, discount **intent**, Confirm click | Payable amount, Revenue, PAID |
| Order | Commercial sale, lines, operational lifecycle | Settlement, tax policy SSOT, tenders |
| Payment process | Confirm command (I-PAY-01/12) | Monetary aggregate (I-PAY-02/03) |
| Check | Frozen obligation, Charges composition, outcome, snapshots | Kitchen listing, Session |
| ST | Tender mix under Check | Revenue (R9) |
| OS | Per-Order financial state under Check | Bill amount (I-PAY-17) |
| SR | Immutable publication of Check finalize | Calculator / UI |
| Reporting | Reads Check / ST / Order Read | Write of money |
| Refund | Check-owned reverse + compensating SR | Order-owned money |

A new “Cashier Financial Authority” aggregate would occupy the Check column. That is a **replacement root for one channel**, not a process façade.

---

## 7. Check Aggregate Dependency Analysis

| Artifact | Check-specific wording? | Platform-effective for collected money? | Cashier-specific? | Downstream? | Reusable contract? |
|---|---|---|---|---|---|
| Check (`operational_checks`) | Yes | **Yes** — I-FIN-01/02 | Entry timing only (038) | No | Monetary root |
| Charges | Check composition | **Yes** — I-PAY-04/18 | No | No at PAID | Freeze input |
| ST | Child of Check | **Yes** — analytics SSOT | Mixed tender at Confirm (not 024 Split) | No at PAID | Tender contract |
| OS | Check-owned entity | **Yes** — I-OS-07 | No | No at paid Check | Order attach |
| SR | Publication of Check finalize | **Yes** — SR-INV-04/09 | No | No (R3 rejected post-commit SR) | Refund/reporting history |
| Revenue | Paid Check formula | **Yes** | No | Read after | I-FIN-02 |
| Refund | Check-owned | **Yes** | No | After PAID | ADR-032 |
| Reporting | Reads Check/ST | **Yes** | Dual metric Order Sales ≠ Revenue | After | Dual-metric law |
| Payment methods | ST lines | **Yes** | Cashier mixed ST at Confirm | No | Catalog keys |
| Order lifecycle | Release after paid Check (I-PAY-10) | **Yes** for ops visibility | `cashier_pos` listing gated on paid Check | Kitchen after PAID | I-PAY-09/10 |
| Session lifecycle | Optional on Check | Session ≠ finance (020) | Cashier sessionless | N/A | Isolation already |

**Why `operational_checks` is the monetary root for `cashier_pos`:** Cashier **collects restaurant sales money**. ADR-020’s channel table: future/sessionless channels must enroll into Check **to collect Revenue**. Channels that never collect money need not create Checks **and must not appear in Check Revenue**. POS cannot vanish from Revenue.

**Why it is not the Cashier UX root:** presentation uses preview money. OPEN Check is not a Confirm gate. That is already 038. Option B conflates “UI is not the aggregate” with “aggregate is not required.”

---

## 8. Proposed Cashier Financial Boundary (hypothesis — not adopted)

Option B as proposed:

```
Sale (Order)
  → Cashier Check UI (presentation only)
  → Confirm
  → Cashier Canonical Financial Transaction  // NOT operational_checks
  → PAID
  → downstream including optional Check/ST/OS/SR
```

**Smallest TX the hypothesis wants:** persist one tenant-scoped immutable payment decision (identity, amount, tender, actor, terminal, idempotency) and flip PAID.

**Rejected as adopted boundary.** If that row is not a paid Check, Revenue/Refund/SR have no certified home. If that row **is** a paid Check, the hypothesis collapses to Option A.

The **adopted** Cashier boundary remains ADR-038 §7:

```
Confirm
  → Check materialize (if needed) + Charges + ST + OS settled + SR
  → COMMIT
  → PAID
```

Already **out** of that TX: Attribution, print, realtime, reporting projections, kitchen listing consumers.

---

## 9. Financial Authority Definition

| Candidate | Verdict |
|---|---|
| Browser totals | Forbidden (I-PAY-05, ADR-006, I-CASHIER-FIN-02) |
| Order `totalAmount` | Not Bill SSOT (I-PAY-08; I-FIN-12) |
| POS idempotency store | Replay cache, not Revenue |
| New Cashier payment document | Second monetary root unless it **is** Check |
| `payments` table | Forbidden (I-PAY-15; this program non-goal) |
| Payment process | Command owner, not money row (I-PAY-01/03) |
| **Paid Check + ST + OS + SR** | **Canonical.** Only certified fact in the repository |

There is **no unnamed table** waiting to be discovered. The investigation was required not to assume a name; the evidence still converges on Check.

Minimum immutable fact that a valid Cashier payment occurred:

> Tenant-scoped `operational_checks` row with `outcome = paid`, certified Charges, collection ST summing to `grandTotal`, OS `settled`, SR published in the same financial transaction.

---

## 10. Idempotency Model

**Current (adopt):**

- POS `runExclusive` on restaurant + terminal + user + `idempotencyKey`
- Fingerprint: order + tenders + discount intent
- Same key + same fingerprint → replay
- Same key + different fingerprint → `idempotency_conflict`
- Paid membership on Order → replay without second settle
- Check OPEN-row CAS / `ownedRows === 0` for concurrent finalize

Invariant: **one cashier sale → one financial completion** holds because completion **is** one paid Check.

**Option B** would need a new unique constraint on the new fact. That is a new root’s identity plane, not a reuse of Payment process.

Different idempotency keys for the same Order: paid-membership replay / Check CAS still yield one Check. A second Cashier fact table would need the same “one Order → one completion” unique law or it would double-complete.

---

## 11. Tenant Isolation Model

Enforced today (must not weaken):

- Staff restaurant vs `Order.restaurantId` (mismatch → reject)
- `cashier_pos` channel gate on direct commit
- Terminal ownership (not found / foreign / inactive)
- CRMP register/shift fail-closed
- Idempotency key scoped with `restaurantId`
- Check, membership, ST, OS, SR all carry `restaurantId` (I-FIN-09)

UI hiding is not isolation. Option B must not skip these gates; it also must not invent a fact that Reporting/refunds can read without tenant predicates.

---

## 12. Order Lifecycle Impact

| Moment | Today |
|---|---|
| Sale create | Order exists; **not** operational release (I-PAY-09) |
| Unpaid `cashier_pos` | Hidden from kitchen/ops lists (`cashierPosPaidOperationalVisibilitySql`) |
| Confirm COMMIT | Paid Check membership → operational visibility (I-PAY-10) |
| Cancel before pay | Order operational; no Check Revenue |
| After PAID | Refund/void are Check-owned, not Order-owned money |

Option B “PAID without Check” would either show kitchen tickets without Revenue, or show Revenue without I-PAY-10’s certified Check visibility — both contradictions.

**No new Order lifecycle ADR is justified.** Do not silently treat Order `status` as PAID.

---

## 13. Revenue Impact

Canonical: **I-FIN-02** — sum of paid Check `grandTotal` (tenant-scoped).

| Failure mode of Option B | Why |
|---|---|
| Missing Cashier revenue | Cashier money never becomes a paid Check |
| Double count | Cashier fact **and** later Check both counted |
| Second revenue root | Parallel “Cashier Revenue” API (020: **No dual Revenue APIs**) |
| Reconciliation ambiguity | Two PAID vocabularies |

Existing formula **cannot** count Cashier without Check **unless I-FIN-02 is superseded**. That is a required **new ADR + reporting program**, not a silent reporting patch. This investigation does **not** authorize that ADR.

Cashier revenue today: Confirm produces a paid Check; Reporting already includes it. **No reporting change.**

---

## 14. Refund Impact

ADR-032: Refund is Check-owned; `refundableBalance` from SR history; compensating SR; OS may become `refunded`. I-PAY-16: refund history remains SR law.

A Cashier fact that is not Check/SR is **unrefundable** in the certified platform, or forces a second refund engine (ADR-023: Refund under Check; Order must not own refund).

Cancellation **before** payment: Order-level; no refund. Duplicate/concurrent Confirm: idempotency (§10), not refund.

**Required if Option B were forced:** a Refund architecture program that re-homes RF-INV / SR compensating publication. **Not** this program. **Not** recommended.

---

## 15. Settlement Impact

| Piece | If Check excluded from Cashier PAID |
|---|---|
| ST | Payment Method Analytics empty or second ledger |
| OS | I-OS-07 broken; I-PAY-10 visibility undefined |
| SR | SR-INV-09: Payment completion **never** alone creates SR; SR-INV-04: SR only with Check finalize |
| Incremental FSP Payments (024) | Payment Success ≠ Settlement remains Check capability; Cashier Confirm **may** collect+settle atomically **in the Check TX** (037 refinement of 024) |

Settlement is not “optional glue.” It **is** how collected money is tenders, order-attach, and publication.

---

## 16. Reporting Impact

| KPI | SSOT | Cashier Option B |
|---|---|---|
| Check Revenue, Tax, Paid Checks, Avg Check, Comp/Void | Check | Missing or dual |
| Payment Method Analytics | ST | Missing or dual |
| Order Sales | Order Read | May still move; **must not** be relabeled Revenue |
| Excel / Executive / daily | Consume above | Inherit the hole |

Do not silently modify reporting. Do not use Order Sales as a substitute for Cashier Revenue.

---

## 17. Operational Downstream Classification

| Work | Classification | Basis |
|---|---|---|
| Server payable (`computeCheckMoney`) | **MANDATORY BEFORE PAID** | I-PAY-04 |
| Tenant/auth/CRMP/idempotency | **MANDATORY BEFORE PAID** | Security / one completion |
| Charges freeze | **MANDATORY BEFORE PAID** | I-PAY-18; cannot recast after freeze |
| ST collection lines | **MANDATORY BEFORE PAID** | I-FIN-07 / I-PAY-06 |
| Check PAID outcome | **MANDATORY BEFORE PAID** | I-FIN-02; I-PAY-22 |
| OS settled | **MANDATORY BEFORE PAID** | I-OS-07 |
| SR publication | **MANDATORY BEFORE PAID** | SR-INV-04 |
| Attribution | **SAFE AFTER PAID** | Already `awaitAttribution: false` |
| Printing | **SAFE AFTER PAID** | After `settlementRecordId` |
| Realtime | **SAFE AFTER PAID** | Must not gate Confirm |
| Kitchen / expo listing | **SAFE AFTER PAID** as HTTP; **requires paid Check** as visibility predicate | I-PAY-10 |
| Reporting projections | **SAFE AFTER PAID** | Read models |
| Notifications | **SAFE AFTER PAID** | Not money |
| Audit log `payment_confirm` | **WITH commit** (observability; not a second root) | Existing ops log |

Do not move Charges/ST/OS/SR after PAID because they are slow.

---

## 18. Failure Semantics

| Case | Required | Current Option A | Option B independent fact |
|---|---|---|---|
| A. TX succeeds | PAID | Paid Check + §7 set | Undefined vs Revenue |
| B. TX fails | NOT PAID | Rollback | Same if single TX |
| C. HTTP lost after commit | Retry returns committed | Idempotency put + membership replay | Only if replay points at the same root |
| D. Duplicate Confirm | Idempotent | Exclusive + fingerprint + CAS | Needs new unique law |
| E. Downstream fails after PAID | PAID stands; retry downstream | Attribution/print/realtime | If “downstream” **is** Check/SR, PAID without publication |
| F. Browser closes | Durable | Check row | New row must be as durable as Check |
| G. Realtime unavailable | PAID stands | Yes | Yes if money already committed |
| H. Printing fails | No rollback | Yes | Yes |

Option B Case E is the structural failure: PAID that Reporting/Refund cannot see.

---

## 19. Observability Requirements

Existing / required (do not confuse with device heartbeat / SSE ticket expiry):

| Event | Correlate |
|---|---|
| `pos.settlement.initiate` / `payment_confirm` | restaurantId, orderId, checkId, actor, terminal, idempotency |
| Financial TX start / commit / fail | `finalizeStageMs`, `financialTransactionTxWallMs` |
| Idempotent replay | `replayed: true` |
| Concurrent CAS loss | `open_row_lock_lost` / `CheckTransitionError` |
| Tenant reject | Order not found / restaurant mismatch |
| Attribution fail (after PAID) | Must not be labeled Confirm failure |
| Client `cashier_payment_flow` | `settlementDurationMs` — HTTP, not TX-only |

Heartbeat `session_cookie_missing` and SSE `realtime_auth_failed` are **not** Cashier financial failures.

No new production telemetry was added by this program.

---

## 20. Performance Boundary

**Adopted synchronous wait:** ADR-038 §7 financial TX + POS auth/idempotency.

**Already independent of Confirm success:** Attribution, print, realtime, projections.

**Not authorized:** shrinking PAID to hide latency; async money worker; dropping OS/SR from the TX.

A later **in-TX performance** program may profile Charge INSERT / enroll without changing the boundary. That is not this program.

---

## 21. ADR Conflict / Refinement Analysis

| ADR | Relation to Option B |
|---|---|
| **020** | Direct contradiction: sessionless money **must** use Check-centric settle; no new monetary roots; no dual Revenue APIs |
| **021** | New fact would need new idempotency identity; not a reason to fork money |
| **022** | I-OS-07 paid Check ⇒ OS settled in same TX |
| **023** | Check sole financial mutation root; Refund under Check |
| **024** | Mixed Cashier tender ≠ Split Payment; still ST on Check |
| **026** | SR-INV-04/09; R3 rejected SR after Check commit |
| **032** | Refund + compensating SR on Check |
| **037** | I-PAY-02/03/15; rewriting 020 so Payment is the aggregate is **explicitly rejected** |
| **038** | **Cannot be “extended” to Option B.** 038 answers *when* Check appears (inside Confirm), not *whether*. I-PAY-22/23/24 + §7 **require** Check+Charges+ST+OS+SR. Refining 038 to drop Check would **supersede** 038 and contradict its “does not modify I-FIN-01…12” clause |

**ADR-038 refinement:** **No** (would be a silent contradiction).

**ADR-038 superseded for Cashier only:** Would still collide with 020/022/026/032/037 unless **those** are scoped to non-Cashier. Scoping I-FIN-01/02 to “Session only” **reverses** 020’s purpose (Check was generalized **off** Session).

**New ADR required for Option B:** Yes — a **fundamental capability** ADR replacing Check as Revenue root for `cashier_pos`. ADR-020 lists “replacing Check with an Invoice engine” as requiring a new ADR. This program **does not write that ADR** and **does not recommend it**.

**Scope existing invariants to non-Cashier:** **Rejected.** That is Option B by stealth.

---

## 22. Migration Strategy

**None.** Option B is not adopted. Runtime stays on 038.

A hypothetical Option B migration would require: new fact persistence, dual-write or cutover of Revenue, refund rewrite, reporting rewrite, OS/SR policy, and a long dual-read window. Cost is a platform rewrite, not a channel flag.

---

## 23. Rollback Strategy

**N/A** (no implementation). Current rollback of 038 implementation is ordinary git of that program; this investigation changes nothing.

---

## 24. Risks

| Risk | Mitigation |
|---|---|
| UX “check” confused with `operational_checks` | Keep presentation/preview law; do not drop the aggregate |
| Latency pressure → Option B | I-PAY-23/24; this decision |
| Silent reporting of Order Sales as Revenue | Dual-metric law |
| Partial Option C (SR async) | ADR-026 R3 |
| Assuming this report authorizes a new ADR | Implementation authorized = **NO** |

---

## 25. Architecture Options

### Option A — Cashier remains Check-owned at completion

Distinct **entry** (no OPEN Check beforehand). Same **finalize** as other channels.

Correctness, Revenue, Refund, tenant isolation, idempotency: hold. Confirm latency: §7 wall (accepted). Session/kiosk: unchanged.

### Option B — Separate canonical Cashier financial path (hypothesis)

Independent of `operational_checks` for PAID.

Correctness vs I-FIN-01/02: **fails**. Either missing Revenue or a second root (forbidden by this program’s non-goals). Refunds/reporting undefined. Requires superseding 020/022/023/026/032/037/038.

### Option C — Hybrid

Subset of §7 synchronous; remainder after PAID.

Fails I-OS-07 and/or SR-INV-04 and/or I-PAY-23. Not a small exception.

---

## 26. Recommended Decision

**Reject Option B and Option C. Keep Option A.**

Cashier **is** operationally different (employee Confirm, Order-first, presentation “check” UI). That difference is **already** encoded as channel-specific **entry** (038). It is **not** a different monetary ontology.

Evidence does **not** prove that excluding Check from Cashier completion preserves one financial truth. The program’s non-goal “no generic second monetary root” and Option B “independent of Check Aggregate” are the same forbidden design.

---

## 27. Required ADR Changes

**None** for the adopted decision.

Do **not** modify ADR-038 text.

Do **not** create a new ADR in this program.

---

## 28. Required Implementation Program(s)

**None** for a separate Cashier financial path.

Optional later (not authorized here):

- Production Confirm sampling (existing validation gap)
- In-TX profiling of the §7 write set (`PAYMENT-FINANCIAL-COMMIT-PERFORMANCE-1`) — must not change PAID

---

## 29. Explicit Non-Goals (confirmed)

This program did not and must not:

- modify production / client / server code or schema
- create migrations
- modify ADR text
- change Session / Kiosk / Waiter payment
- remove Check or `ensureCheckForOrder` globally
- create a PaymentEngine or `payments` table
- create a second monetary root
- introduce async ambiguity around PAID
- optimize by hiding latency
- weaken idempotency or tenant isolation
- move financial authority to the browser

---

## 30. Certification Gates

This is an architecture decision, not a production certification.

| Gate | Result |
|---|---|
| Evidence from ADRs 020, 022, 023, 024, 026, 032, 037, 038 | Pass (conflicts documented) |
| Runtime path traced | Pass (038 implementation) |
| Option B vs second-root non-goal | Pass — contradiction recorded; B rejected |
| No code/ADR/schema change | Pass |
| Implementation | **Not authorized** — do not treat this report as a charter |

Candidate invariants (scoped correctly):

| ID | Statement | Adopt? |
|---|---|---|
| I-CASHIER-FIN-01 | Confirm MUST NOT require an **OPEN Check beforehand** | **Yes as readiness** — already I-PAY-19. **No** if read as “no Check at PAID” |
| I-CASHIER-FIN-02 | Browser totals are not authority | **Yes** — I-PAY-05 |
| I-CASHIER-FIN-03 | At most one financial completion per sale | **Yes** — one paid Check |
| I-CASHIER-FIN-04 | Idempotent Confirm | **Yes** — POS key + membership + CAS |
| I-CASHIER-FIN-05 | Tenant-isolated | **Yes** — I-FIN-09 + POS gates |
| I-CASHIER-FIN-06 | Successful commit durably establishes PAID | **Yes** — paid Check after COMMIT |
| I-CASHIER-FIN-07 | Downstream cannot change committed money | **Yes** |
| I-CASHIER-FIN-08 | Realtime not a prerequisite | **Yes** |
| I-CASHIER-FIN-09 | Printing not a prerequisite | **Yes** |
| I-CASHIER-FIN-10 | Session/Kiosk/Waiter Check contracts unchanged | **Yes** — I-PAY-20 |
| I-CASHIER-FIN-11 | Cashier PAID means paid Check, not a sibling fact | **Required** — I-FIN-02 |
| I-CASHIER-FIN-12 | Cashier Check UI ≠ `operational_checks` | **Yes** — presentation vs aggregate |

Do **not** publish I-CASHIER-FIN-01…12 as a parallel constitution. They map onto existing I-PAY / I-FIN law except the **invalid** reading of 01 as Check-free completion.

---

ARCHITECTURE DECISION:
REJECT

DECISION:
Do not adopt a Cashier financial completion path independent of the Check Aggregate. Keep ADR-038: distinct Cashier entry (`orderId`, no pre-payment OPEN Check); same Check-owned synchronous completion (Check + Charges + ST + OS + SR). The left-side Cashier “check” UI remains presentation/preview only.

CASHIER FINANCIAL ROOT:
Paid Check (`operational_checks`), written through Payment Confirm (`confirmPayment` / `settleCashierPosOrderPaidByIdDetailed`). Payment is the process, not the root.

CHECK AGGREGATE REQUIRED FOR CASHIER:
YES (at financial completion / PAID). NO as a Confirm *readiness* gate.

SYNCHRONOUS BOUNDARY:
POS auth + CRMP + idempotency + one Check-owned transaction establishing ADR-038 §7. HTTP success only after that COMMIT.

PAID MEANS:
`Check.outcome = paid` after that COMMIT, with collection ST, Order Settlement `settled`, and Settlement Record in the same transaction. It does not mean “cashier clicked Confirm” or “browser showed a total.”

POST-PAID WORK:
Attribution, printing, realtime, reporting/operational projections, kitchen listing consumption. Not Charges, ST, OS, SR, or Check freeze.

SESSION/KIOSK/WAITER IMPACT:
None. `ensureCheckForOrder` and `confirmPayment(checkId)` remain. No global Check removal.

ADR IMPACT:
None. Do not refine or supersede ADR-038 in this program. Option B would require a new fundamental ADR replacing I-FIN-01/02 and related OS/SR/Refund law; that ADR is not written and is not recommended.

IMPLEMENTATION AUTHORIZED:
NO
