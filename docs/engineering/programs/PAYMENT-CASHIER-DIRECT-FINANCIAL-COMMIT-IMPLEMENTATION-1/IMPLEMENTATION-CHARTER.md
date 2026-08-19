# PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1 — Implementation Charter

| Field | Value |
|---|---|
| **Program ID** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1 |
| **Governing ADR** | [ADR-ARCH-038](../../../architecture/adrs/ADR-ARCH-038-cashier-direct-financial-commit.md) — **Accepted (governance)** |
| **Predecessor** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-ARCHITECTURE-1 (Decision C — closed) |
| **Baseline** | `47efa288` — `docs(architecture): establish cashier direct financial commit` |
| **Date** | 2026-08-19 |
| **Status** | **Chartered — not implemented** |

This charter does **not** certify the program. Certification is recorded only in `IMPLEMENTATION-REPORT.md` after runtime evidence.

---

## 1. Program ID

`PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1`

## 2. Governing ADR

ADR-ARCH-038 is architectural law for this program.

Do not reinterpret, weaken, or silently expand it. If repository evidence proves ADR-038 insufficient or inconsistent with actual contracts: **STOP** and report. Do not modify ADR-038 in this program unless a new architectural decision is formally required.

## 3. Baseline

| Check | Value |
|---|---|
| HEAD | `47efa288a84facef8b5eae78e9dfe5d648f105b3` |
| Working tree at charter | Clean |
| ADR-038 present | Yes |

## 4. Scope

For ordering channel **`cashier_pos` only**:

1. Remove pre-payment Check readiness as a Confirm gate (UI + POS initiate + sessionless auto-enroll).
2. Execute Confirm as a **synchronous** financial commit that materializes/finalizes Check **inside** that commit when no Check exists.
3. Carry discount **intent** on Confirm; server validates and applies via existing Check `billDiscountAmount` + `computeCheckMoney`.
4. Freeze tax snapshot at Check materialization from existing Business Tax Policy fields.
5. Preserve print / operational processing as **post-financial-success** work.

Target journey:

```
Cashier → sale.create → tender + discount intent → Confirm
  → single financial TX: Check + Charges + ST + OS + SR
  → PAID → operational path (print after SR; awaitAttribution: false)
```

## 5. Non-goals

Do **not**:

- Redesign Payment, Check, Order Settlement, Settlement Record, Session, or Business Tax Policy
- Introduce PaymentEngine, a `payments` table, async/background financial commit, or offline financial mode
- Move `computeCheckMoney` or financial authority to React
- Trust browser grand total / tax / discount as payable truth
- Globally remove `ensureCheckForOrder` or change other-channel Check readiness
- Fold `pos.sale.create` into the financial TX
- Optimize the ~2.5s financial commit (I-PAY-24)
- Add a schema migration (STOP if required)
- Change PAID semantics or `awaitAttribution: false`

## 6. Preconditions

| Precondition | Evidence |
|---|---|
| ADR-038 accepted | ADR + Registry |
| Payment Confirm façade exists | `confirmPayment` → `settleCheckPaidByIdDetailed` → `finalizeOpenCheckById` |
| Check insert can join a TX | `insertOperationalCheck(data, client?)` |
| Finalize already accepts an outer client | `finalizeOpenCheckById(input, client?)` |
| POS sale does not enroll on HTTP | `PosSaleService` `enrollCheck: false` |
| Intake / consumer still auto-enroll `cashier_pos` | `pos.check.intake`, `OrderSessionConsumer` sessionless path |
| Cashier Confirm gated on open Check.grandTotal | `resolveCashierPaymentReadiness` |
| No schema change required | Existing `operational_checks` / membership / ST / OS / SR |

## 7. Required invariants

| ID | Law |
|---|---|
| I-PAY-19 | `cashier_pos` Confirm MUST NOT require a pre-existing or ready Check |
| I-PAY-20 | Direct materialization-at-Confirm is scoped to `cashier_pos` |
| I-PAY-21 | Other channels MAY retain pre-payment Check readiness; `ensureCheckForOrder` is not globally removed |
| I-PAY-22 | Financial success MUST NOT be reported before the commit set is established |
| I-PAY-23 | Financial commit remains synchronous |
| I-PAY-24 | ~2.5s commit latency is retained; not a defect to hide by weakening the TX |
| I-PAY-04 | Singular `computeCheckMoney`; not moved to React |
| I-PAY-14 | Application Confirm still enters `confirmPayment`; Check hosts finalize |
| I-OS-07 | Paid Check ⇒ OS settled in the same financial TX |
| SR-INV-04 | SR in the same financial TX as Check finalization |
| ADR-021 | Confirm is a business-idempotent command |
| CRMP | `requireResolvedContextForSettlement` fail-closed; do not invent context |
| Custody | `awaitAttribution: false` on Cashier HTTP; CAS via `touchOpenCheck` |

Commit set for Cashier paid Confirm:

```
Check (materialized if absent + frozen PAID)
+ authoritative Charges
+ collection facts (ST)
+ Order Settlement (enroll + terminal settled)
+ Settlement Record
```

Failure: the financial TX rolls back. A committed OPEN Check whose only purpose was a failed Confirm is **forbidden** on this path.

## 8. Implementation phases

| Phase | Objective |
|---|---|
| 0 | Pre-flight (git + ADR contracts) — this charter |
| 1 | Runtime audit (closed as architecture evidence; re-verified against HEAD) |
| 1A | Cashier Confirm readiness without Check.grandTotal |
| 1B | Stop Cashier `pos.check.intake` as a Confirm prerequisite (procedure remains) |
| 1C | Skip `OrderSessionConsumer` auto-enroll for `cashier_pos` only |
| 2 | Materialize + finalize in one Check-owned TX; `confirmPayment` accepts `orderId` |
| 2A–B | Existing Check ownership; server money; discount intent; tax snapshot |
| 3 | Cashier UI Confirm gate = sale + tender + preview; print after PAID+SR |
| 4 | Unpaid cancel: verify Order cancel does not require Check; do not invent lifecycle |
| 5–6 | Existing POS exclusive envelope + CAS + paid-membership replay |
| 7–8 | Preserve POS auth + CRMP |
| 9–11 | Preserve OS/SR/ST in TX; operational path after commit; print after success |
| 12 | Focused tests then regression guards |

## 9. Validation gates

Gates 1–17 as specified by the implementation program (Architecture, Cashier, Financial Commit, Atomicity, Authority, Discount, Tax, Idempotency, Concurrency, Cancellation, Channel Isolation, Financial Integrity, Existing invariants, Performance, Security, Production, Git).

**Production (Gate 16)** cannot be claimed from unit tests or a local happy path alone.

## 10. Rollback strategy

1. Revert the implementation commits (logical groups below) onto the ADR-038 governance baseline.
2. Runtime returns to: sale → intake/`ensureCheckForOrder` → Confirm gated on open Check → `finalizeOpenCheckById`.
3. No schema rollback is required if this program adds no migration.
4. `pos.check.intake` remains deployed throughout; rollback does not depend on deleting it.

## 11. Certification criteria

The program is successful when:

**Cashier no longer waits for a Check before asking Payment to execute the financial commit.**

It is **not** successful merely because the UI is faster, tests pass, or HTTP returns 200.

Certification decision (CERTIFIED / CERTIFIED WITH CONDITIONS / NOT CERTIFIED) is recorded only in the implementation report after evidence for the gates exists.

## 12. Suggested commit groups

1. Charter + `cashier_pos` auto-enroll skip + Cashier Confirm readiness decoupling
2. Check materialize-in-TX + `confirmPayment(orderId)` + POS settlement initiate
3. Cancellation / idempotency hardening (only if code is required)
4. Tests / architecture-guard updates
5. Implementation report + ADR Registry implementation status

Do not commit a broken intermediate state.
