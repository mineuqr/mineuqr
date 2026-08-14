# MIGRATION-0086-FORENSICS.md

**File:** `drizzle/0086_commercial_live_plans.sql`  
**Journal:** `drizzle/meta/_journal.json` idx 86, tag `0086_commercial_live_plans`  
**Applied:** **NO**  
**Decision:** **BLOCKED** — do not apply as written.

---

## Exact changes

### `commercial_plans`

- ADD `featureBundleId`, `limitProfileId`, `trialPolicyId` (nullable varchar 36)
- UPDATE from `commercial_plan_versions` where `state = 'published'`
- Fallback UPDATE any version if composition still null

### `commercial_prices`

- ADD `planId`
- UPDATE `planId` from version join
- DELETE non-published version prices **if** a published price exists for the same plan
- MODIFY `planId` NOT NULL
- DROP INDEX `commercial_prices_version_idx`
- DROP COLUMN `planVersionId`
- CREATE INDEX `commercial_prices_plan_idx`

### `commercial_promotions`

- CHANGE `eligiblePlanVersionIds` → `eligiblePlanIds` (JSON, NOT NULL)

### `commercial_subscription_bindings`

- ADD `planId`, `chargedAmount`, `chargedCurrency`, `billingCycleId`, `billingCycleCode`, `updatedAt`
- UPDATE `planId` from `planVersionId` → versions
- **DELETE rows where `planId` IS NULL**
- MODIFY `planId` NOT NULL
- UPDATE charged terms from `commercial_snapshot_definitions.payload` JSON paths:
  - `$.pricing.amount`
  - `$.pricing.currency`
  - `$.pricing.billingCycleId`
  - `$.pricing.billingCycleCode`
- DROP INDEX version + snapshot
- DROP COLUMN `planVersionId`, `snapshotId`
- CREATE INDEX `commercial_subscription_bindings_plan_idx`

### DROP TABLE (destructive, no rollback)

- `commercial_snapshot_definitions`
- `commercial_publication_rules`
- `commercial_plan_versions`
- `commercial_retirement_policies`

No explicit FOREIGN KEY clauses in 0084/0085 SQL (MySQL indexes only). Drops still destroy reconstructability.

---

## Data-migration risks

| Step | Risk |
|------|------|
| Published-version composition copy | Plans with only draft versions get fallback composition; may be incomplete |
| Price DELETE for non-published | Draft/deprecated price rows removed when a published twin exists |
| Binding DELETE WHERE planId IS NULL | Subscribers whose `planVersionId` does not join a version **lose the binding** → unbound → legacy matrix |
| JSON charged-term copy | If payload shape differs, `chargedAmount` stays NULL → runtime falls back to **live list price** |
| DROP snapshot/version tables | Cannot reconstruct charged terms or composition after a bad backfill |

---

## Current production schema (0084+0085) vs new code

| Object | Production DB today | New Drizzle / hydrate |
|--------|---------------------|------------------------|
| `commercial_plans.featureBundleId` | absent | required by hydrate |
| `commercial_prices.planVersionId` | present | **removed from schema** |
| `commercial_prices.planId` | absent | **notNull** |
| bindings `planVersionId`/`snapshotId` | present | **removed** |
| bindings `planId`/charged* | absent | `planId` **notNull** |
| `commercial_plan_versions` | present | not in schema; hydrate does not read it |
| `commercial_snapshot_definitions` | present | not in schema |

**Deploying this code before 0086:** `hydrateCommercialCatalogFromDb` SELECTs `featureBundleId` and `prices.planId` → MySQL unknown column. Catalog ready-gate fails. Bindings SELECT also expects `planId`; errors are swallowed → all subscribers look unbound.

**Applying 0086 then running old code:** old publication/snapshot services would fail. This tree already removed those services.

---

## Rollback

There is **no down migration**. DROP TABLE is irreversible without backup restore.

---

## §14 compliance

Version/snapshot tables are unused by **new** TypeScript, but they are **not proven dead** as historical reconstruction sources until charged-term backfill is verified row-by-row.

**KEEP TEMPORARILY.** Split retirement of those tables into a later program after:

1. Additive columns + backfill
2. Verification query: every binding has non-null `planId` and `chargedAmount` (or an explicit exception list)
3. Dual-read soak
4. Then drop
