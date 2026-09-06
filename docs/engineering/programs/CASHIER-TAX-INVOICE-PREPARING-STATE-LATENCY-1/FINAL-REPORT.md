# CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 — Final Report

| Field | Value |
|-------|-------|
| **Program** | CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 |
| **Date** | 2026-09-06 |
| **Metric** | Tax Invoice modal open → READY (preparing → content) |

## 1. ROOT CAUSE

**Classification: duplicate work / race + database contention during preparing**

After PAID, the modal opens immediately into `availability === "loading"` (“جاري تجهيز الفاتورة الضريبية...”). READY requires `getPhase1ByOrder` to return a Phase 1 `document`.

Two generators raced during that window:

1. Background Compliance ensure (`continueAfterHttp` / `waitUntil`)
2. Cashier `getPhase1ByOrder` read-path ensure (when row missing)

Concurrent ensure → duplicate issuance + Phase 1 + non-atomic sequence updates, amplified by immediate POS `invalidateOrderReads` storm after PAID.

Polling (300ms) only detects READY; a single ~669ms Network sample is consistent with a **later** ready fetch, not the full preparing gap.

## 2. BEFORE

| Metric | Observation |
|--------|-------------|
| Modal open → READY | ≈ **4–5 s** (operator) |
| PAID → modal open | ≈ 2–3 s (out of scope; must not regress) |
| Preparing UI | `taxInvoicePreparing` while query data null / fetching |
| Ready UI | Phase 1 document mapped into dialog |

## 3. FIX

1. **Prefer background row** — read path waits up to ~1.2s (40ms steps) for an existing TI row before ensure.  
2. **Single-flight ensure** per `collectionFactId` on one isolate.  
3. **Phase 1 re-read** before number allocate (skip if peer finished).  
4. **Atomic sequence allocate** (`FOR UPDATE` in a transaction).  
5. **Defer POS invalidations** until Tax Invoice READY (5s fallback).  
6. **Log `modalOpenToReadyMs`** in the browser console for controlled validation.

PAID / Collection Fact / Compliance ownership unchanged. Payment HTTP still does not await Tax Invoice.

## 4. AFTER

| Evidence | Result |
|----------|--------|
| Unit/architecture tests | PASS (wait-before-ensure, single-flight, guards) |
| `pnpm run check` | PASS |
| Live one-transaction wall-clock | **Operator must capture** `modalOpenToReadyMs` after deploy |

**Expected:** preparing duration ≈ background Compliance completion (often sub-second when uncontended), without a second ensure fighting it; fallback ensure only if background has not produced a row within ~1.2s.

## 5. WHY IT IS FASTER

Removed the preparing-window race and the POS invalidation contention that stretched ensure/Phase 1 into multi-second territory. Detection polling was not the 4–5s root cause.

## 6. CORRECTNESS

- CF / PAID immutable and unchanged  
- TI remains Compliance artifact; ensure remains idempotent  
- Failure does not alter PAID  
- No Saudi branching in Global Core; Customer/QR policy unchanged  

## 7. REGRESSION

Focused vitest suites PASS; `tsc --noEmit` PASS.

## 8. FILES CHANGED

See commit. Primary: `saudiTaxInvoicePhase1ViewService.ts`, `saudiTaxInvoiceEnsureSingleFlight.ts`, `saudiTaxInvoiceService.ts`, `saudiPhase1GenerationService.ts`, `saudiTaxInvoiceNumberAllocator.ts`, `CashierWorkspacePanel.tsx`, tests.

## 9. COMMITS

- `47957415` � preparing-state latency fix

## Validation checklist (one Saudi Confirm after deploy)

In browser console, note `modalOpenToReadyMs`. Also note PAID→dialog (already improved). Confirm invoice body appears without a long preparing stall.
