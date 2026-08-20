# ADR-ARCH-037: Payment Process Domain

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [← ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-032](./ADR-ARCH-032-refund-platform.md) · [← ADR-ARCH-033](./ADR-ARCH-033-financial-custody-plane.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | PAYMENT-CONSTITUTIONAL-REFINEMENT-1 |
| **Date** | 2026-08-19 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) · [ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [ADR-ARCH-032](./ADR-ARCH-032-refund-platform.md) |
| **Does not modify** | I-FIN-01…12 as monetary-aggregate law · I-OS-* · SR-INV-* · RF-BUDGET / refundableBalance law · Charge composition tables · CRMP custody (028/030/033) · Commercial ADRs 034–036 |
| **Related ADRs** | ADR-ARCH-001 · 002 · 006 · 007 · 014 · 020 · 021 · 022 · 023 · 024 · 025 · 026 · 028 · 030 · 032 · 033 · **038** |
| **Refined by** | [ADR-ARCH-038](./ADR-ARCH-038-cashier-direct-financial-commit.md) — Cashier Confirm MUST NOT require a pre-existing OPEN Check (`cashier_pos` only) |
| **Partially superseded by** | [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) — Payment remains the **process**. On certified adopted channels, the Collection Fact is the collection **aggregate** (one SSOT per transaction). The “Check is the sole monetary aggregate” clause yields **only after adoption certification**. No runtime change from 039. |
| **Related programs** | PAYMENT-DOMAIN-ARCHITECTURE-1 · PAYMENT-LATENCY-FORENSICS-1 · BILL-SIMPLIFICATION-1 · BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 · PAYMENT-COLLECTION-ARCHITECTURE-1 |
| **Implementation status** | **Governance only.** This ADR authorizes no schema, no `payments` table, no PaymentEngine, no CheckService rewrite, and no runtime change. |
| **Numbering note** | Next FSP governance ADR after ADR-ARCH-036. **Must not reuse ADR-ARCH-023 or ADR-ARCH-034** (034 is Commercial Catalog Authority). Successor sequencing: [ADR-ARCH-038](./ADR-ARCH-038-cashier-direct-financial-commit.md). Next free constitutional number after 038 is **039**. |

---

## 1. Purpose

This ADR constitutionalizes **Payment as the financial process domain** without relocating the monetary aggregate.

It answers:

> Who owns calculating, validating, collecting, and finalizing a guest financial obligation — without creating a second money SSOT, a Payment aggregate, a payments table, or a Payment workspace?

**Definition (permanent law):**

> **Payment is the financial process responsible for calculating, validating, collecting, and finalizing a financial obligation.**

Payment owns the **process**, not every persisted financial record.

---

## 2. Owner classes (mandatory)

These four classes MUST NOT be collapsed into one “owner”:

| Class | Meaning | This ADR |
|---|---|---|
| **Domain owner** | Bounded-context vocabulary | Payment process vs Check obligation vs Order operations |
| **Process owner** | Who may decide and run the financial command | **Payment** |
| **Aggregate owner** | Who is the mutation root and persisted obligation | **Check / Bill** |
| **Persisted record owner** | Which table/document is the fact | Charges, Check columns, ST, SR, OS |

Examples:

| Concept | Process owner | Aggregate owner | Persisted record |
|---|---|---|---|
| Tax / discount / grand total | Payment (calculate/validate) | Check | Check money + frozen snapshots |
| Amount due / remaining | Payment | Check obligation + ST facts | Derived; ST is collection store |
| Collection | Payment | Check | `check_settlement_transactions` |
| Confirm Payment | Payment | Check terminal transition | Check outcome + ST + SR + OS |
| Refund command | Payment | Check | Refund SR (history law) |
| Refund budget | Payment may **delegate** | — | Settlement Record history |
| Sale composition | — | Check | Charges |
| Kitchen work | — | Order | Order record + operational listing |

---

## 3. Decision

**The Financial Settlement Platform SHALL treat Payment as the financial process owner and Check/Bill as the sole monetary aggregate that persists the obligation.**

### Constitutional rules

1. **Check / Bill** remains the **sole monetary settlement aggregate** (I-FIN-01) and the persisted financial obligation.
2. **Payment** is the **process** that operates **on** that obligation. Payment is **not** an Aggregate Root (ADR-023 R1 / ADR-024 preserved).
3. **No `payments` table** is required to establish Payment domain ownership (I-PAY-15).
4. **No PaymentEngine / PaymentAggregate / PaymentWorkspace** is required. Cashier remains the UX; Payment may be in-place.
5. **One formula:** `computeCheckMoney`. Cashier **previews**; Payment confirm **authoritatively recomputes**; Check **persists** the result. No second tax, discount, or grand-total engine.
6. **Collection facts** remain `check_settlement_transactions`. Payment writes/validates; the table remains the fact store.
7. **Settlement Record** remains immutable history. Check remains the **producer** (ADR-026). Payment may be the **caller** of finalization.
8. **Order** remains operational. Order Settlement is **not** Bill amount authority (ADR-022).
9. **Order record ≠ operational Order.** An Order row MAY exist before payment (Charge `originOrderId`). Kitchen / Expo / Pickup MUST NOT treat unpaid Cashier `cashier_pos` sales as operational. Operational release follows certified paid/complimentary Check visibility.
10. **Charges** remain sale composition facts **outside** Payment. Payment consumes `SUM(netAmount)`. `originOrderId` remains.
11. **Confirm Payment** is the financial process boundary. Tender selection (نقدًا / شبكة / تسوية) is local UI state until that boundary. تسوية = cash + network collection, not Settlement Record UI.
12. **CheckService MAY host** the certified financial execution implementation (`finalizeOpenCheckById`, `settleCheckPaidByIdDetailed`, `applyRefundOnCheck`) used by Payment. That hosting MUST NOT be mistaken for Payment process ownership. Application Confirm callers MUST enter `confirmPayment`.
13. **Refund command** is a Payment process boundary. **`refundableBalance`** remains Settlement Record history law (ADR-032). No refunds table. No historical rewrite.
14. **Restaurant Tax Policy** remains the policy source. Check retains the frozen tax snapshot. Payment calculates/validates using that snapshot at confirm (live policy only for Cashier preview).
15. **Cashier Mixed collection is not Split Payment (ADR-024).** Incremental FSP Payment finality ≠ Check settlement remains a distinct dormant capability. Cashier Confirm MAY collect and settle atomically in the existing certified TX.

### Interpretation of I-FIN-04

I-FIN-04 remains in force as freeze/open-recalculate law. It MUST NOT be read as authorizing **live Order `totalAmount`** as Bill amount SSOT.

Certified Charge composition already requires Bill money from **Charge `netAmount`** via `computeCheckMoney`. Payment confirm uses that path. Order totals remain Order-domain line money, not Payment/Check amount authority.

A future textual restatement of I-FIN-04 in ADR-020 is optional and is **not** required for this ADR to hold.

---

## 4. Why a new ADR (not a rewrite of 020)

| ADR | Verdict | Action |
|---|---|---|
| 020 | Supports sole Check aggregate; silent on process vs record | **Refine** via this ADR. Do not rewrite R5 / I-FIN-01. |
| 021 | Confirm is a business-idempotent command | **Compatible.** No revision. |
| 022 | OS is not Revenue / Bill amount | **Compatible.** Cite I-PAY-17. |
| 023 | Payment = capability, not AR | **Refine:** distinguish Confirm **process** from Split Payment **capability**. |
| 024 | Payment finality ≠ settlement finality | **Compatible** for incremental FSP; **do not** force Cashier Confirm onto that lifecycle. |
| 026 | SR copy-only; Check producer | **Refine:** Payment may call; Check still produces. |
| 032 | Refund is Check-owned capability | **Refine:** Payment owns the **command process**; Check remains mutation root; budget law unchanged. |
| 033 | Custody ≠ money | **Compatible.** Payment is not custody. |

Rewriting ADR-020 to say “Payment is the monetary aggregate” would **invalidate** R5 and I-FIN-01. That is rejected.

---

## 5. Target journey (UX vs domain)

```
CASHIER (UX)
    → Payment interaction (in-place; not a required workspace)
    → Tender local state
    → Confirm Payment          ← process boundary (I-PAY-12)
    → Payment financial process
    → Check persist + lifecycle
    → ST + SR (+ OS publication)
    → Operational Order release
```

Bill is **not** a Cashier screen, Payment screen, or workflow stage.

**Current implementation:** Confirm callers enter `confirmPayment`. CheckService hosts certified finalize (`settleCheckPaidByIdDetailed` → `finalizeOpenCheckById`) as I-PAY-14 **execution hosting**. That hosting is not an application Confirm API and MUST NOT be used to bypass Payment.

---

## 6. Invariants (I-PAY-01 … I-PAY-18)

| ID | Law |
|---|---|
| **I-PAY-01** | Payment is the financial process owner. |
| **I-PAY-02** | Check/Bill remains the financial aggregate / persisted obligation. |
| **I-PAY-03** | Payment MUST NOT create a competing financial SSOT. |
| **I-PAY-04** | The certified financial formula remains singular (`computeCheckMoney`). |
| **I-PAY-05** | Cashier calculations are preview; Payment confirmation is authoritative. |
| **I-PAY-06** | Collection facts remain in `check_settlement_transactions`. |
| **I-PAY-07** | Settlement Record remains immutable financial history. |
| **I-PAY-08** | Order is operational, not financial amount authority. |
| **I-PAY-09** | Order record existence does not imply operational Order release. |
| **I-PAY-10** | Operational Order release occurs only after successful financial confirmation (certified paid/complimentary Check visibility). |
| **I-PAY-11** | Tender selection remains local UI state. |
| **I-PAY-12** | Confirm Payment is the financial process boundary. |
| **I-PAY-13** | Payment may operate on Check without becoming the Check aggregate. |
| **I-PAY-14** | CheckService may host the certified financial execution implementation used by Payment. Application Confirm callers MUST NOT bypass `confirmPayment`. |
| **I-PAY-15** | No Payment table is required solely to establish Payment domain ownership. |
| **I-PAY-16** | Refund history / `refundableBalance` remain governed by Settlement Record history law. |
| **I-PAY-17** | Order Settlement is not Bill amount authority. |
| **I-PAY-18** | Charges remain sale composition facts and remain outside Payment ownership. |

I-FIN-*, I-OS-*, SR-INV-*, RF-*, FC-INV-* remain in force. I-PAY-* **add** process-vs-record law. They MUST NOT redefine Revenue (I-FIN-02) or move settlement into Order (I-FIN-12).

---

## 7. Lifecycle

Check lifecycle is unchanged:

```
OPEN → PAID | COMPLIMENTARY | VOIDED
```

OPEN is the only mutable financial state. No reopen command. Terminal → OPEN or terminal → other terminal is forbidden unless a future ADR explicitly authorizes it.

Complimentary remains a **Check outcome**, not monetary collection. Complimentary ST publication is not Payment collection (existing `capturedCollectionAmounts` exclusion).

---

## 8. Future extraction (not authorized by this ADR)

Incremental, no big-bang, no historical rewrite, no 0096:

1. Constitutional clarification — **this ADR**.
2. Payment Confirm Service façade calling existing `settleCheckPaidByIdDetailed`.
3. Move real callers to that boundary.
4. Reduce CheckService Payment-process exposure only after callers exist.
5. Harden I-PAY guards.
6. Remove obsolete compatibility surfaces only when unused.

The façade MUST keep: same tables, same TX semantics, same lifecycle, same formula, same SR producer identity.

---

## 9. Explicit non-goals

- Production code, schema, 0096, `payments` table
- PaymentEngine / PaymentAggregate / required Payment workspace or `/payment` route
- CheckService rewrite, Bill/Charge/Order/OS/SR/Refund history redesign
- Formula changes (tax inclusive/exclusive, discount-before-tax)
- Offline Payment
- L3 latency implementation
- Treating ADR-024 Split Payment as Cashier Mixed

---

## 10. Consequences

**Positive:** Cashier UX, Payment process, Check aggregate, and financial records can be named without dual money. Future Payment Confirm Service is constitutionally legal as a façade.

**Cost:** CheckService remains a compatibility host until a successor implementation. Vocabulary must distinguish Payment **process** from ADR-024 Payment **capability**.

**Follow-on implementation:** `PAYMENT-CONFIRM-SERVICE-1` established the Confirm façade. `PAYMENT-CONFIRM-REMAINING-CALLERS-1` routed Session markPaid, SettleOrderPaid, and Counter Pickup through `confirmPayment`. `PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1` removed public barrel paid-confirm re-exports (`settleCheckPaidById`, `settleCheckPaidByIdDetailed`). CheckService remains the I-PAY-14 execution host for `finalizeOpenCheckById`.

---

## 11. Alternatives rejected

| Alternative | Rejected because |
|---|---|
| Payment Aggregate + `payments` table | Second SSOT; violates I-FIN-01 / I-PAY-03 / I-PAY-15 |
| Rewrite ADR-020 so Payment replaces Check | Invalidates R5; historical financial model |
| Cashier as financial SSOT | Violates I-PAY-05 / ADR-006 |
| Amount due from Order / Session / OS | Violates I-PAY-08 / I-PAY-17 |
| New tax/discount engines | Violates I-PAY-04 |
| Force Cashier Confirm onto ADR-024 incremental Payment lifecycle | Conflates atomic cashier settle with dormant Split Payment |
| SR as calculator or Payment UI | Violates I-PAY-07 / SR-INV-01 |

---

## 12. Compatibility

Fully compatible with ADR-020 (Check sole AR), 021 (idempotent confirm), 022 (OS not Bill amount), 023 (Payment not AR), 024 (FSP Split Payment distinct), 026 (SR copy/producer), 032 (refund budget law; command may be wrapped), 033 (custody ≠ money).

Conflict resolution: I-FIN-01 and I-FIN-02 win over any reading that Payment persists a second grandTotal.
