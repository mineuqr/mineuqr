# VALIDATION-REPORT

Program: **CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1**  
HEAD: `3c15dff9`  
Date: 2026-08-20

INVESTIGATION ONLY. NO APPLICATION CODE CHANGE. NO SCHEMA CHANGE. NO MIGRATION. NO PRODUCTION DEPLOYMENT. NO PRODUCTION WRITES.

## Forensic tests (this program)

| File | Passed | Failed | Skipped |
|---|---|---|---|
| `client/src/lib/cashier-workspace/__tests__/cashierProductionPaymentCommitForensics.architecture.guards.test.ts` | 7 | 0 | 0 |

Coverage mapped to program §16:

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | CF commit precedes HTTP success | **PASS (source + unit)** | Freeze TX awaits CF; HTTP after TX. Production ms **UNKNOWN**. |
| 2 | HTTP does not await ST/OS/SR | **PASS (source + unit)** | `void completeCashier…`; hanging ST test does not delay `settleCashierPosOrderPaidByIdDetailed`. Production HTTP duration **UNKNOWN**. |
| 3 | UI success is based on financial commit | **GAP** | Success toast follows HTTP `mutateAsync`. Recovery treats Check `open` as unpaid and does **not** read CF. |
| 4 | Downstream failure cannot convert committed payment into financial failure | **PASS (backend) / GAP (UI)** | ST failure after defer keeps CF. UI `recoveryNotCommitted` can still label it unpaid. |
| 5 | Idempotent retry replays the same CF | **PASS (source + existing writer/POS tests)** | Same `paymentIntentId` + POS key. Production SQL **UNKNOWN**. |
| 6 | UI secondary failure does not create another CF | **PASS on error-path retry** | `recoveryNotCommitted` does not clear identities. **P1** after `paidSuccess` + `startNewSale` on the same OPEN order. |
| 7 | Cashier adoption tests | **PASS** | 14 + 3 |
| 8 | Critical-path decoupling tests | **PASS** | 6 + 7 |
| 9 | Downstream recovery tests | **PASS** | 7 + 4 + 5 |
| 10 | Revenue Union authority tests | **PASS** | see batch 2 |
| 11 | Other channels unaffected | **PASS (source guards)** | Defer flag only on Cashier `orderId` Confirm. Session/Waiter/Kiosk not given the flag. |
| 12 | No migration 0098 | **PASS** | journal has no `0098` |
| 13 | No second financial authority | **PASS** | forensic + existing CF guards |
| 14 | No `payments` table | **PASS** | schema guard |
| 15 | Collection Fact insert-only | **PASS** | existing writer/contract tests |

## Regression suites run

### Batch 1 — Collection Fact / Confirm / POS / decoupling / recovery

Test Files: **23 passed, 1 failed** (24)  
Tests: **179 passed, 1 failed** (180)

Failed (pre-existing at HEAD `3c15dff9`; this program did not change `CheckService.ts`):

| File | Test | Cause |
|---|---|---|
| `server/pos/__tests__/posSettlementFinancialTxnStage.architecture.guards.test.ts` | instruments existing finalize stages without moving financial work | Guard still searches `finalizeOpenCheckById` for `await getCheckById(`. That function now reloads via `findCheckById`. Stale string-order guard vs certified decoupling/adoption code. **Not a financial-authority regression.** Not fixed in this forensic program. |

Passed files in this batch include Collection Fact contract/execution/writer, Cashier adoption, Payment Confirm, POS settlement (including `posSettlementInitiate.order.test.ts` 31), decoupling, downstream recovery.

### Batch 2 — Check / ST / OS / SR / Revenue Union / Business Metrics / Refund

Test Files: **17 passed**  
Tests: **128 passed**

### Batch 3 — Cashier UI / HTTP / forensic / migration governance

Test Files: **13 passed**  
Tests: **95 passed**

Includes `scripts/__tests__/migrationGovernance.test.ts` (20).

### Batch 4 — extra Cashier / channel

Test Files: **2 passed**  
Tests: **6 passed**

## Totals (unique files in the four batches)

| | Files | Tests |
|---|---|---|
| Passed | 55 | 408 |
| Failed | 1 | 1 |
| Skipped | 0 | 0 |

## Production runtime

| Item | Status |
|---|---|
| Production SQL `COUNT(*)` / fact row | **UNKNOWN** — no DB session |
| Controlled production payment | **Not taken** |
| `pos_settlement_initiate` durationMs | **UNKNOWN** |
| `cashier_payment_flow` (`console.info`) | **UNKNOWN** — not retrieved |
| Browser HAR | **UNKNOWN** |

## Git

Working tree after investigation: untracked forensic docs + forensic test only. Application sources unmodified. `git diff --check` clean.
