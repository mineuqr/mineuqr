# CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 — Final Report

| Field | Value |
|-------|-------|
| **Program** | CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 |
| **Date** | 2026-09-06 |
| **Source investigation** | `docs/architecture/evaluations/CASHIER-POST-PAYMENT-LATENCY-ROOT-CAUSE-INVESTIGATION-1.md` |

## 1. ROOT CAUSE

**Dominant cause of the ~4–5s post-PAID Tax Invoice delay:**

After Collection Fact / PAID, Compliance Tax Invoice generation was started as bare fire-and-forget **in parallel with** heavy operational Check/ST/OS/SR delivery **and** deferred Order outbox relay (`setImmediate` → batch up to 50). On serverless, there was also **no `waitUntil`**, so continuation was fragile.

Cashier then polled until a Tax Invoice row appeared. The user-visible wait was therefore:

1. Delayed / contended Compliance execution (not payment awaiting TI), plus  
2. Null-poll gap when the row did not exist yet (read path could not ensure-from-CF).

Polling interval / HTML PNG were secondary and already mitigated; they were not the residual multi-second cause.

## 2. BEFORE

| Segment | Observation |
|---------|-------------|
| Confirm → PAID | ≈ 2–3 s (operator) |
| PAID → Tax Invoice READY | ≈ **4–5 s** (operator) |
| Architecture | CF → void Compliance ‖ void settlement ‖ setImmediate relay |
| `getPhase1ByOrder` | `null` until background insert; no CF ensure |

## 3. FIX

1. **`continueAfterHttp` + `@vercel/functions` `waitUntil`** — keep post-response Compliance work alive.  
2. **Sequence:** Compliance → operational settlement → deferred outbox relay (`awaitRelay: "skip"` until after Compliance).  
3. **Parallelize** independent issuance-context DB reads; skip context reload on immutable replay.  
4. **Read-path ensure** on `getPhase1ByOrder` when row missing (from production Collection Fact; SA-only; idempotent; never mutates CF/PAID).  
5. **Permanent ops timing:** `compliance_after_collection_fact_completed` / `_failed` with `durationMs`.

HTTP still returns after CF without awaiting Compliance (PAID boundary preserved).

## 4. AFTER

| Evidence | Result |
|----------|--------|
| Sequencing unit test | Settlement runs only after Compliance finishes; `waitUntil` invoked |
| Contention model test | Parallel settlement model READY ≥ settlement duration; sequenced READY ≈ compliance duration only |
| Live Cashier browser re-time | **NOT RUN IN-AGENT** — deploy + one Saudi Confirm to confirm wall-clock |
| Expected production PAID→READY | Dominated by isolated Compliance duration (target ≪ 4–5 s; preferably ~1 s when DB healthy), with first poll able to complete ensure if background lags |

Confirm → PAID path was **not** extended to await Tax Invoice.

## 5. WHY IT IS FASTER

- Removed **parallel contention** between TI generation and Check finalize / outbox relay.  
- Removed **serverless freeze gap** via `waitUntil` when available.  
- Removed **null-poll waiting** when background has not inserted yet (first poll ensures from CF).  
- Reduced issuance round-trips via `Promise.all` and immutable replay short-circuit.

## 6. CORRECTNESS

- Collection Fact / PAID unchanged; Compliance still post-CF.  
- TI remains Saudi Compliance artifact; idempotent ensure.  
- TI failure does not alter PAID; settlement still runs after Compliance attempt.  
- Customer unchanged; no fake Customer; SA logic stays in Compliance module.  
- Phase 1 QR policy unchanged; snapshots immutable on replay.

## 7. REGRESSION

| Check | Result |
|-------|--------|
| Focused vitest (compliance / finalize / sequencing / read-path / contention) | PASS |
| `pnpm run check` (`tsc --noEmit`) | PASS |
| Live browser | NOT RUN IN-AGENT |

## 8. FILES CHANGED

See commit. Primary: `continueAfterHttp.ts`, `dispatchComplianceAfterProductionCollectionFact.ts`, `finalizeCashierPreparedInvoice.ts`, `mapOrderDomainError.ts`, `saudiTaxInvoiceService.ts`, `saudiTaxInvoicePhase1ViewService.ts`, `CheckService.ts`, `opsTaxonomy.ts`, tests, `@vercel/functions` dependency.

## 9. COMMITS

- `ee82c1a7` — `perf(cashier): cut post-PAID Tax Invoice delay via Compliance-first dispatch`
