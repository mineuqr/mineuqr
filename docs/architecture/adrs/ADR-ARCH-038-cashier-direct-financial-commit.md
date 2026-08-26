# ADR-ARCH-038: Cashier Direct Financial Commit Without Pre-Payment Check Readiness

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [← ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted (governance)** |
| **Owner** | Architecture Authority |
| **Program** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-ARCHITECTURE-1 |
| **Date** | 2026-08-19 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) (Cashier Confirm sequencing) · [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) (when OPEN Check appears for `cashier_pos`) |
| **Does not modify** | I-FIN-01…12 monetary-aggregate law · I-PAY-01…18 process-vs-record law (except as **extended** below) · I-OS-* · SR-INV-* · Charge composition ownership · CRMP custody (028/030/033) · Business Tax Policy model · Order aggregate law — **until ADR-ARCH-039 certified adoption**, which **retains I-PAY-19** and **partially supersedes §7** (OS/SR in Confirm) only after Revenue reads Collection Facts |
| **Partially superseded by** | [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) — Target Cashier completion is Collection Fact COMMIT, not Check+OS+SR. **Until Cashier adoption is certified, this ADR’s §7 remains runtime law.** |
| **Related ADRs** | ADR-ARCH-001 · 002 · 006 · 014 · 019 · 020 · 021 · 022 · 023 · 024 · 026 · 028 · 030 · 037 |
| **Related programs** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-ARCHITECTURE-1 · PAYMENT-READINESS-CHECK-ENSURE-FORENSICS-1 · PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1 · POS-CHECK-INTAKE-IMPLEMENTATION-1 · POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1 · PAYMENT-CONFIRM-SERVICE-1 |
| **Implementation status** | **Governance only.** This ADR authorizes **no** production code, schema, migration, or runtime change. Successor: `PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1`. |
| **Numbering note** | Next constitutional FSP ADR after ADR-ARCH-037. A 2026-07-29 RBAC program **placeholder** also suggested “038” for a future entitlement ADR; that placeholder was never published and **does not** occupy this number. Any later RBAC/subscription ADR MUST take the next free Registry number at publication time. **Must not reuse 015 / 023 / 029 / 034.** |

---

## 1. Purpose

This ADR answers one sequencing question left open by ADR-ARCH-037:

> For Cashier (`cashier_pos`), must an **open / ready Check** exist before Payment Confirm may execute?

**Definition (permanent law for `cashier_pos`):**

> **Cashier MUST NOT require a pre-existing, open, or ready Check before Payment Confirm. Payment executes the authoritative financial commit. Check is materialized and finalized as part of that commit and remains the frozen financial obligation record.**

This ADR does **not** ask how to make `ensureCheckForOrder` faster.

---

## 2. Context

### 2.1 Constitutional baseline (ADR-ARCH-037)

Already accepted:

| Law | Meaning |
|---|---|
| I-PAY-01 / I-PAY-12 | Payment is the process / Confirm boundary |
| I-PAY-02 / I-PAY-03 | Check is the sole persisted obligation; no second money SSOT |
| I-PAY-04 / I-PAY-05 | One formula (`computeCheckMoney`); Cashier preview; Confirm authoritative |
| I-PAY-09 / I-PAY-10 | Order row MAY exist before payment; operational release only after paid/complimentary Check |
| I-PAY-14 | CheckService may host finalize; callers enter `confirmPayment` |
| I-PAY-18 | Charges are Check composition, not Payment-owned |

ADR-037 §5 target journey already sequences **Confirm → Payment process → Check persist → ST/SR/OS → operational release**. It did **not** forbid a runtime that still materializes an OPEN Check *before* Confirm.

### 2.2 Runtime (evidence)

**Historical (ADR publication, 2026-08-19):** Cashier Confirm was gated on `pos.check.intake` + OPEN Check.grandTotal. That sequencing is **superseded for Cashier runtime**.

**Current Cashier path** (`CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1`):

```
Cashier دفع (placeSale)
  → pos.sale.create          // commercial Order + items; enrollCheck: false; awaitRelay: false
                             // not Collection Fact; not PAID
  → Payment UI               // payable = sale lines + frozen billDiscount via computeCheckMoney
  → tender (local)
  → تأكيد الدفع / إتمام الدفع
  → pos.settlement.initiate  // confirmPayment({ orderId }), awaitAttribution: false
       freezeCashierPosPayableFromOrder
       Collection Fact COMMIT = PAID
  → paidReceipt (invoice number / date / time)
  → Print
  → attribution / operational Check / SR (background)
```

Customer-facing invoice number/date/time are **paidReceipt** after PAID, not the Payment overlay.

`IdentityPlaceOrderService` default `enrollCheck: true` still enrolls sessionless/ephemeral channels (kiosk/waiter). POS sale sets `enrollCheck: false`. Cashier Confirm does **not** require an OPEN Check.

Program-local POS-CHECK-01 / POS-SETTLE-01 describe older Check-intake transport and **do not** override this Cashier path.

### 2.3 Operational listing (evidence)

`cashierPosOperationalVisibility.ts`: `cashier_pos` Orders are listed operationally only when an active membership points at a **paid or complimentary** Check. Sale persist may advance `cashier_pos` pending → preparing; that is **not** operational release (I-PAY-10 still holds).

---

## 3. Problem Statement

Cashier Confirm is gated on **pre-payment Check materialization**, not on Payment.

Production stage samples of `ensureCheckForOrder` were approximately **2.85 s**, of which the Check-owned transaction wall was approximately **2.5 s** (enroll, Charge snapshot INSERTs, Order Settlement insert). `computeCheckMoney` was ~0 ms.

That work currently runs **to enable Confirm**. Confirm then runs a **second** financial transaction (freeze, collection, OS settle, SR).

The defect is architectural **placement**, not the existence of Check, Charges, OS, or SR.

---

## 4. Evidence (production + repository)

| Claim | Evidence |
|---|---|
| Intake is on the Cashier critical path | `CashierWorkspacePanel.orchestrateIntake` after `sale.create` |
| Confirm requires open Check money | `cashierPaymentReadiness.ts` (`checkAvailable`, `confirmDisabled`) |
| Confirm API requires `checkId` | `PaymentConfirmService.confirmPayment` |
| Finalize requires OPEN Check | `finalizeOpenCheckById` |
| Sale does not enroll Check on HTTP | `PosSaleService` `enrollCheck: false` |
| Sessionless consumer still enrolls | `OrderSessionConsumer.handleOrderCreated` when `sessionId == null` |
| Discount on Confirm | `settlementInitiateInput.billDiscountAmount`; Cashier sends frozen prepared `directSale.money.billDiscountAmount` |
| Financial commit set at Confirm | `finalizeOpenCheckById` TX: Charge SUM, `computeCheckMoney`, ST, Check PAID, OS settle, SR |
| Attribution not on financial TX | `awaitAttribution: false` on Cashier Confirm |
| Unpaid cashier_pos hidden from ops lists | `cashierPosPaidOperationalVisibilitySql` |
| No PaymentEngine / payments table | ADR-037 I-PAY-15; schema `operationalChecks` |

**Publication-time contradiction (resolved in Cashier runtime):** ADR-037 I-PAY-09/12 already *allowed* Order-before-Check and Confirm-as-boundary. Cashier Confirm now uses `orderId` + Collection Fact; it does **not** require an OPEN Check. This ADR **does not** rewrite I-FIN-04’s historical “Order totalAmount” wording (ADR-037 already forbids reading that as Bill SSOT).

---

## 5. Decision

**For ordering channel `cashier_pos`, the platform SHALL NOT require a pre-existing, open, or ready Check before Payment Confirm.**

Cashier submits commercial sale identity and payment intent. Payment executes Confirm. The server validates and derives authoritative money. Check (including Charges and frozen snapshots) is materialized and transitioned to **PAID** as part of the **same synchronous financial commit** that writes collection facts, Order Settlement terminal state, and Settlement Record.

### Constitutional rules

1. **I-PAY-19** — For `cashier_pos`, Confirm MUST NOT require a pre-existing or ready Check, `Check.grandTotal`, or `pos.check.intake` / `ensureCheckForOrder` as a readiness gate.
2. **I-PAY-20** — Direct Check materialization at Confirm is **scoped to `cashier_pos`**. Other channels MAY retain pre-payment Check readiness where their contracts require it. `ensureCheckForOrder` is **not** globally deprecated.
3. **I-PAY-21** — A `cashier_pos` Order MUST NOT be automatically enrolled into an Open Check **solely** because the Order exists, when that enrollment exists only to satisfy the old Cashier readiness path. (Does not prescribe the consumer patch; implementation must trace `OrderSessionConsumer` / `enrollCheck`.)
4. **I-PAY-22** — Financial success MUST NOT be reported until the required financial commit state is established (see §7).
5. **I-PAY-23** — Financial commit remains **synchronous** under this ADR. Immediate HTTP success with background financial commit is **forbidden** here and requires a **separate ADR**.
6. **I-PAY-24** — The observed ~2.5 s Confirm/financial-TX wall is **retained** as current commit cost. This ADR does **not** classify that duration as a defect to be “fixed” by weakening the TX, moving OS/SR out, or async commit.
7. Check lifecycle remains `OPEN → PAID | COMPLIMENTARY | VOIDED`. For Cashier direct commit, OPEN MAY exist only **inside** the financial transaction (not as a Cashier UX/readiness state).
8. Tax snapshot for a Check created at Confirm is taken at **materialization inside that commit**, from existing restaurant Business Tax Policy fields (`taxEnabled`, `taxMode`, `taxPolicyJson`, rates). This ADR does **not** redesign tax policy.
9. Discount: Cashier submits **intent**; server validates and applies inside Confirm via existing Check `billDiscountAmount` + `computeCheckMoney`. Browser discount totals are not authority.
10. Application Confirm callers still enter `confirmPayment` (I-PAY-14). CheckService remains the execution host. No PaymentEngine. No `payments` table.

---

## 6. Architectural Boundaries

| Domain | Owns | Does not own |
|---|---|---|
| **Order** | Commercial order, lines, operational sale identity | Bill amount, collection, SR |
| **Cashier / React** | Ticket UX, tender local state (I-PAY-11), discount *intent*, idempotency keys, terminal context | Grand total, tax, authoritative discount, Check, Payment process |
| **Payment** | Confirm command and financial execution boundary | Monetary aggregate, Charge rows, SR document, OS entity |
| **Check** | Frozen obligation, money columns, snapshots, Charge composition, terminal transition | Kitchen listing, Session façade, CRMP custody |
| **Settlement Transaction** | Collection / payment-method facts | Revenue root |
| **Order Settlement** | Per-enrolled-Order financial state (ADR-022); I-OS-07 at paid Check | Bill `grandTotal` (I-PAY-17) |
| **Settlement Record** | Immutable settlement fact (ADR-026); same TX as finalize (SR-INV-04) | Calculator, Payment UI |
| **Session** | Operational visit façade | Cashier sale (sessionless) |
| **CRMP** | Register / Shift context required for Confirm | Money |

---

## 7. Financial Commit Boundary

**Required committed set for Cashier paid Confirm** (derived from `finalizeOpenCheckById` + this sequencing decision):

```
Check (materialized if absent + frozen PAID)
+ authoritative Charges (Check composition from persisted Order items)
+ collection facts (check_settlement_transactions)
+ Order Settlement (enroll row + terminal settled state; I-OS-07)
+ Settlement Record (SR-INV-04)
```

**Outside** that TX (unchanged): Attribution (`awaitAttribution: false` on Cashier), outbox/relay, kitchen/expo listing, printing, reporting projections, client invalidation.

**Not** in the financial TX: `pos.sale.create` Order persist (prior commercial commit; I-PAY-09).

**Forbidden by this ADR:** splitting SR or OS out of the financial TX to hide latency; reporting PAID before COMMIT; async financial worker.

`createOpenCheck` today INSERTs **outside** the enroll TX. Successor implementation MUST NOT leave a **committed** OPEN Check if Confirm fails. Materialization and finalization belong in **one** Check-owned transaction for this path.

---

## 8. Check Materialization Rule

For `cashier_pos`:

- Check materialization is **not** a Payment prerequisite.
- Check MAY be created, enrolled, Charged, and finalized inside Confirm’s financial TX.
- The resulting Check is the frozen obligation (I-PAY-02).
- Payment consumes `SUM(Charge.netAmount)` via `computeCheckMoney` (I-PAY-04, I-PAY-18); it does not own Charges.

This does **not** authorize removing Check, moving money to Payment UI, or a browser ledger.

If an OPEN Check **already** exists (migration overlap, race, other writer), Confirm remains the process that finalizes it — still via `confirmPayment` — without inventing a second settle API.

---

## 9. Cashier Readiness Rule

Confirm enablement MUST NOT depend on:

- Open Check
- “Ready Check”
- `Check.grandTotal`
- `pos.check.intake` completion
- `ensureCheckForOrder`
- `pos.read.check.getByOrder` as a Confirm gate

Confirm enablement MAY depend on actual commercial/payment readiness already present in the client/server contract, including:

- Successful `pos.sale.create` (persisted `orderId`)
- Non-empty sale items at sale time (server-priced Order lines)
- Tender mode (`نقدًا` / `شبكة` / mixed local state) and tender plan (`resolveCashierSettlementPlan` / `canConfirmCashierSettlement`)
- Required POS authorization and CRMP Register/Shift context (enforced **on Confirm**, not as Check readiness)
- Idempotency key for `pos.settlement.initiate`

Display amounts before commit remain **preview** (`displayCashierTicketMoney` / live restaurant tax). Preview MUST NOT become payable authority. Server MUST reject collection lines that do not satisfy Check-owned validation against **server** `grandTotal`.

Exact UI state names remain implementation (`salePhase`, `tenderMode`, `paymentReadiness`). This ADR forbids only the **Check-ready** gate.

---

## 10. Channel Scope

| Channel | Pre-payment OPEN Check |
|---|---|
| **`cashier_pos`** | **Not required** (this ADR) |
| Session / table dining | **Preserved** where Session Check is the visit bill |
| Kiosk / waiter / `enrollCheck: true` | **Preserved** (IdentityPlaceOrder default enroll) |
| SettleOrderPaid / Counter Pickup unpaid queues | **Preserved** unless a later ADR says otherwise |

`ensureCheckForOrder` remains the Check-domain enroll API for channels that need an OPEN Check before collection.

---

## 11. Invariants

### 11.1 Existing law this ADR relies on (not restated as new IDs)

| ID | Use here |
|---|---|
| I-PAY-01, I-PAY-12 | Payment remains execution boundary (**prompt I-PAY-038-02**) |
| I-PAY-02, I-PAY-03, I-PAY-15 | Check remains obligation; no payments table (**038-03**) |
| I-PAY-04 | Singular `computeCheckMoney`; not moved to React |
| I-PAY-05, ADR-006 | Browser is not financial authority (**038-04**) |
| I-PAY-06, I-PAY-07, I-PAY-17, I-PAY-18 | ST / SR / OS / Charges ownership |
| I-PAY-09, I-PAY-10 | Order before operational release |
| I-PAY-11 | Tender local until Confirm |
| I-PAY-14 | `confirmPayment` façade; Check hosts finalize |
| I-OS-07 | Paid Check ⇒ OS settled in the same financial TX |
| SR-INV-04 | SR in the same financial TX as Check finalization |
| ADR-021 | Confirm is a business-idempotent command |

### 11.2 New invariants (I-PAY-19 … I-PAY-24)

| ID | Law | Prompt alias |
|---|---|---|
| **I-PAY-19** | `cashier_pos` Confirm MUST NOT require a pre-existing or ready Check. | I-PAY-038-01 |
| **I-PAY-20** | Direct materialization-at-Confirm is scoped to `cashier_pos`. | I-PAY-038-06 |
| **I-PAY-21** | Other channels MAY retain pre-payment Check readiness. `ensureCheckForOrder` is not globally removed. | I-PAY-038-07 |
| **I-PAY-22** | Financial success MUST NOT be reported before the §7 commit set is established. | I-PAY-038-05 |
| **I-PAY-23** | Financial commit remains synchronous. Async/background commit is out of scope. | I-PAY-038-10 |
| **I-PAY-24** | ~2.5 s current financial commit latency is retained; this ADR does not reclassify it as a defect or authorize TX weakening to hide it. | I-PAY-038-11 |
| *(coverage)* | Duplicate/retry Confirm MUST NOT duplicate Check/Charges/ST/OS/SR. | I-PAY-038-08 → ADR-021 + §12 |
| *(coverage)* | Concurrent Confirms MUST NOT produce multiple financial outcomes for the same intent. | I-PAY-038-09 → §12 |

I-FIN-*, I-OS-*, SR-INV-*, I-PAY-01…18 remain in force. I-PAY-19…24 **add** Cashier sequencing law. They MUST NOT redefine Revenue (I-FIN-02) or move settlement into Order (I-FIN-12).

---

## 12. Idempotency / Concurrency

Do **not** invent a new idempotency framework.

Reuse:

- **ADR-ARCH-021** — Confirm is a business-idempotent command (not transport-ledger-only).
- POS settlement **fingerprint + `runExclusive` envelope** (`PosSettlementInitiateService`) — one intent per key.
- Check **outcome CAS** (`touchOpenCheck` / `CheckTransitionError` paid recovery).
- **Membership blocking** (one active non-void Check per Order).
- **SR uniqueness** (ADR-026).

One financial intent → one Check, one Charge set, one collection, one OS terminal state, one SR.

Sale idempotency remains a **separate** command (ADR-POS-SALE-04). Intake idempotency is not part of Cashier Confirm after cutover.

Concurrency: existing exclusive envelope + CAS. This ADR does not prescribe new lock probes or isolation levels.

---

## 13. Authorization

Confirm remains server-authorized. Browser grants nothing.

Preserve (current POS settlement path):

- Tenant / restaurant scope (`assertRestaurantPosScope`)
- `POS_ACCESS` + `SETTLEMENT_INITIATE` (not owner/admin/RBAC bypass)
- Terminal lifecycle (`resolvePosTerminalAccess`)
- CRMP Register/Shift (`requireResolvedContextForSettlement`) — fail closed; do not invent context (ADR-030)
- Channel: Order `orderingChannel === cashier_pos`

Commercial entitlement enforcement remains orthogonal and fail-closed where the procedure already requires it.

---

## 14. Failure Semantics

| Phase | Law |
|---|---|
| **Before financial COMMIT** | No PAID Check, no SR, no success UX that implies paid. Unpaid `cashier_pos` Order MAY exist (I-PAY-09). |
| **During financial TX** | Existing atomic semantics. Failed TX MUST NOT publish a partial PAID+ST+OS+SR outcome. For this path, MUST NOT leave a committed OPEN Check whose only purpose was a failed Confirm. |
| **After financial COMMIT** | Operational failure (Attribution, kitchen, print, relay) MUST NOT revert PAID to unpaid. Retry via existing outbox/consumers. |

**Unpaid Order cancel:** An unpaid Cashier Order MUST NOT *constitutionally* require an OPEN Check merely to remain cancellable. Current Counter Pickup cancel **voids an unpaid Check then cancels Order**. Exact cancel command without Check is an **implementation prerequisite**; if Order-lifecycle semantics must change, that is a **follow-up ADR**, not a silent expansion of this one.

---

## 15. Performance Implications

| Item | Decision |
|---|---|
| Removed from **pre-payment readiness** | ~2.85 s `ensureCheckForOrder` / intake materialization as a Confirm gate |
| Retained on **Confirm** | ~2.5 s current financial commit (synchronous) |
| Not authorized | Commit optimization, parallelization, background commit, offline queue |

UX model:

```
Pay / Confirm
  → Financial Commit ≈ current ~2.5s (synchronous)
  → Financial SUCCESS / PAID
  → Cashier release (“تم الدفع بنجاح”)
  → Printing / operational processing
```

Forbidden:

```
Pay → immediate HTTP success → background financial commit
```

---

## 16. Consequences

**Positive**

- Removes unnecessary pre-payment Check work from Cashier Confirm enablement.
- Aligns Cashier with Payment-as-process (ADR-037) and Order-before-operational-release (I-PAY-09/10).
- Preserves Check as obligation authority and server `computeCheckMoney`.
- Failed Confirm need not orphan an OPEN Check if materialize+finalize share one TX.
- Separates commercial sale state from financial obligation state.

**Trade-offs**

- Confirm TX becomes responsible for Check materialization for `cashier_pos` (larger commit, still synchronous ~2.5 s).
- Idempotency/concurrency on Confirm are P0 (create+pay in one intent).
- Channels diverge: Session/kiosk may still pre-create OPEN Checks.
- Cancel-without-Check and `OrderSessionConsumer` behavior need implementation care.
- Program-local POS-CHECK-01 / POS-SETTLE-01 Cashier sequencing is superseded **as readiness law**; the procedures may remain until the implementation program retires Cashier intake.

---

## 17. Non-Goals

This ADR MUST NOT:

- Introduce PaymentEngine or a `payments` table
- Move `computeCheckMoney` or financial totals to React
- Make browser `grandTotal` / tax / discount authoritative
- Remove Check or change Check / Payment / OS / SR ownership
- Move SR or OS outside the financial TX
- Introduce offline financial mode, local financial queue/DB, or async commit
- Change PAID semantics or redesign Session / Order / Business Tax Policy
- Globally remove `ensureCheckForOrder`
- Perform a full rewrite or authorize production implementation by itself

---

## 18. Implementation Constraints

Successor `PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1` MUST:

1. Keep `confirmPayment` as the application Confirm entry (I-PAY-14).
2. Derive Charges from **persisted Order items**, not from a replayed browser ticket (ticket is cleared after sale).
3. Carry discount **intent** on the Confirm/POS settlement command (today it lives on intake).
4. Freeze tax snapshot at Check materialization inside Confirm (existing restaurant tax fields).
5. Use one financial TX for materialize + PAID + ST + OS + SR on this path.
6. Stop using Check readiness as the Cashier Confirm gate.
7. Trace and neutralize `cashier_pos` auto-enroll that exists only for the old readiness path (`OrderSessionConsumer` and any other writer).
8. Leave Session/kiosk/`enrollCheck: true` paths on their existing OPEN Check contract unless a later ADR says otherwise.
9. Preserve `awaitAttribution: false` for Cashier HTTP.
10. Not optimize, batch, or relocate OS/SR “to make 2.5 s smaller” under this ADR.

This ADR does **not** specify function signatures, SQL, or patch lists.

---

## 19. Validation Requirements

A future implementation program is certified against this ADR only if:

- Cashier Confirm can execute without a pre-existing OPEN Check
- Server remains money authority; no client grand total accepted as truth
- Check is the frozen obligation after commit
- ST + OS settled + SR commit atomically with PAID
- Duplicate/concurrent Confirm cannot double-commit
- `cashier_pos` operational lists still require paid/complimentary Check
- Other channels’ `ensureCheckForOrder` behavior is not silently removed
- Financial success is not returned before COMMIT
- Commit remains synchronous

---

## 20. Related ADRs

| ADR | Relationship |
|---|---|
| **037** | Process vs record; this ADR adds Confirm sequencing for Cashier |
| **020** | Check sole AR; OPEN may be intra-TX for Cashier |
| **021** | Confirm idempotency |
| **022** | OS Check-owned; I-OS-07 in the financial TX |
| **026** | SR Check-produced; SR-INV-04 in the financial TX |
| **028 / 030 / 033** | CRMP context required; custody ≠ money |
| **006** | UI presentation only |
| **001 / 019** | Order / identity remain commercial |
| **012** | Printing/kitchen after events; not financial authority |
| POS-CHECK-01 / POS-SETTLE-01 | Program-local; Cashier *readiness* sequencing superseded by this constitutional ADR |

---

## 21. Follow-up / Prerequisites

Classified so they are not buried as TODOs:

| Item | Class |
|---|---|
| `PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1` | Implementation program (consumes this ADR) |
| `confirmPayment` / finalize can materialize Check when absent | Implementation prerequisite |
| Discount intent on Confirm command | Implementation prerequisite |
| `OrderSessionConsumer` (and similar) must not enroll `cashier_pos` solely for readiness | Implementation prerequisite (I-PAY-21) |
| Cashier UI Confirm gate without `Check.grandTotal` | Implementation prerequisite |
| Unpaid `cashier_pos` cancel without OPEN Check | Implementation prerequisite; **follow-up ADR** only if Order lifecycle law must change |
| Amend POS-CHECK-01 / POS-SETTLE-01 in the implementation program | Program-local ADR hygiene |
| Async financial commit / hide 2.5 s | **Out of scope** — separate architecture program + ADR |
| Shrinking the 2.5 s TX (batch Charges, etc.) | **Out of scope** — separate optimization program; must not violate §7 |
| Globally retiring `ensureCheckForOrder` | **Out of scope** |

---

## 22. Alternatives rejected

| Alternative | Rejected because |
|---|---|
| Optimize `ensureCheckForOrder` and keep the Confirm gate | Treats a sequencing error as a performance bug |
| Async/background financial commit | No durable acceptance/recovery ADR; violates I-PAY-22/23 |
| Browser grand total as payable | I-PAY-05 / ADR-006 |
| PaymentEngine / payments table | I-PAY-03 / I-PAY-15 |
| Create Check PAID without Check-owned Charges/`computeCheckMoney` | I-PAY-04 / I-PAY-18 |
| Move OS or SR after COMMIT | I-OS-07 / SR-INV-04 |
| Apply this sequencing to all channels | Session/kiosk contracts need OPEN Checks; I-PAY-20 |
| Delete `ensureCheckForOrder` in this ADR | Implementation + other channels |
| Fold Order persist into the financial TX | Mixed aggregates; sale already committed |

---

## 23. Compatibility

Compatible with ADR-020, 021, 022, 026, 028, 030, 033, 037.

Conflict resolution:

- I-FIN-01 / I-PAY-02 win over any reading that Payment persists a second grand total.
- I-PAY-19 wins over POS-CHECK-01 / POS-SETTLE-01 / Cashier UI **as Cashier Confirm readiness law**.
- I-PAY-20 wins over any reading that this ADR deprecates Session/kiosk OPEN Checks.

---

## 24. Decision Authority

Architecture Authority. Binding once registered (Constitution §26). Runtime compliance requires the successor implementation program.

---

## 25. Certification / Status

| Criterion | Status |
|---|---|
| Decision supported by repository trace | **Met** |
| Ownership preserved | **Met** |
| Financial authority remains server/Check formula | **Met** |
| Channel scope explicit | **Met** |
| Sync commit / no async commit | **Met** |
| Production code / schema in this publication | **None** |
| Runtime currently compliant | **No** (still gates Confirm on OPEN Check) |
| Implementation authorized by this ADR alone | **No** |

**Governance certification:** ADR **Accepted** as platform law.

---

## 26. Architecture Decision Review

**Verdict: ACCEPT WITH CONDITIONS**

The repository supports the decision: ADR-037 already separates Payment process from Check record; operational listing already waits for a **paid** Check; production cost is pre-payment materialization, not `computeCheckMoney`. Runtime still implements the opposite gate, so this ADR is **governance**, not a claim that production already complies.

### Conditions (all required before implementation is certified)

1. Successor program `PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1` is chartered against this ADR.
2. Confirm path can materialize+finalize Check in **one** financial TX when no Check exists; no committed OPEN leftover on failure.
3. `cashier_pos` is not auto-enrolled into an OPEN Check solely to feed Confirm readiness.
4. Confirm contract carries discount intent; does not accept client grand total/tax as truth.
5. Cashier Confirm UI is not gated on open `Check.grandTotal`.
6. Unpaid Order cancel without OPEN Check is designed without silently changing Order lifecycle law (follow-up ADR if needed).
7. Session/kiosk/`ensureCheckForOrder` contracts remain unless explicitly in scope.
8. `awaitAttribution: false`, CRMP fail-closed, CAS, SR-INV-04, I-OS-07, I-PAY-04 remain.
9. No async financial commit, PaymentEngine, payments table, or OS/SR extraction.

**Final decision statement**

> Cashier may represent and submit a commercial sale/payment intent without a pre-existing Check. Payment is responsible for executing the authoritative financial commit. Check is materialized/finalized as part of that financial commit and remains the frozen financial obligation record. The current approximately 2.5s Financial Commit remains synchronous for now. The architecture intentionally removes unnecessary pre-payment Check readiness; it does not remove, weaken, or bypass the financial commit.
