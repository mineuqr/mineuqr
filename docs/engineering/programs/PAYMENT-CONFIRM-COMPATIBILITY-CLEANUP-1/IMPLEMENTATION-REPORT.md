# PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1

Certified baseline HEAD: `0c816c8fbcded58979a808b24ab1400d87ee9675`
Branch: `main`
Message: `feat(payment): route remaining confirm payment callers`

Working tree at program start: clean (`main` == `origin/main`).
Predecessor audit: PAYMENT-CONFIRM-COMPATIBILITY-AUDIT-1 — **NARROW WITH CONDITIONS**.

This program did not create a migration, change financial formulas, or rewrite historical facts.

**Result: PASS**

---

## 1. Executive Decision

**PASS**

Public paid-confirm barrels no longer re-export `settleCheckPaidById` or `settleCheckPaidByIdDetailed`. Application Confirm remains `confirmPayment` only. CheckService still hosts certified execution (`settleCheckPaidByIdDetailed` → `finalizeOpenCheckById`) for Payment and Check tests. I-PAY-14 was refined, not repealed.

---

## 2. Baseline

| Fact | Value |
|---|---|
| HEAD | `0c816c8f` `feat(payment): route remaining confirm payment callers` |
| PAYMENT-CONFIRM-SERVICE-1 | `3943eb2f` |
| Confirm guards | `8c5e6ddb` |
| ADR-037 | `72e09cf5` |
| Migration terminus | **0095_check_charges** |

### Caller/export forensics (before edit)

| Symbol | Classification | Production runtime callers |
|---|---|---|
| `settleCheckPaidById` | **C — tests only** (CheckService lifecycle/M3/M4) | none |
| `settleCheckPaidByIdDetailed` | PaymentConfirmService + Check tests; barrel unused | `PaymentConfirmService` only |
| `finalizeOpenCheckById` | Internal Check implementation | CheckService wrappers only |

Preferred cleanup applied: **stop public barrel re-export**. Did not wrap `settleCheckPaidById` through `confirmPayment` (no production caller / no remaining public contract).

---

## 3. Before / After Call Graph

### Before (latent bypass)

```
Application Confirm (4 callers) → confirmPayment → settleCheckPaidByIdDetailed → finalizeOpenCheckById

Public barrels still exported:
  settleCheckPaidById        → finalizeOpenCheckById({ outcome: "paid" })  ← unused but live bypass
  settleCheckPaidByIdDetailed (check/index.ts)                             ← unused re-export
```

### After

```
Cashier / Session markPaid / SettleOrderPaid / Counter Pickup
        → confirmPayment
            → settleCheckPaidByIdDetailed          (CheckService.ts import)
                → finalizeOpenCheckById            (unexported)
                    → withCheckOwnedTransaction

Public barrels: no paid-confirm re-export.
CheckService.ts may still export both wrappers for Payment + Check tests.
```

---

## 4. Compatibility Surface

| Function | Final exposure |
|---|---|
| `settleCheckPaidById` | **CheckService.ts only** (implementation/test). Not on `check/index.ts` or `operational-session/index.ts`. |
| `settleCheckPaidByIdDetailed` | **CheckService.ts only**. Imported by `PaymentConfirmService`. Not on public barrels. |
| `finalizeOpenCheckById` | **Internal** (`async function`, not exported). Unchanged. |

Complimentary, void, Refund, Split, Multi-Check barrel exports are unchanged.

---

## 5. Caller Inventory

No remaining legitimate application-level Confirm bypass:

- Cashier, Session markPaid, SettleOrderPaid, Counter Pickup → `confirmPayment`
- `settleOperationalSessionPaid` still delegates to `markPaid` → `confirmPayment` (not a Check paid façade)
- Architecture scan forbids application `settleCheckPaidById`, `settleCheckPaidByIdDetailed`, and `finalizeOpenCheckById`

---

## 6. Guard Coverage

New: `server/operational-session/payment/__tests__/paymentConfirmCompatibilityCleanup.architecture.guards.test.ts`

Proves:

1–4. Four Confirm callers use `confirmPayment`
5–7. Application trees do not reference paid-confirm Check façades or `finalizeOpenCheckById`
8. CheckService still owns unexported finalize + `withCheckOwnedTransaction`
9. `confirmPayment` still calls `settleCheckPaidByIdDetailed`
10. Public barrels do not re-export paid-confirm façades
11. Complimentary / void / Refund stay off Confirm

Updated: CHECK-GENERALIZATION-M4 barrel assertion (old surface required `operational-session` to re-export `settleCheckPaidById`).

Extended: remaining-callers scan no longer allowlists `check/index.ts`.

---

## 7. Transaction Safety

Unchanged:

```
confirmPayment
  → settleCheckPaidByIdDetailed
    → finalizeOpenCheckById
      → withCheckOwnedTransaction
```

`confirmPayment` still does not open a transaction.

---

## 8. Production Safety

| Check | Status |
|---|---|
| Migration terminus | **0095_check_charges** |
| 0096 / `payments` table | absent |
| `computeCheckMoney` / ST / SR / Refund / Order / Session lifecycle | unmodified |
| Authorization | still caller-owned |
| Idempotency / concurrency | Check finalize unchanged |

---

## 9. Deferred Work

- Tax / Discount / Grand Total / Amount Due / Remaining Collectible extraction
- Refund extraction
- CheckService reduction / moving `finalizeOpenCheckById`
- Bill redesign
- PaymentEngine / `payments` table
- latency optimization

---

## Files changed

- `server/operational-session/check/index.ts` — drop paid-confirm re-exports
- `server/operational-session/index.ts` — drop `settleCheckPaidById` re-export
- `server/operational-session/check/CheckService.ts` — comments only
- architecture guards (new cleanup file + M4 + remaining-callers allowlist)
- ADR-037 I-PAY-14 wording; ADR Registry

---

## Tests executed

| Suite | Result |
|---|---|
| PaymentConfirmService | PASS (2) |
| paymentConfirm architecture guards | PASS (5) |
| remaining-callers guards | PASS (6) |
| **compatibility-cleanup guards** | **PASS (5)** |
| Session markPaid | PASS (8) |
| SettleOrderPaid / Counter Pickup | PASS (5 + 5) |
| CHECK-GENERALIZATION-M4 | PASS (4) |
| POS settlement initiate (guards + order) | PASS (6 + 27) |
| Check lifecycle hardening | PASS (29) |
| SR concurrency 2/5/10 | PASS (7) |
| Order Settlement integration | PASS (5) |
| Check M3 / M4 | PASS (4 + 6) |
| Refund / Split / Multi-Check / collection / bill guards | PASS |
| Cashier payment flow + HTTP-at-commit | PASS |

`git diff --check`: clean (CRLF warnings only).

`git diff --stat` (tracked): 7 files, +13/−11 plus untracked report + cleanup guards.

---

## Commit recommendation

Not committed. Recommended:

```
refactor(payment): close confirm payment barrel bypass

Stop re-exporting settleCheckPaidById and settleCheckPaidByIdDetailed
from public barrels so Confirm cannot bypass confirmPayment.
```

---

## Final decision

**PASS**

Recommended next program: none required for Confirm caller convergence. Later work remains formula extraction / CheckService implementation extraction (explicitly deferred).
