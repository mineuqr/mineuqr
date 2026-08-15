# MIGRATION DESIGN

File: `drizzle/0089_commercial_charged_terms_snapshots.sql`

1. CREATE TABLE (additive)
2. INSERT…SELECT from complete Binding rows only (exact chargedAmount/currency/cycle/planId, `effectiveFrom = bindings.createdAt`, version=1, source=`migration_0089`)
3. Does **not** DROP Binding charged columns
4. Does **not** invent terms for unbound subscriptions

Journal terminus advanced to 0089 / 90 entries. **Not applied to Production.**

Rollback: DROP TABLE `commercial_subscription_charged_terms` (runtime falls back to Binding leftover). Do not DROP if snapshots newer than migration copies exist.

Deploy: apply 0089 with this runtime; do not ship snapshot writes without the table.
