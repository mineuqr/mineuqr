# CASHIER-PAYMENT-READINESS-INSTRUMENTATION-1

**Classification:** `INSTRUMENTATION-COMPLETE-WITH-LIMITATIONS`  
**Kind:** Diagnostic-only measurement. Not an optimization. No financial behavior change.  
**HEAD at start:** `010cb5d2` (`perf(payment): trim confirm critical path`)  
**Commit:** none (not requested)

---

## 1. Objective

Make the user-visible Cashier L1 span measurable:

`الدفع` / Payment workflow start → persisted Check ready → Confirm usable

Primary metric: **`paymentReadinessDurationMs`** = `paymentReadyAt - paymentWorkflowStartAt` using **`performance.now()`** (not `checkReadinessDurationMs`).

Emit that metric when Confirm becomes usable, without waiting for Confirm click (L3).

---

## 2. Baseline HEAD

```
git rev-parse HEAD
010cb5d2695bf2c56bf01da2b349bd377a9a2ae0

git log -1 --oneline
010cb5d2 perf(payment): trim confirm critical path
```

---

## 3. Working tree status

At start: `## main...origin/main` — clean (no production or untracked diffs).

This program adds client timing + tests + this report. No commit. No push.

---

## 4. Exact start mark

**`CASHIER_PAYMENT_WORKFLOW_START`**

File: `client/src/components/cashier-workspace/CashierWorkspacePanel.tsx`  
Function: `placeSale()` (الدفع / `t("placeSale")`)

Sequence (unchanged):

1. `beginFlow({ restaurantId, terminalId })`
2. `CASHIER_ORDER_CONFIRM_CLICK`
3. `setSalePhase("payment")` — sheet opens
4. **`CASHIER_PAYMENT_WORKFLOW_START`**
5. then `CASHIER_SALE_REQUEST_START` / `sale.create`

This is user-initiated payment workflow, not tender, Confirm, sale completion, or Check read.

`resumePaymentSheet` does not begin a new L1 flow (existing limitation).

---

## 5. Exact ready mark

**`CASHIER_PAYMENT_READY`**

Same panel, existing `useEffect` while `salePhase === "payment"`.

The mark now **observes the Confirm button gate** (the gate itself is unchanged):

```
!paymentReadiness.confirmDisabled
&& !amountDueIsOrderFallback
&& paymentRecoveryUi === "idle"
&& tenderMode != null
```

That is the inverse of Confirm `disabled={...}`. It is not sheet-open, sale-start, Check-request-start, or tender-click alone.

L1 ends here. Confirm click remains `CASHIER_PAYMENT_CONFIRM_CLICK` (L3).

---

## 6. Timing mechanism

Existing `CashierPaymentFlowTimingRegistry` (`cashierPaymentFlowTiming.ts`).

| Concern | Mechanism |
|---|---|
| Duration clock | `performance.now()` via existing `elapsed()` |
| Display timestamps | existing `Date.now()` → ISO (`paymentWorkflowStartAt`, `paymentReadyAt`) |
| Primary L1 | `paymentReadinessDurationMs = elapsed(WORKFLOW_START, PAYMENT_READY)` |
| First-write-wins | unchanged `mark()`; second PAYMENT_READY is a no-op |
| L1 emit | `console.info` on first `CASHIER_PAYMENT_READY`; **does not** `complete()` or delete the flow |
| L3 emit | existing `cashier_payment_flow` on `complete()` now also includes `paymentReadinessDurationMs` |

Duration arithmetic does not mix `Date.now()` with `performance.now()`.

No `await`, fetch, tRPC, DB, or React state for timing.

---

## 7. Correlation mechanism

No new tracing system. No new API.

Client L1 payload includes existing identifiers when already on the flow:

- `cashierFlowId`
- `restaurantId`, `terminalId`
- `orderId` (after sale response `attachOrderId`)
- `checkId` (after intake `attachCheckId`)

Server events `pos_sale_created`, `pos_check_intake`, `pos_check_read` are **unchanged**. Correlate by `orderId` + `restaurantId` + wall-clock ISO times.

Companion client fields on the same L1 emit (already computed, no extra I/O): `saleDurationMs`, `intakeDurationMs`, `checkReadinessDurationMs` (post-intake lump, not TOTAL L1).

---

## 8. Files changed

| File | Change |
|---|---|
| `client/src/lib/cashier-workspace/cashierPaymentFlowTiming.ts` | `paymentReadinessDurationMs`; emit `cashier_payment_readiness` at PAYMENT_READY |
| `client/src/components/cashier-workspace/CashierWorkspacePanel.tsx` | Ready mark observes Confirm-usable conditions |
| `client/src/lib/cashier-workspace/__tests__/cashierPaymentFlowTiming.test.ts` | L1 duration + emit-once tests |
| `client/src/lib/cashier-workspace/__tests__/cashierPaymentFlowTiming.architecture.guards.test.ts` | Expect `paymentReadinessDurationMs` |
| `client/src/lib/cashier-workspace/__tests__/cashierPaymentReadinessInstrumentation.architecture.guards.test.ts` | New program guards |
| `docs/engineering/programs/CASHIER-PAYMENT-READINESS-INSTRUMENTATION-1/IMPLEMENTATION-REPORT.md` | This report |

No server, schema, ADR, Check, Charge, Confirm, or tender-handler changes.

---

## 9. Tests run

```
npx vitest run
  cashierPaymentFlowTiming.test.ts                                     12 passed
  cashierPaymentFlowTiming.architecture.guards.test.ts                  4 passed
  cashierPaymentReadinessInstrumentation.architecture.guards.test.ts    4 passed
  cashierPaymentReadiness.architecture.guards.test.ts                   3 passed
  cashierPaymentFlow.architecture.guards.test.ts                        4 passed
  cashierPaymentFlowUxCorrection.architecture.guards.test.ts            4 passed
  cashierPaymentReadiness.test.ts                                      18 passed
```

**49 passed.** No fake production samples. No artificial sleeps.

---

## 10. Safety analysis

| Rule | Result |
|---|---|
| Financial / payment / Check logic | Unchanged |
| Confirm `disabled` expression | Unchanged |
| Tender `onClick` | Unchanged |
| `computeCheckMoney` / APIs / schema / TX | Unchanged |
| Timing `mark` / emit | Synchronous `console.info` only |
| Readiness module | Still presentation-only; timing does not import it |
| Browser money authority | Not introduced |

Architecture guards require: no `mutateAsync` / `fetch` / `trpc` / `getDb` / `computeCheckMoney` / `grandTotal` in the timing module; Confirm gate and ready mark share the same four conditions.

---

## 11. Known limitations

1. **`CASHIER_CHECK_READ_START` / `RESPONSE` still absent.** Adding them would wrap `checkQuery` (broader than this program). Check-read HTTP remains inside the L1 gap: `paymentReadinessDurationMs − saleDurationMs − intakeDurationMs`.
2. **L1 emit is client `console.info`**, same channel as `cashier_payment_flow`. It is **not** written to server `opsLog`. Collection requires client/browser (or log-forwarded) capture.
3. **`resumePaymentSheet`** does not stamp `CASHIER_PAYMENT_WORKFLOW_START`.
4. If the cashier selects tender **after** Check is already readable, L1 includes that wait. Tender click itself is still local state (not re-instrumented).
5. **`checkReadinessDurationMs` is unchanged** and still starts after intake. Do not use it as TOTAL L1.
6. This program **did not collect** ≥10 live samples (environment constraint). It makes collection possible.

---

## 12. Sampling instructions

1. Use Cashier POS: ticket → **الدفع** → select نقدًا or شبكة when the sheet allows → wait until Confirm is enabled.
2. Capture browser/client logs for `[OPS][ORDER][info] cashier_payment_readiness`.
3. Confirm click / cancel is **not** required for L1 (unlike the previous complete-only emit).
4. Optionally pair `metadata.orderId` with server `pos_sale_created`, `pos_check_intake`, `pos_check_read`.
5. Target ≥10 (prefer ≥20) successful readiness events on the same restaurant.

Do not create Orders solely for measurement if staging already exercises this path.

---

## 13. Expected sample format

From each `cashier_payment_readiness` payload:

| Column | Field |
|---|---|
| L1 Total | `metadata.paymentReadinessDurationMs` |
| Sale | `metadata.saleDurationMs` |
| Intake | `metadata.intakeDurationMs` |
| Check Read | not isolated (limitation 1) |
| Gap | `paymentReadinessDurationMs − saleDurationMs − intakeDurationMs` (null-safe) |

```
| Sample | L1 Total | Sale | Intake | Check Read | Gap |
|-------:|---------:|-----:|-------:|-----------:|----:|
| 1 | paymentReadinessDurationMs | saleDurationMs | intakeDurationMs | (not instrumented) | L1 − sale − intake |
```

Also record `paymentWorkflowStartAt`, `paymentReadyAt`, `cashierFlowId`, `orderId`, `checkId`.

---

## 14. Confirmation that no financial behavior changed

- Confirm enablement formula is the same four conditions; only the **observer** now matches them.
- No Check/Bill/Charge/`computeCheckMoney`/settlement/sale/intake/read procedure edits.
- No schema, payments table, or PaymentEngine.
- Server remains financial authority. Browser remains presentation/input plus diagnostic `console.info`.

---

## Final classification

**INSTRUMENTATION-COMPLETE-WITH-LIMITATIONS**

`paymentWorkflowStartAt` and `paymentReadyAt` are captured on the real `placeSale` → Confirm-usable path, and `paymentReadinessDurationMs` is emitted at that moment. Check-read HTTP is still unscoped; L1 is client-console, not server `opsLog`.
