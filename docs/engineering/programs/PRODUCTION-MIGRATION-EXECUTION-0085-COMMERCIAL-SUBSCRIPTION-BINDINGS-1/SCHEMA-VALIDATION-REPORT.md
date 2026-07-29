# SCHEMA-VALIDATION-REPORT — 0085

## Table

`commercial_subscription_bindings` — **present**

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| id | varchar(36) | NO | PRI |
| subscriptionId | int | NO | UNI |
| planVersionId | varchar(36) | NO | MUL |
| snapshotId | varchar(36) | NO | MUL |
| legacyPlanId | int | YES | |
| createdAt | timestamp | NO | DEFAULT CURRENT_TIMESTAMP |

## Indexes / constraints

| Name | Type | Column |
|------|------|--------|
| PRIMARY | PK | id |
| commercial_subscription_bindings_sub_uq | UNIQUE | subscriptionId |
| commercial_subscription_bindings_version_idx | INDEX | planVersionId |
| commercial_subscription_bindings_snapshot_idx | INDEX | snapshotId |

## FK strategy

Application-owned references (no DB foreign-key clauses) — matches migration design / ADOPTION-1 bindings schema.

## Drift

None detected vs journal SQL for 0085. Post-preflight: all journal hashes recorded in DB.
