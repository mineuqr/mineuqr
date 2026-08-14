# MIGRATION-EXECUTION.md

## Phase 1 — file review (before apply)

File: `drizzle/0086_commercial_live_plans.sql`  
Header: `COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1`  
Journal: idx 86, tag `0086_commercial_live_plans`

Confirmed identical to the approved clean-reset implementation:

- Additive live composition columns on `commercial_plans`
- DELETE of commercial catalog aggregates only
- Prices retargeted to `planId`; `planVersionId` dropped
- Bindings table kept; 0 rows; switched to live `planId` + charged terms
- DROP of `commercial_plan_versions`, `commercial_snapshot_definitions`, `commercial_publication_rules`, `commercial_retirement_policies`
- No INSERT of live plans (bootstrap is application-side)

Forbidden-table DML: **none**. `users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, `subscription_history`, `orders`, and settlement appear only in comments.

No `v.state = 'published'`, no `JSON_EXTRACT`, no `DELETE FROM commercial_subscription_bindings`.

**Review gate: PASS.**

## Phase 2 — apply

Mechanism: `pnpm exec drizzle-kit migrate` (repository governance path).  
Not manual SQL. Not `db:push`. Not journal-only marking.

Result: `migrations applied successfully!`

Post-apply terminus:

| Field | Value |
|-------|-------|
| Tag | `0086_commercial_live_plans` |
| `__drizzle_migrations.id` | 6024102 |
| hash prefix | `cfaec30e54892eaf` |
| `created_at` | 1784720000000 (journal `when` for 0086) |
| Prior 0085 row | retained (`5994103` / `c104e894606f…`) |

`pnpm db:preflight` after apply: **All journal migration hashes recorded in DB.**  
`pnpm db:verify-schema`: **OK** (auth, order-read, operational-device, fulfilment, and related required objects).

## Schema after 0086 (before bootstrap)

| Object | State |
|--------|-------|
| `commercial_plans.featureBundleId` / `limitProfileId` / `trialPolicyId` | present |
| `commercial_prices.planId` | present, NOT NULL |
| `commercial_prices.planVersionId` | removed |
| binding charged-term columns | present |
| binding `planVersionId` / `snapshotId` | removed |
| version / snapshot / publication / retirement tables | **ABSENT** |
| `commercial_plans` rows | **0** (wipe; bootstrap not yet run) |
| bindings | **0** |

Platform fingerprints after migrate matched preflight (owner, Tap, `subscription_plans` 19/39/99, instance table counts). See [DATABASE-INTEGRITY.md](./DATABASE-INTEGRITY.md).
