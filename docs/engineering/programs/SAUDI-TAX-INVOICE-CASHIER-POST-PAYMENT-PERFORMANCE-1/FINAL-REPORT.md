# FINAL-REPORT

## Verdict: **PASS WITH OPEN QUESTIONS**

Open questions unchanged (classification/VAT/seller OQs). Live browser re-timing not run in-agent.

## BASELINE (operator observation)

Confirm → PAID ≈ **2–3 seconds**  
Additional Saudi Tax Invoice delay ≈ **4–5 seconds**  
Observed total ≈ **8–9 seconds**

## Source of additional latency

1. Async Compliance Tax Invoice generation **after** PAID (correct; not in payment await).  
2. Cashier poll wait until document READY.  
3. **Unnecessary** `renderSaudiPhase1InvoiceHtml` / `QRCode.toDataURL` on every `getPhase1ByOrder` though Cashier never uses `html`.  
4. 1000ms poll interval delayed readiness detection.

Payment was **not** awaiting Tax Invoice (fire-and-forget dispatch confirmed).

## Post-fix (code + automated)

| Change | Effect |
|--------|--------|
| `includeHtml: false` default | Removes QR PNG/HTML from Cashier poll path |
| Poll 300ms | Finer readiness detection |
| Dialog open before invalidate | Post-payment UI not blocked behind POS refetch storm |

**Measured live Confirm→READY after fix:** LIVE BROWSER NOT RUN IN-AGENT — do not claim wall-clock improvement without operator numbers.  
**Structural:** PAID → dialog interactive is same-tick after settlement response; READY remains async Compliance + poll.

## Certifications

- Collection Fact / PAID / Payment / Settlement unchanged.  
- Tax Invoice remains Compliance artifact.  
- Customer unchanged. Phase 1 QR generation path unchanged.  
- Simplified + Standard QR still from persisted payload in Cashier View.  
- Paid Receipt retained operationally; one Saudi customer-facing document.  
- No Phase 2 / Fatoora / migration.  
- Dispatch remains durable-enough best-effort (not blindly stripped of catch).

## Verification

| Gate | Result |
|------|--------|
| Focused tests | PASS |
| `pnpm run check` | (run at commit) |
| `db:governance-check` | (run at commit) |
| Live browser | NOT RUN IN-AGENT |
| Migration | none |

## Commit / remote

- Commit: `ad580584` — `perf(cashier): decouple Saudi tax invoice readiness from post-payment blocking`
- Live browser: **NOT RUN IN-AGENT**
- Push / HEAD: after `git push origin main`
