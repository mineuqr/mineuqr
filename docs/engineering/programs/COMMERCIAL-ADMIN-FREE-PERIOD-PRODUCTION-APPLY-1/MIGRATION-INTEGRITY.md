# MIGRATION INTEGRITY

**File:** `drizzle/0090_commercial_subscription_concessions.sql`  
**Local / Production hash:** `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997`

SQL was not modified in this program.

## Allowed operations present

- `CREATE TABLE commercial_subscription_concessions`
- `PRIMARY KEY(id)`
- `UNIQUE(subscriptionId, version)`
- `CREATE INDEX commercial_concessions_sub_status_ends_idx (subscriptionId, status, endsAt)`
- Journal entry `0090_commercial_subscription_concessions`

## Forbidden operations absent

INSERT, UPDATE, DELETE, DROP, ALTER, backfill, `780001`, `subscription_plans`, `commercial_prices`, `chargedAmount`, Charged Terms table.

Comment text mentions `user_subscriptions` only as a negative (“does NOT modify”). No DML against that table.

## Subscription relation

Approved SQL has `subscriptionId int NOT NULL` plus unique version. **No MySQL FOREIGN KEY** was in the approved artifact. None was invented.

## Verdict

**PASS** — additive schema only.
