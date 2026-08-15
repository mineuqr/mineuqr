# MIGRATION 0090

**File:** `drizzle/0090_commercial_subscription_concessions.sql`  
**Journal tag:** `0090_commercial_subscription_concessions`  
**Local hash:** `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997`  
**Governance tail:** `CANONICAL_MIGRATION_TAIL_TAG` advanced to this tag; journal count 91.

## Operations

```
CREATE TABLE `commercial_subscription_concessions` (...)
CREATE INDEX `commercial_concessions_sub_status_ends_idx` ...
UNIQUE (`subscriptionId`, `version`)
```

## Forbidden in this file

- INSERT / UPDATE / DELETE
- DROP
- Backfill
- Touch `commercial_prices`, `commercial_subscription_charged_terms`, `user_subscriptions`, `780001`

## Production

**Not applied.** Production journal remains **0089**  
`45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d`.

`count_hash_0090 = 0`. Table `commercial_subscription_concessions` does not exist in Production.

A separate authorized apply program is required before Production migrate.
