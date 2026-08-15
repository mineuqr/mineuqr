# PRODUCTION FORENSICS

This program performed **no Production mutation**. Migration `0089` was **not applied**. Snapshot table does **not** exist on Production.

## Session

| Field | Value |
|-------|--------|
| queriedAt (client) | `2026-08-15T16:52:23.980Z` |
| DATABASE() | `mineuqr` |
| server_ts | `2026-08-15T13:52:26.000Z` |
| access | PRODUCTION (TiDB Cloud prod host, TLS, db `mineuqr`) |
| mutation | NONE |

## Counts

| Population | Count |
|------------|------:|
| `user_subscriptions` | 7 |
| `commercial_subscription_bindings` | 3 |
| `commercial_subscription_charged_terms` | table absent (0) |
| duplicate bindings | 0 |

Prior certified SELECT (`2026-08-15T16:17:34.257Z`) had 6 subscriptions and 2 bindings. The delta is **one new complete Binding** (`870001`). This program did not create it.

## Complete Binding rows (0089 would copy these exactly)

| subscriptionId | chargedAmount | currency | cycle | planId (Live Plan UUID) |
|----------------|---------------|----------|-------|-------------------------|
| 810001 | 19.00 | USD | monthly | `79cf7bf7-…` |
| 840001 | 19.00 | USD | monthly | `79cf7bf7-…` |
| 870001 | 29.00 | USD | monthly | `0ade795a-…` |

`effectiveFrom` on copy = `bindings.createdAt`. Amounts are not inferred from Live Plan.

## Unbound (0089 must not invent terms)

| id | status | cycle | note |
|----|--------|-------|------|
| 600001 | active | monthly | no Binding |
| 690001 | active | monthly | no Binding |
| 750001 | active | monthly | no Binding |
| 780001 | active | yearly | still present, unbound; do not backfill |

Historical data is **not ambiguous** for the three complete Binding rows. Unbound rows remain without snapshots by design.

Do not apply 0089 in this program.
