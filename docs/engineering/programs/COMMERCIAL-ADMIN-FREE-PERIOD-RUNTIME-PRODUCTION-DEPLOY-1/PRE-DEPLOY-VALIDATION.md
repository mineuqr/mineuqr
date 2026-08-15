# PRE-DEPLOY VALIDATION

```
PRODUCTION SCHEMA = READY
0090 = APPLIED
CONCESSION TABLE = PRESENT
CONCESSION ROWS = 0
DATA MUTATION = 0
MIGRATION ACTION = NONE
STATUS = DEPLOY AUTHORIZED
```

Pre-deploy read-only `2026-08-15T21:28:22.602Z` / server `18:28:17Z`.  
`DATABASE()=mineuqr`. Journal **0090** `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997` (count = 1).

| Table | Count |
|-------|------:|
| user_subscriptions | 7 |
| commercial_subscription_bindings | 3 |
| commercial_subscription_charged_terms | 0 |
| commercial_subscription_concessions | 0 |
| commercial_plans | 3 |
| commercial_prices | 10 |

780001 = active / yearly / unbound / `d836bd10-9d9f-4408-a076-f921354d785a` / `currentPeriodEnd` `2027-06-21T10:47:36.000Z`.

| Gate | Result |
|------|--------|
| Targeted suite | **156 passed / 16 files** |
| Paid Admin create tests | PASS |
| Free-first create tests | PASS |
| Grant / revise / cancel | PASS |
| MRR suppression | PASS |
| Charged Terms / Live Plan authority | PASS |
| Webhook compatibility | PASS |
| Admin authorization | PASS |
| `pnpm build` | exit 0 |

`pnpm check` was not re-run this program. Prior implementation check: exit 2, 188 preexisting `error TS*`. Zero diagnostics in Free Period files.
