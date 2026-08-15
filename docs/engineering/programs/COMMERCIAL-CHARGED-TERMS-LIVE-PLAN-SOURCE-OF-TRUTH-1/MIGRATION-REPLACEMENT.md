# MIGRATION REPLACEMENT

File: `drizzle/0089_commercial_charged_terms_snapshots.sql` (replaced in place; **never applied** to Production).

Previous VERSIONING-1 strategy (INSERT…SELECT Binding charged fields) is **rejected**.

Replacement:

1. CREATE TABLE `commercial_subscription_charged_terms`
2. UNIQUE `(subscriptionId, version)`
3. INDEX `(subscriptionId, effectiveFrom)`
4. **No DML.** Empty table.

No `user_subscriptions`, `commercial_plans`, `commercial_prices`, invoices, payments, `subscription_plans`, or Binding column DROP.

No Production row is eligible for backfill without historical-price inference. Therefore: **NO BACKFILL**, including 810001 / 840001 / 870001 leftover Binding amounts and **780001**.

Initial snapshots appear only from Admin create / Admin plan-cycle change / first webhook bind (Live Plan current offer).
