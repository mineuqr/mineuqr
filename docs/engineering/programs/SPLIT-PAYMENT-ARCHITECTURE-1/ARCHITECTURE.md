# SPLIT-PAYMENT-ARCHITECTURE-1 — Architecture

| Field | Value |
|---|---|
| **Status** | Published |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Type** | Architecture Design (no implementation) |
| **Constitutional ADR** | [ADR-ARCH-024](../../../architecture/adrs/ADR-ARCH-024-split-payment-platform.md) |
| **Preserves** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 |
| **Certified baseline** | Check · Order Settlement · FSP · Projection · Read API · Presentation |
| **Successor** | SPLIT-PAYMENT-DOMAIN-1 |

---

## 1. Purpose

Design the **canonical Split Payment Platform**: multiple financial transactions against a **single Check**, with constitutional separation between **Payment Success** and **Financial Settlement**.

Architecture only — no code, schema, migrations, services, repositories, APIs, projections, or UI.

---

## 2. Problem statement

Restaurants receive payment through multiple tenders and over time:

- Cash + Visa · Visa + Apple Pay · Cash + Complimentary  
- Multiple cards · Incremental guest payments · Outstanding paid later  

The platform must support these **without changing** the meaning of Check, Order Settlement, or Revenue.

---

## 3. Split Payment model (canonical concepts)

Each concept: **Purpose · Owner · Lifecycle · Relationships · Non-goals**.

### 3.1 Payment

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Represent an attempt/receipt of financial value toward a Check’s obligations |
| **Owner** | Check Aggregate (FSP capability — **not** Aggregate Root) |
| **Lifecycle** | See §5 Payment Lifecycle |
| **Relationships** | Realized by Tender(s); produces Payment Allocations; may reduce Outstanding when captured/applied |
| **Non-goals** | Not Invoice · Not Revenue · Not auto-Check-settle · Not Order-owned |

### 3.2 Payment Attempt

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Record a try to obtain authorization/capture (esp. card/PSP); may fail |
| **Owner** | Check Aggregate |
| **Lifecycle** | Started → Succeeded (becomes/links Payment) \| Failed \| Cancelled |
| **Relationships** | May produce zero or one successful Payment; emits failure events |
| **Non-goals** | Failed attempts must not reduce Outstanding · Not Settlement |

### 3.3 Tender

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Instrument line recording how value was received (SettlementTransaction today) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Created on capture/apply · Historical after Check terminal |
| **Relationships** | Backs Payment; source for Payment Method Analytics |
| **Non-goals** | Not Aggregate Root · Sum of tenders ≠ Revenue |

### 3.4 Tender Allocation

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Map Tender amounts to Payment / Payment Portions when multi-instrument decomposition is required |
| **Owner** | Check Aggregate |
| **Lifecycle** | Created with capture · Immutable after commit |
| **Relationships** | Tender ↔ Payment |
| **Non-goals** | Must not invent money |

### 3.5 Payment Portion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | A slice of a Payment designated for allocation (operator/guest split input) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Defined at allocation time · Becomes Payment Allocation fact(s) |
| **Relationships** | Child of Payment; input to Allocation Strategy |
| **Non-goals** | Not a separate monetary root |

### 3.6 Settlement Portion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Coverage applied to an Order Settlement (or Check responsibility slice) from Payment Allocation |
| **Owner** | Check Aggregate → updates Order Settlement via Aggregate commands |
| **Lifecycle** | Applied with allocation · Auditable; reverse only via Refund facts |
| **Relationships** | Increases OS `settledAmount` / may transition OS toward `partially_settled` / `settled` **only through Check Aggregate OS commands** |
| **Non-goals** | UI must not mutate OS directly |

### 3.7 Remaining Balance

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Synonym for Check-owned **Outstanding Balance** after applied Payments (ADR-023) |
| **Owner** | Check Aggregate |
| **Lifecycle** | Recalculated while Check open; freezes with terminal Check |
| **Relationships** | Financial Responsibility − Applied Payment value (see conservation) |
| **Non-goals** | Not Presentation-computed authority |

### 3.8 Payment Completion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Payment has successfully received its intended value (captured/settled at Payment level) |
| **Owner** | Check Aggregate (Payment lifecycle) |
| **Lifecycle** | Terminal success of a Payment — **does not** imply Check Financial Completion |
| **Relationships** | See §4 Payment Finality Governance |
| **Non-goals** | Must not auto-set Check `outcome = paid` |

### 3.9 Financial Completion

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Check’s financial obligations are fully satisfied under FSP settle rules (Outstanding = 0 and Check settle command succeeds) |
| **Owner** | Check Aggregate exclusively |
| **Lifecycle** | Achieved by Check settle (`paid` / applicable terminal paths) — may consume many prior Payments |
| **Relationships** | Requires Settlement Completion preconditions (§4) |
| **Non-goals** | Not synonymous with a single Payment Success |

---

## 4. Payment Finality Governance

### 4.1 Constitutional distinction

| Concept | Meaning | Produces Financial Settlement? |
|---------|---------|--------------------------------|
| **Payment Success** | Tender/Payment Attempt succeeded; value received (or authorized per method rules) | **No** |
| **Payment Completion** | That Payment’s lifecycle reached a successful terminal receive state (`captured` / Payment-level `settled`) | **No** |
| **Financial Completion** | Check obligations fully satisfied; Check Aggregate completes settle | **Yes** (Check outcome transition) |
| **Settlement Completion** | Order Settlements and Check outcome reflect full coverage per ADR-020/022 settle rules | **Yes** (via Check commands) |
| **Outstanding Completion** | Remaining Balance = 0 | **Necessary but not sufficient alone** — Check settle command still owns outcome |

**Hard rule:** A successful Payment **MUST NOT** automatically produce Financial Settlement.

Payment completion confirms **value received**.  
Settlement completion confirms **obligations satisfied** under the Financial Settlement Platform.

### 4.2 Completion authority

| Completion type | Sole authority |
|-----------------|----------------|
| Payment Success / Payment Completion | Check Aggregate Payment commands |
| Outstanding update | Check Aggregate |
| Order Settlement coverage update | Check Aggregate → Order Settlement commands |
| Financial Completion / Settlement Completion / Check outcome | **Check Aggregate settle commands only** |

### 4.3 Completion preconditions

**Payment Completion** requires:

- Valid Check (open for incremental apply, or domain-defined capture window)  
- Approved Tender method  
- Amount > 0 and ≤ current Outstanding (I-SP conservation)  
- Tenant isolation  
- Idempotent command outcome (ADR-021)

**Financial Completion** (`paid` path) requires:

- Outstanding Balance = 0 after applied Payments (or single atomic settle that applies remaining)  
- Order Settlements reach required terminal coverage (I-OS-07 for v1 atomic; partial-then-final per domain)  
- Tender conservation at settle: captured tenders sum to Check `grandTotal` (I-FIN-07)  
- Explicit Check settle command (not implied by last Payment)

### 4.4 When Payment Success does NOT complete Financial Settlement

- Partial Payment while Remaining Balance > 0  
- Authorized but not yet captured (method-dependent)  
- Payment Completed but operator has not invoked Check settle (if domain separates apply vs settle)  
- Complimentary / void / refund paths that change obligation without “paid” Revenue  
- Failed or cancelled Payment Attempts  

### 4.5 When multiple Payments together complete Financial Settlement

1. Payments are applied over time (or atomically as multiple Tenders).  
2. Sum of applied Payment value reaches Financial Responsibility.  
3. Remaining Balance = 0.  
4. Check Aggregate executes **Financial Completion** (settle `paid` or equivalent certified path).  
5. Order Settlements reach `settled` (or complimentary rules) per ADR-022.  

Until step 4–5, the Check remains **not** Financially Complete even if many Payments succeeded.

### 4.6 Interaction with Complimentary, Void, Refund, future capabilities

| Capability | Interaction with Payment Finality |
|------------|-----------------------------------|
| **Complimentary** | Not a guest Payment Success that yields Revenue; Check settle `complimentary` is Financial Completion under complimentary rules; may use complimentary Tender lines |
| **Void** | Cancels Check financial path; Payments/Attempts on voided Checks follow void/reversal rules; does not “settle paid” |
| **Refund** | Operates on prior Settlement/Payment facts; **cannot** reopen terminal OS to unpaid (I-OS-14); does not redefine Payment Success |
| **Future (wallet, deposit, store credit)** | New Tender/Payment methods under same Finality law: receive ≠ settle |

### 4.7 Reversal rules (finality)

- Payment Completion reversed only via approved **Refund** / void-of-tender facts — never by editing history.  
- Financial Completion reversed only via approved FSP reverse operations (Refund Platform / void rules) — never by UI.  
- Timeline/history remain append-only (ADR-023).

### 4.8 Failure recovery

- Failed Payment Attempt: no Outstanding reduction; retry creates new Attempt/Payment identity (ADR-021 business keys as defined in domain).  
- Partial capture failure: no silent money; command fails atomically.  
- Orphan authorized Payment: domain timeout/cancel transitions; must not settle Check.

---

## 5. Payment Lifecycle

### 5.1 States

| State | Meaning | Terminal? |
|-------|---------|-----------|
| `pending` | Created, not yet authorized/captured | No |
| `authorized` | Hold/auth obtained; value not finally received | No |
| `captured` | Value received (Payment Success / toward Completion) | Success terminal* |
| `partially_settled` | Payment value partially allocated to settlement targets | No |
| `settled` | Payment fully allocated (Payment Completion at allocation dimension) | Success terminal* |
| `cancelled` | Abandoned before capture | Failure terminal |
| `voided` | Voided after auth/capture per void rules | Failure/reverse terminal |
| `refunded` | Value returned via Refund Platform | Reverse terminal |
| `failed` | Attempt failed | Failure terminal |

\*Success terminals are **Payment-level** only — not Check Financial Completion.

### 5.2 Entry rules

- New Payments enter `pending` (or `authorized`/`captured` directly for cash-like methods per domain).  
- Only Check Aggregate commands create Payments.  
- Amount must respect Outstanding at apply time.

### 5.3 Allowed transitions (conceptual)

```
pending → authorized | captured | cancelled | failed
authorized → captured | voided | cancelled | failed
captured → partially_settled | settled | voided | refunded
partially_settled → settled | refunded | voided
settled → refunded
```

Exact method-specific graphs are refined in SPLIT-PAYMENT-DOMAIN-1 without changing Finality law.

### 5.4 Forbidden transitions

- Any success state → invent Check `outcome = paid` without settle command  
- `failed` / `cancelled` → `settled` without new Payment  
- Terminal → non-terminal reopen of the **same** Payment identity (compensating facts instead)  
- Payment transition that mutates Order Aggregate  

### 5.5 Reversal behavior

- Use Refund / void facts; preserve audit; ADR-021 idempotent reverse commands.

---

## 6. Payment Allocation Architecture

### 6.1 How value is allocated

1. Payment reaches capturable/captured value.  
2. Allocation Strategy (ADR-023) selects targets: Order Settlements, Guest Responsibility slices, or Check-level remainder.  
3. Payment Allocations created (immutable facts).  
4. Check Aggregate applies Settlement Portions via **Order Settlement commands** (`applyPartialSettlement` / full settle paths as appropriate).  
5. Outstanding / Remaining Balance recomputed by Check Aggregate.

### 6.2 Relation to Order Settlement

- OS remains SSOT for per-Order settlement state.  
- Allocation **never** bypasses OS.  
- Partial Payment → OS may become `partially_settled`.  
- Full coverage of an Order’s OS → OS `settled` **only** via OS command under Check.  
- Check may still be `open` if other OS outstanding remain (Financial Completion pending).

### 6.3 Remaining balance determination

```
Financial Responsibility  = Check obligation (open: current bill rules; terminal: frozen grandTotal)
Applied Payment Value     = sum of captured/applied Payments (net of refunds per domain)
Remaining Balance         = Financial Responsibility − Applied Payment Value  (≥ 0)
```

Also:

```
Sum(Payment Allocations for a Payment) ≤ Payment amount
Sum(Settlement Portions from a Payment) ≤ Payment amount
```

### 6.4 Auditability

- Every Allocation is an immutable fact with identity, amounts, targets, timestamps.  
- Financial Events / Timeline Events record apply/allocate/complete.  
- Projection exposes allocation summaries; Write Model remains authority.

---

## 7. Financial Conservation

Compliant with ADR-023 / I-FC-*:

| Law | Statement |
|-----|-----------|
| **I-SP-01** | Allocated Amount + Remaining Balance = Financial Responsibility (Check scope) |
| **I-SP-02** | Money is never duplicated |
| **I-SP-03** | Money is never destroyed without a typed reverse fact |
| **I-SP-04** | Allocations never exceed Payment value |
| **I-SP-05** | Applied Payments never exceed Outstanding / Remaining Balance |
| **I-SP-06** | Payment Success ≠ Financial Settlement (Finality) |
| **I-SP-07** | At Check `paid`, tender conservation I-FIN-07 holds |
| **I-SP-08** | Tenant isolation on all Payment/Tender/Allocation identities |

---

## 8. Ownership Matrix

| Capability | Sole Owner |
|------------|------------|
| Payment / Payment Attempt | Check Aggregate |
| Tender / Tender Allocation | Check Aggregate |
| Payment Allocation / Portions | Check Aggregate |
| Remaining Balance / Outstanding | Check Aggregate |
| Order Settlement state | Check Aggregate (OS Entity) |
| Financial Completion / Check outcome | Check Aggregate |
| Payment Method Analytics | SettlementTransaction (Tender) reads |
| Projection / API / Presentation | Read consumers only |
| Reporting | Read-only metrics |

**No shared ownership. No mutation outside Check Aggregate.**

---

## 9. Aggregate Boundary Diagram

```
+---------------------------------------------------------------------+
|                     Check Aggregate (sole mutator)                  |
|---------------------------------------------------------------------|
| Check (responsibility, outcome, snapshots, Outstanding)             |
| Membership[]                                                        |
| OrderSettlement[]          ← settlement SSOT (per Order)            |
| SettlementTransaction[]    ← Tender ledger                          |
| Payment[] / PaymentAttempt[]                                        |
| PaymentAllocation[] / TenderAllocation[]                            |
| Guest Responsibility* (optional allocation model)                   |
+---------------------------------------------------------------------+
        │ apply Settlement Portion (commands)
        ▼
  Order Settlement lifecycle (partial → settled, etc.)
        │
        │ Financial Completion command (explicit)
        ▼
  Check outcome paid | complimentary | voided
        │
        ▼
  Events → Timeline / Projections / API / Presentation (read)
```

Payment and Tender are **inside** the boundary — **not** new roots.

---

## 10. Capability Relationship Diagram

```
Check Responsibility
  ├── Outstanding / Remaining Balance
  ├── Payment Attempt ──► Payment ──► Tender
  │                         │
  │                         ├── Payment Portion
  │                         └── Payment Allocation ──► Settlement Portion
  │                                                      └── Order Settlement
  ├── (many Payments) ──► Outstanding → 0
  └── Financial Completion (Check settle) ──► Revenue eligibility (paid)
```

**Allowed writes:** Check Aggregate only.  
**Forbidden:** Presentation/API inventing Payments; Order mutating Payments; Projection settling Checks.

---

## 11. Payment methods

### 11.1 Canonical method classes (examples)

| Method | Notes |
|--------|-------|
| Cash | Typically capture-immediate |
| Visa / Mastercard / Mada | May use authorize → capture |
| Apple Pay / STC Pay | Wallet rails; same Finality law |
| Bank Transfer | May be delayed capture |
| Complimentary | Obligation relief path; not guest Revenue Payment |
| Future methods | Additive codes under Tender catalog |

### 11.2 Extension rules

1. New methods are **Tender/Payment method codes** — not new Aggregates.  
2. Must declare auth/capture behavior mapped to Payment lifecycle.  
3. Must obey I-SP conservation and Payment Finality.  
4. Payment Method Analytics remain Tender-based unless a future ADR extends.  
5. PSP `externalReference` may attach to Tender/Payment — not Business Identity.

---

## 12. Partial payments

Supported without redesign:

| Workflow | Architecture handling |
|----------|---------------------|
| Incremental payments | Multiple Payments while Check open |
| Mixed tenders | Multiple Tenders / multi-method Payment |
| Repeated payments | New Payment identities; ADR-021 idempotency |
| Deferred completion | Remaining Balance > 0 until Financial Completion |
| Outstanding later | OUTSTANDING-BALANCE-ARCHITECTURE-1 consumes same Remaining Balance |

---

## 13. Read Model Impact

| Topic | Specification |
|-------|---------------|
| **Ownership** | Additive Split Payment Projection **or** extended Check/OS projections — **read-only**; no redesign of certified OS Projection contracts required for domain start |
| **Fields (conceptual)** | PaymentId, status, amounts, tender methods, allocated total, remaining after payment, checkId, revision |
| **Freshness** | Post-commit materialization; `projectionRevision` / Financial Revision |
| **Versioning** | Schema version bump additive; consumers tolerate unknown fields |
| **Reporting** | Tender distribution from Tender ledger; partial-pay stats from Payment facts |

**No Projection implementation in this program.**

---

## 14. API Impact (future)

| Surface | Direction |
|---------|-----------|
| **Read APIs** | List Payments by Check; get Payment; tender breakdown; remaining balance; allocation view |
| **Mutation APIs** | Apply Payment; allocate; cancel attempt; (Financial Completion remains Check settle APIs) |
| **DTO ownership** | API DTOs from Projection — not Domain entities |
| **Authorization** | Existing restaurant/tenant gates; no bypass |

**Mutation APIs must not collapse Payment Success into Check settle.**  
**No API implementation in this program.**

---

## 15. Presentation Impact

Presentation remains a **pure consumer**:

- Render Payment progress vs Remaining Balance  
- Tender breakdown visualization  
- Clear UX copy: “Payment received” ≠ “Check settled”  
- Loading / error / empty states from API  
- **No** client money authority · **No** auto-settle on payment success UI side-effects without Check settle command  

---

## 16. Reporting Impact

Future read-only additions (no implementation now):

- Tender distribution / method usage (existing Tender SSOT)  
- Split payment ratios (multi-tender Checks)  
- Outstanding balance aging (with Outstanding program)  
- Partial payment statistics  

**Revenue metrics unchanged** (paid Check `grandTotal`).

---

## 17. Event Governance (ADR-021)

| Event class (names) | When |
|---------------------|------|
| `PaymentAttemptStarted` / `PaymentAttemptFailed` | Attempt lifecycle |
| `PaymentAuthorized` / `PaymentCaptured` / `PaymentCompleted` | Payment Success / Completion |
| `PaymentAllocationApplied` | Allocation fact |
| `PaymentCancelled` / `PaymentVoided` | Non-success terminals |
| `CheckFinanciallyCompleted` | **Only** on Check Financial Completion (settle) — not on PaymentCaptured |

**Idempotency:** duplicate apply → `applied` \| `already_in_state` (or equivalent).  
**Replay:** must not inflate Applied Payment Value.  
**Ordering:** Write Model authoritative; consumers tolerate at-least-once.  
**No Event Bus design in this program.**

---

## 18. Architecture constraints (confirmed)

Do **not** redesign: Check Aggregate · Order Settlement · FSP · Projection · API · Presentation.

Maintain: ADR-020 · ADR-021 · ADR-022 · ADR-023.

---

## 19. Successor readiness — SPLIT-PAYMENT-DOMAIN-1

Domain program may implement:

- Payment / Attempt state machine  
- Apply/allocate/cancel commands under Check Aggregate  
- Conservation invariants I-SP-*  
- Finality guards (Payment Success ↛ Check settle)  
- Integration with Order Settlement partial/full commands  

Without architectural redesign.

---

## 20. Success criteria checklist

- [x] Canonical Split Payment Platform defined  
- [x] Payment Success ≠ Financial Settlement (Finality Governance)  
- [x] Check Aggregate sole mutator; no new Aggregate Roots  
- [x] Order Settlement remains settlement SSOT  
- [x] Financial conservation specified  
- [x] Allocation semantics defined  
- [x] Compatible with ADR-020/021/022/023  
- [x] Ready for SPLIT-PAYMENT-DOMAIN-1  

**Certification statement:**  
*Split Payment Architecture is published. Payment Finality is constitutionally separated from Financial Settlement. SPLIT-PAYMENT-DOMAIN-1 may proceed.*
