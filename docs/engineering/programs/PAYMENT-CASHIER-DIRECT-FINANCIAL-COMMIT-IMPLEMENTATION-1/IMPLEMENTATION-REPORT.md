# PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1 |
| **Governing ADR** | ADR-ARCH-038 |
| **Baseline** | `47efa288` — `docs(architecture): establish cashier direct financial commit` |
| **Date** | 2026-08-19 |
| **Decision** | **CERTIFIED WITH CONDITIONS** |

This report does **not** claim production certification (Gate 16). ADR-ARCH-038 body is unchanged.

---

## 1. Executive Summary

For `cashier_pos`, Cashier Confirm no longer waits for a pre-existing OPEN Check.

The cashier submits a persisted sale, tender, and discount intent. Payment Confirm executes a **synchronous** financial commit. Check is materialized (or an existing OPEN leftover is reused) **inside** that Check-owned transaction together with Charges, collection facts, Order Settlement terminal state, and Settlement Record. HTTP returns PAID only after that commit.

The ~2.85s pre-payment `ensureCheckForOrder` / intake path is removed from Cashier Confirm enablement. The ~2.5s synchronous financial commit is **retained** (I-PAY-24). No async payment, PaymentEngine, or `payments` table.

## 2. Baseline

| Check | Evidence |
|---|---|
| HEAD before implementation | `47efa288a84facef8b5eae78e9dfe5d648f105b3` |
| Working tree | Clean |
| ADR-038 | Accepted (governance) |

## 3. Governing ADR

ADR-ARCH-038 remains the sequencing law for `cashier_pos`. Implementation did not reinterpret, weaken, or expand it. No schema migration. No ADR-038 text change.

## 4. Pre-Implementation Runtime Audit

Confirmed against HEAD `47efa288`:

```
Cashier placeSale
  → pos.sale.create (enrollCheck: false)
  → pos.check.intake → ensureCheckForOrder
  → resolveCashierPaymentReadiness requires open Check.grandTotal
  → pos.settlement.initiate → ensureCheck fallback → confirmPayment(checkId)
      → finalizeOpenCheckById (PAID + ST + OS + SR)
```

`OrderSessionConsumer` enrolled **all** sessionless `OrderCreated` events, including `cashier_pos`.

Cashier sheet cancel already closed the sheet without voiding a Check or cancelling the Order.

## 5. Before Call Graph

```
Cashier UI
  placeSale → sale.create → orchestrateIntake (pos.check.intake)
  Confirm gated on Check.grandTotal
  completePayment → settlement.initiate
POS
  membership missing → ensureCheckForOrder (separate TX, OPEN Check)
  confirmPayment({ checkId })
Check
  finalizeOpenCheckById (requires OPEN Check)
Consumer
  sessionless OrderCreated → ensureCheckForOrder (all channels)
```

## 6. After Call Graph

```
Cashier UI
  placeSale → sale.create (no intake)
  Confirm gated on saleReady + preview grandTotal + tender
  completePayment → settlement.initiate(orderId, billDiscountAmount, settlements)
POS
  CRMP fail-closed
  paid membership → replay
  else confirmPayment({ orderId, billDiscountAmount })
Payment
  settleCashierPosOrderPaidByIdDetailed
Check-owned TX
  materializeOrLoadCashierPosOpenCheck
    INSERT Check (same TX) | load leftover OPEN
    enroll + Charges + OS enroll/recalc
  finalizeOpenCheckById(client=tx)
    lock CAS → computeCheckMoney → ST → PAID → OS settle → SR
COMMIT
  Attribution deferred (awaitAttribution: false)
  Print after PAID + settlementRecordId
Consumer
  cashier_pos sessionless → skip ensureCheckForOrder
  other sessionless → ensureCheckForOrder unchanged
```

## 7. Changes Implemented

| Area | Change |
|---|---|
| `OrderSessionConsumer` | Skip auto-enroll when Order is `cashier_pos` (tenant-scoped). Other sessionless channels unchanged. |
| `cashierPaymentReadiness` | Confirm uses sale + preview money + tender. No Check.grandTotal gate. |
| `CashierWorkspacePanel` | Removed `pos.check.intake` from sale/confirm. Discount intent on Confirm. Print after paid+SR. |
| `createOpenCheck` | Optional TX `client` + pre-captured snapshots so INSERT can join Confirm TX. |
| `finalizeOpenCheckById` | Loads/ensures via the TX client when provided; does **not** fire Attribution before outer COMMIT. |
| `settleCashierPosOrderPaidByIdDetailed` | `cashier_pos` materialize+finalize in one `withCheckOwnedTransaction`. |
| `confirmPayment` | `orderId` → cashier path; `checkId` → existing Session/kiosk path. |
| `PosSettlementInitiateService` | No pre-Confirm `ensureCheckForOrder`. Always Confirm by `orderId`. Discount in command + fingerprint. Paid membership replay. |
| `posRouter` | Optional `billDiscountAmount` on settlement initiate. |
| Tests / guards | ADR-038 contract; Session/kiosk `ensureCheckForOrder` preserved. |

`pos.check.intake` remains deployed for other/legacy callers. POS sale still `enrollCheck: false`.

## 8. Check Materialization

Host: CheckService (`materializeOrLoadCashierPosOpenCheck`).

- No membership → `createOpenCheck({ client: tx, snapshots })` then `enrollRefreshAndReloadCheck`.
- OPEN membership → enroll/refresh with Confirm discount intent, then finalize.
- PAID membership → `CheckTransitionError` (POS replays).
- Channel: Order `orderingChannel === cashier_pos` and `order.restaurantId === command.restaurantId`.

OPEN exists only **inside** the financial TX on this path (I-PAY-19/7).

## 9. Financial Transaction Boundary

**Start:** `withCheckOwnedTransaction` in `settleCashierPosOrderPaidByIdDetailed`.

**Writes in that TX:**

- `operational_checks` INSERT (if needed)
- membership + Charge composition + OS enroll/recalc
- `touchOpenCheck` CAS
- `computeCheckMoney` persist via finalize
- `check_settlement_transactions`
- Check outcome PAID
- Order Settlement settle (I-OS-07)
- Settlement Record (SR-INV-04)

**End:** TX COMMIT. Then deferred Attribution (`awaitAttribution: false`).

**Not in the TX:** `pos.sale.create`, print, kitchen/expo listing, outbox/relay, reporting projections.

**Atomicity:** finalize failure throws inside the same TX client as Check INSERT. The Drizzle transaction rolls back. Unit test: insert is called with `fakeTx`; SR is not written if finalize throws.

`finalizeOpenCheckById` with an outer `client` does not treat its inner `withCheckOwnedTransaction` as COMMIT (no Attribution against uncommitted SR).

## 10. Discount Semantics

Cashier sends `billDiscountAmount` intent on `pos.settlement.initiate`. Server applies it as Check `billDiscountAmount` during materialize/enroll. `computeCheckMoney` remains the formula. Browser totals are not on the command. Fingerprint includes discount so a different discount is an idempotency conflict.

## 11. Tax Semantics

Tax snapshot is captured from restaurant Business Tax Policy (`taxEnabled`, `taxMode`, `taxPolicyJson`) immediately before the financial TX and frozen on Check INSERT (`captureSnapshotsFromBusinessSettings`). Not redesigned. Preview UI still uses live restaurant tax for display only.

## 12. Idempotency

Reused: POS `runExclusive` + fingerprint (now includes discount) + paid-membership replay + `CheckTransitionError` recovery via membership + Check CAS.

Same key → replay. Duplicate Confirm after PAID → replay without a second settle. Different mix/discount on same key → `idempotency_conflict`.

## 13. Concurrency

Same idempotency key: exclusive envelope → one settle.

CAS losers: `CheckTransitionError` / `CheckMembershipError` → paid replay or `concurrency_conflict`.

Existing finalize concurrency certification (1-of-N financial commit) remains.

**Limitation:** `(restaurantId, orderId)` membership is not uniquely constrained. Two Confirms with **different** keys under REPEATABLE READ could theoretically insert two Checks. Same-key cashier clicks are serialized. A unique membership constraint would be a **schema** change (out of scope; STOP if required). Follow-up if production evidence shows duplicates.

## 14. Authorization

Unchanged POS path: `assertRestaurantPosScope` → `POS_ACCESS` + `SETTLEMENT_INITIATE` → terminal access. No owner/admin bypass. Channel must be `cashier_pos`. CRMP `requireResolvedContextForSettlement` fail-closed.

## 15. Tenant Isolation

Order lookup compared to `context.restaurantId`. CheckService `getOrderById` is fail-closed if `order.restaurantId !== input.restaurantId`. Membership lookups remain `(restaurantId, orderId)`. Consumer skip requires matching `event.restaurantId`. Check loads use restaurant on the row.

## 16. Cancellation

**Gate 10 — A (implementation, not a new ADR).**

`AdvanceOrderStatusService` cancel does **not** call `assertOrderCompletable` (Check not required). Existing lifecycle guard test covers this.

Cashier `cancelPaymentSheet` remains presentation-only: close sheet, do not cancel Order, do not void Check. That is the pre-existing UX contract. Unpaid `cashier_pos` Orders remain hidden from operational lists until a paid/complimentary Check exists.

A dedicated “cancel unpaid cashier Order” command is **not** added (would be Order-lifecycle product scope).

## 17. Session/Kiosk Regression Protection

- `ensureCheckForOrder` remains for sessionless non-cashier `OrderCreated`.
- `IdentityPlaceOrderService` default `enrollCheck: true` unchanged.
- POS sale still `enrollCheck: false`.
- `pos.check.intake` still calls `ensureCheckForOrder`.
- `confirmPayment(checkId)` path preserved for Session / SettleOrderPaid / Counter Pickup.

## 18. Settlement Integrity

OS enroll + terminal settle remain Check-owned inside the Confirm TX (I-OS-07). Order is not a second Revenue root.

## 19. Settlement Record Integrity

SR is still created by `createSettlementRecordForCheckFinalize` in the same TX (SR-INV-04). Not extracted, not async.

## 20. Operational Path

After COMMIT: Attribution deferred, POS returns PAID + `settlementRecordId`, client invalidates reads, print dialog opens only when `settlementRecordId` is present. Kitchen/expo listing still requires paid/complimentary Check for `cashier_pos`.

## 21. Printing

Unchanged: `setPrintOpen(true)` only after successful settle and `settlementRecordId`. Not on Pay click. Not a financial authority.

## 22. Tests

Focused Vitest (not a full suite):

| Coverage | Evidence |
|---|---|
| Confirm without Check | `posSettlementInitiate.order.test.ts` |
| Materialize in TX + PAID | `CheckService.m4.sessionOptionality.test.ts` |
| Failed finalize does not write SR | same (insert shares `fakeTx`) |
| Duplicate / concurrent same key | POS initiate tests |
| Paid replay / CAS recovery | POS initiate tests |
| Discount intent, no client GT | POS initiate + router |
| Channel isolation | cashier_pos reject; consumer kiosk still enrolls |
| Cancel without Check | `AdvanceOrderStatusService.lifecycleGuards.test.ts` |
| Readiness without Check | `cashierPaymentReadiness.test.ts` |
| Architecture | `cashierDirectFinancialCommit.architecture.guards.test.ts` + updated prior guards |

`pos.check.intake` / Session / kiosk guards still require `ensureCheckForOrder` on those paths.

## 23. Performance Validation

| Path | Target | This program |
|---|---|---|
| A — Pre-payment readiness | Remove ~2.85s Check intake/ensure from Confirm enablement | **Done in architecture:** Confirm no longer waits on intake/Check. No production timer sample in this program. |
| B — Financial commit | Remain synchronous ~2.5s | **Not optimized.** Materialize now sits **inside** Confirm TX, so Confirm wall may include former intake work. That is accepted (I-PAY-24). |

Do not treat Confirm duration ≈ 2.5s+ as a defect of this program.

## 24. Observability

- `payment_confirm` metadata includes `orderId`.
- `check_ensure_for_order` stage clocks reused when cashier materialize runs `enrollRefreshAndReloadCheck`.
- `pos_settlement_initiate` still emits financial TX clocks; `ensureCheckMs` is 0 on the new path.
- No payment amounts in logs. No new logging framework.

## 25. Production Validation

**Not performed in this program.** No production deploy sample of Confirm-without-Check, duplicate Confirm, or reporting after cutover.

Gate 16 therefore **fails closed** → certification is **WITH CONDITIONS**.

## 26. Git Evidence

| Commit | Summary |
|---|---|
| `47efa288` | Baseline — ADR-038 governance |
| `28774e00` | Implementation charter |
| `6fa141df` | Runtime: Confirm without pre-payment Check |
| `f4d56cbd` | ADR-038 architecture guards |
| `21d836da` | Test/guard updates |
| *(this report commit)* | Implementation report + Registry Partial status |

Final HEAD is recorded after this documentation commit. Working tree must be clean (Gate 17).

## 27. Known Limitations

1. Cashier sheet cancel does not cancel the Order (pre-existing UX).
2. Membership uniqueness is not a DB constraint; different idempotency keys remain a residual duplicate-Check race (same as historical `ensureCheckForOrder`).
3. Confirm TX now includes former pre-payment Charge/OS work; wall-clock may grow vs old Confirm-only ~2.5s. Not classified as a defect here.
4. Preview totals can disagree with server `computeCheckMoney` (catalog vs persisted Charges). Server rejects invalid collection lines. Mixed-tender amounts are preview-derived and validated against server grand total.
5. Production runtime evidence is absent.

## 28. Follow-up Programs

| Item | Class |
|---|---|
| Production samples of Confirm-without-Check | Required for full CERTIFIED |
| Unique active membership per Order | Separate ADR if production duplicates appear |
| Cashier unpaid Order cancel command | Product + possible ADR if lifecycle law changes |
| Shrink Confirm TX (batch Charges) | Out of scope (I-PAY-24) |
| Async financial commit | Forbidden here; separate ADR |

## 29. Certification Decision

### Gates

| Gate | Result |
|---|---|
| 1 Architecture | **Met** — ADR-038 satisfied in code; ADR text unchanged |
| 2 Cashier | **Met** — Confirm not gated on Check |
| 3 Financial commit | **Met** — materialize+finalize one TX |
| 4 Atomicity | **Met** at TX-client evidence; production rollback not sampled |
| 5 Authority | **Met** — browser preview only |
| 6 Discount | **Met** — intent on Confirm |
| 7 Tax | **Met** — snapshot at materialization |
| 8 Idempotency | **Met** in unit tests |
| 9 Concurrency | **Met** for same-key / CAS; residual different-key limitation recorded |
| 10 Cancellation | **Met** as A — Order cancel does not require Check; sheet cancel unchanged |
| 11 Channel isolation | **Met** in tests |
| 12 Financial integrity | **Met** in unit/architecture tests |
| 13 Existing invariants | **Met** — `awaitAttribution: false`, CRMP fail-closed, CAS, SR-INV-04, I-OS-07, `computeCheckMoney` |
| 14 Performance | **Met as architecture** — pre-payment path removed; commit remains sync. No production Path A/B samples |
| 15 Security | **Met** in unit tests (tenant/auth) |
| 16 Production | **Not met** |
| 17 Git | Recorded after commit |

### Decision

**CERTIFIED WITH CONDITIONS**

Conditions:

1. Production must confirm Cashier Confirm without a pre-existing Check, correct PAID+SR, print after SR, and no orphan OPEN Check on failed Confirm.
2. Duplicate/retry/concurrent Confirm must be sampled in production.
3. Session/kiosk operational Check readiness must be observed unchanged after deploy.
4. Residual different-key membership race is accepted until evidence or a schema ADR.

Failed gate if this were a full CERTIFIED claim: **Gate 16**.
