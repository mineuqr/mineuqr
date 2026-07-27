# ORDERING-CHANNEL-GOVERNANCE-1 — Regression Report

| Area | Expectation | Status |
|------|-------------|--------|
| Revenue / Settlement / Refund / Tax | Untouched | Protected |
| Business Identity / ownership | Untouched | Protected |
| Reporting API / DTO contracts | Unchanged shapes | Protected |
| Sales Channel Analytics procedure | Same endpoint | Protected |
| QR / Waiter / Kiosk place flows | Still stamp channels | Strengthened (required) |
| Waiter device place | Now stamps `waiter_tablet` | Gap closed |
| Historical channel cards | Null stamps → `unassigned` not `table` | Intentional governance change |

## Dashboard

No UI redesign. Sales Source continues to bind `SalesChannelAnalyticsDto`.
Registry display names feed labels for known reporting ids.
