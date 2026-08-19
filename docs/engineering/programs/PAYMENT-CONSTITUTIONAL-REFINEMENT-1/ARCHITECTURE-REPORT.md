# PAYMENT-CONSTITUTIONAL-REFINEMENT-1

**Kind:** Constitutional / ADR refinement. **Not** an implementation program.

**Result: PASS**

Published: [ADR-ARCH-037 Payment Process Domain](../../../architecture/adrs/ADR-ARCH-037-payment-process-domain.md)
Registry: [ADR-Registry](../../../architecture/constitution/ADR-Registry.md)

No production code. No 0096. No `payments` table. No PaymentEngine. No CheckService rewrite. No historical financial rewrite.

**Recommended next implementation program:** `PAYMENT-CONFIRM-SERVICE-1`

---

## 1. Executive Summary

PAYMENT-DOMAIN-ARCHITECTURE-1 found that Payment should own the **financial process** and Check/Bill should remain the **financial aggregate**. ADR-020 already forbids a second monetary aggregate. ADR-034 is **Commercial Catalog Authority**, so this refinement is **ADR-ARCH-037** (not 034).

ADR-037 is **Accepted (governance only)**. It refines 020, 023, 024, 026, and 032 by pointer. It does **not** supersede them. I-FIN-01…12 remain monetary-aggregate law. I-PAY-01…18 add process-vs-record law.

CheckService hosting `finalizeOpenCheckById` / `settleCheckPaidByIdDetailed` is now **explicit compatibility** (I-PAY-14), not silent Payment ownership.

---

## 2. Constitutional Problem Statement

The Cashier already behaves as: sale → Payment interaction → Confirm → records → operational Order.

The constitution named Check as sole monetary aggregate and named Payment only as an FSP **capability** (ADR-023/024 incremental Split Payment). It did not name **Confirm Payment** as the process that calculates, collects, and finalizes the obligation.

Without that distinction, implementers either:

- treat CheckService as “Payment,” or
- invent a Payment aggregate / `payments` table.

Both are wrong. The missing law is process vs aggregate vs persisted fact.

---

## 3. Current Architecture

```
Cashier UX
  → pos.sale.create          (Order record; not operational listing)
  → pos.check.intake         (Check + Charges + freeze)
  → local tender state
  → pos.settlement.initiate
       → CheckService.settleCheckPaidByIdDetailed
            → finalizeOpenCheckById
                 ST + Check paid + OS + SR
  → operational visibility on paid Check
```

Formula: `computeCheckMoney`. Collection: `check_settlement_transactions`. History: Settlement Record produced by Check.

---

## 4. Current Ownership Model

| Concern | Today in code | Today in ADRs |
|---|---|---|
| Obligation persist | Check | I-FIN-01 |
| Calculate money | CheckService calls `computeCheckMoney` | I-FIN-04 text still says Order totals (practice is Charges) |
| Collect | ST in finalize | I-FIN-07 / collection architecture |
| Confirm | POS → CheckService | Unnamed process |
| Refund command | CheckService façade | ADR-032 Check capability |
| Refund budget | SR history | RF-BUDGET |
| Payment (FSP) | Dormant Split Payment | ADR-023/024 capability, not AR |

---

## 5. Refined Payment Definition

**CURRENT:** FSP capability describing received-value intent (ADR-023); incremental Split Payment (ADR-024).
**TARGET:** “Payment is the financial process responsible for calculating, validating, collecting, and finalizing a financial obligation.”
**REASON:** Matches Cashier Confirm without a second aggregate.
**INVARIANT:** I-PAY-01, I-PAY-03, I-PAY-13.
**ADR IMPACT:** ADR-037; 023/024 refined by pointer.
**IMPLEMENTATION IMPACT:** None now. Later façade.
**MIGRATION RISK:** None.

---

## 6. Refined Check/Bill Definition

**CURRENT:** Sole monetary aggregate; also runs Payment via CheckService.
**TARGET:** Financial aggregate that persists identity, Charges, frozen snapshots, money columns, lifecycle OPEN→PAID|COMPLIMENTARY|VOIDED. Payment operates **on** it.
**REASON:** Preserve I-FIN-01 / R5.
**INVARIANT:** I-PAY-02, I-PAY-13.
**ADR IMPACT:** 020 refined by 037; I-FIN-* not rewritten.
**IMPLEMENTATION IMPACT:** None.
**MIGRATION RISK:** None.

---

## 7. Refined Order Definition

**CURRENT:** Operational aggregate; cashier_pos row may exist before pay.
**TARGET:** Operational domain. Order record ≠ operational Order (I-PAY-09/10). Not tax/discount/grandTotal/amountDue/collection/refund-budget authority (I-PAY-08).
**REASON:** Charge `originOrderId` vs kitchen listing.
**INVARIANT:** I-PAY-08…10, I-FIN-12.
**ADR IMPACT:** 022 refined by pointer.
**IMPLEMENTATION IMPACT:** None.
**MIGRATION RISK:** None.

---

## 8. Financial Record Definitions

| Record | Definition |
|---|---|
| Charges | Sale composition facts; outside Payment (I-PAY-18) |
| Check columns | Persisted obligation + frozen policy |
| `check_settlement_transactions` | Authoritative collection facts (I-PAY-06) |
| Settlement Record | Immutable history; Check producer (I-PAY-07) |
| Order Settlement | Per-Order publication; not Bill amount (I-PAY-17) |

---

## 9. Responsibility Matrix

| Responsibility | Process | Aggregate | Persist |
|---|---|---|---|
| Tax policy | Restaurant settings | — | Check freeze |
| Tax calc | Payment | Check | Check `taxAmount` |
| Discount | Payment validate | Check | `billDiscountAmount` |
| Grand Total | Payment | Check | `grandTotal` |
| Amount due / remaining | Payment | Check + ST | Derived |
| Tender UI | Cashier | — | None until confirm |
| Collection | Payment | Check | ST |
| Confirm | Payment | Check terminal | Check+ST+SR+OS |
| Refund command | Payment | Check | Refund SR |
| Refund budget | Delegate | — | SR law |
| Charges | — | Check | `check_charges` |
| Kitchen release | — | Order | Visibility on paid Check |

---

## 10. SSOT Matrix

| Question | SSOT |
|---|---|
| What is owed? | Check money from Charges + discount + frozen tax via `computeCheckMoney` |
| What was collected? | Captured monetary ST |
| What is due now? | grandTotal − captured ST |
| What is Revenue? | Paid Check `grandTotal` (I-FIN-02) |
| What did we publish? | SR copy |
| What is Order coverage? | OS (not Bill amount) |
| What may Kitchen see? | Operational listing after paid/complimentary Check |

One calculation path. Facts are not competing calculators.

---

## 11. Transaction Boundary Matrix

| Boundary | Current | Target |
|---|---|---|
| Confirm Payment | One Check-owned TX in `finalizeOpenCheckById` | Same TX; Payment Confirm Service is the **caller** |
| Refund apply | Check TX + SR refund kind | Same; Payment is caller |
| Sale create | Order persist TX | Unchanged (record, not operational release) |
| Intake | Check create + Charges | Unchanged obligation create |

Do not split ST / Check paid / SR / OS across commits.

---

## 12. ADR Impact Analysis

| ADR | Conflict? | Already supports? | Clarification? | Revision? | New ADR? |
|---|---|---|---|---|---|
| 020 | No if Payment ≠ aggregate | Yes — sole Check AR | Yes — process vs record; I-FIN-04 vs Charges | Pointer only | No rewrite |
| 021 | No | Yes — command idempotency | Confirm is such a command | No | No |
| 022 | No | Yes — OS not Revenue | I-PAY-17 | Pointer | No |
| 023 | Vocabulary gap | Yes — Payment not AR | Confirm process ≠ Split capability | Pointer | No rewrite |
| 024 | If Mixed confused with FSP Payment | Yes — Payment not AR | تسوية ≠ Split Payment | Pointer | No |
| 026 | No | Yes — copy/producer | Payment calls; Check produces | Pointer | No |
| 032 | If Payment “owns refund” is read as new SSOT | Yes — Check mutation + SR budget | Command vs history law | Pointer | No |
| 033 | No | Yes — custody ≠ money | Payment is not custody | No | No |
| 034–036 | N/A | Commercial | Do not reuse 034 for Payment | No | **037** instead |

---

## 13. Proposed ADR revisions

Applied in this program as **“Refined by ADR-ARCH-037”** header rows. Decision bodies were **not** rewritten.

**CURRENT:** 020/022/023/024/026/032 silent on Confirm Payment process.
**TARGET:** Pointers + ADR-037.
**REASON:** Preserve historical intent.
**INVARIANT:** I-FIN-01 remains.
**ADR IMPACT:** Done.
**IMPLEMENTATION IMPACT:** None.
**MIGRATION RISK:** None.

I-FIN-04 **text** is not replaced. ADR-037 **interprets** it through Charge composition.

---

## 14. Proposed new ADRs

**ADR-ARCH-037** — necessary. A rewrite of 020 would break R5. Reusing 023 would mix Confirm process with Phase C capability language. Reusing 034 is impossible (commercial catalog).

No other new ADR.

---

## 15. Constitutional Invariants

I-PAY-01 … I-PAY-18 are normative in ADR-037. Prefix `I-PAY-*` matches `I-FIN-*` / `I-OS-*` governance (invariants live on the owning ADR, not Ordering-Invariants).

---

## 16. Payment / Check Boundary

Payment calculates/validates/collects/finalizes. Check persists and remains mutation root. CheckService may host the process (I-PAY-14). Payment does not become Check (I-PAY-13).

---

## 17. Payment / Order Boundary

Payment does not own Order lifecycle or line totals as amount due. Order record may exist pre-pay. Operational release only after successful financial confirmation (I-PAY-09/10). I-FIN-12 preserved.

---

## 18. Payment / Settlement Record Boundary

Payment may request publication. Check produces SR. SR does not calculate (I-PAY-07).

---

## 19. Payment / Refund Boundary

Payment owns the **command**. `refundableBalance` stays SR history (I-PAY-16). `applyRefundOnCheck` remains the certified write until a façade wraps it. No refunds table.

---

## 20. Payment / Charge Boundary

Charges = composition facts (I-PAY-18). Payment consumes `SUM(netAmount)`. Keep `originOrderId`.

---

## 21. Migration Principles

Phase 1 constitutional clarification — **this program**.
Phase 2 Payment Confirm Service façade.
Phase 3 move callers.
Phase 4 reduce CheckService exposure.
Phase 5 harden I-PAY guards.
Phase 6 remove unused compatibility.

No big-bang. No historical rewrite. No new financial table.

---

## 22. Compatibility Strategy

Keep `pos.settlement.initiate` → `settleCheckPaidByIdDetailed` until Phase 2 inserts a named Payment confirm application service **in front of** that function. Same tables, same TX, same formula, same SR producer string.

Cashier Mixed remains ST cash+card cover, not ADR-024 Split Payment.

---

## 23. Risks

| Risk | Mitigation |
|---|---|
| Readers treat 037 as a Payment AR | I-PAY-03/15; 020 R5 |
| I-FIN-04 vs Charges confusion | 037 interpretation; optional later 020 restatement |
| ADR-024 vs Cashier Mixed | Explicit split in 024 “Refined by” |
| CheckService still “looks like Payment” | I-PAY-14 until PAYMENT-CONFIRM-SERVICE-1 |
| Refund reverse snapshot tax=0 | Out of scope; not a constitution block |

---

## 24. Explicit Non-Goals

All program non-goals held: no production code, engine, aggregate, workspace requirement, table, 0096, formula change, SR/OS/Refund history redesign, L3 optimization, Offline Payment.

---

## 25. Recommended Next Implementation Program

**PAYMENT-CONFIRM-SERVICE-1**

Scope:

- Application service named Payment Confirm that **calls** existing `settleCheckPaidByIdDetailed`.
- POS `settlement.initiate` becomes the transport into that service.
- Architecture guards: no `payments` table, no PaymentEngine, no 0096, Confirm still Check.grandTotal / ST, I-PAY-14 hosting documented.
- Do **not** rewrite `finalizeOpenCheckById`, Refund, SR, Charges, or Cashier tender UI.
- Do **not** optimize L3 except incidental duplicate-call removal that preserves TX semantics.

Not authorized until this constitutional program is accepted (it is, as ADR-037 Accepted governance). Implementation still requires a separate execution charter.

---

## Change records (this program)

| Change | CURRENT | TARGET | REASON | INVARIANT | ADR IMPACT | IMPLEMENTATION IMPACT | MIGRATION RISK |
|---|---|---|---|---|---|---|---|
| New ADR-037 | Unnamed Confirm process | Payment process domain | Close ownership gap | I-PAY-01…18 | New ADR | None | None |
| 020 header | Silent | Refined by 037 | Keep R5 | I-FIN-01 | Pointer | None | None |
| 022 header | Silent | Refined by 037 | OS ≠ Bill amount | I-PAY-17 | Pointer | None | None |
| 023 header | Payment = capability | Distinct from Confirm process | Avoid dual meaning | I-PAY-01 / 023 R1 | Pointer | None | None |
| 024 header | Mixed could be misread as FSP Payment | تسوية ≠ Split Payment | Cashier atomic settle | I-PAY-11/12 | Pointer | None | None |
| 026 header | Silent caller | Payment calls; Check produces | SR-INV-01 | I-PAY-07 | Pointer | None | None |
| 032 header | Refund = Check capability only | Command process vs budget law | I-PAY-16 | Pointer | None | None | None |
| Registry | Ends at 036 | 037 indexed | Governance | — | Registry | None | None |

---

## Success criteria

All 26 PASS items in the charter are met. Existing certified financial **behavior** is unchanged because no runtime code changed.

---

## Final Status

**PASS**

Next implementation program: **PAYMENT-CONFIRM-SERVICE-1**
