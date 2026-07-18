# CHECK-SETTLEMENT-METHODS-1 — Validation

| Requirement | Result |
|-------------|--------|
| Existing markPaid behavior (API shape) | Pass — still restaurantId + sessionId |
| Revenue = SUM(paid Check.grandTotal) | Pass — aggregator untouched |
| Check remains aggregate owner | Pass |
| Reporting formulas / mounted APIs unchanged | Pass |
| Dashboard / Excel / PDF presentation unchanged | Pass |
| No payment gateways | Pass |
| Tenant isolation on tender rows | Pass — restaurantId column |
| Architecture guards | **Pass** (6) |
| Unit tests | **Pass** — invariants (6) + session/reporting related |
| Migration governance terminus | **Pass** — `0070_check_settlement_transactions` (71 entries) |
| `pnpm build` | **Pass** (2026-07-18) |
