# PERFORMANCE-BASELINE

## Pre-fix (operator / product observation)

| Metric | Value |
|--------|-------|
| Confirm → PAID | ≈ 2–3 s |
| Additional Saudi Tax Invoice delay | ≈ 4–5 s |
| Confirm → Tax Invoice usable | ≈ 8–9 s |

## Architectural baseline (code inspection)

| Step | Behavior |
|------|----------|
| T0 Confirm click | Client |
| T1–T2 Settlement HTTP | Awaited (~2–3 s wall) |
| T3–T4 CF / PAID | Inside settlement; response includes paidReceipt |
| T5 Compliance dispatch | Fire-and-forget (not awaited) |
| T6–T7 Tax Invoice + Phase 1 | Async after response |
| T8 Dialog open | Sync after response (unification) |
| T9–T10 getPhase1ByOrder + poll | Client wait until document; HTML QR render on each hit |

## Post-fix target

| Metric | Target |
|--------|--------|
| Confirm → PAID | Unchanged financial path |
| PAID → post-payment dialog interactive | Immediate (same tick as success) |
| PAID → Tax Invoice READY | Async; no HTML QR on Cashier polls; ≤300ms poll granularity |

Live browser re-measurement: see FINAL-REPORT / TEST-REPORT.
