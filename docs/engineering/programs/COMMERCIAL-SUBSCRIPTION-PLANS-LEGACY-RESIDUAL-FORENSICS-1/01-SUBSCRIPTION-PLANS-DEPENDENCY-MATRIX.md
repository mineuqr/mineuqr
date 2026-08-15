# 01 — subscription_plans DEPENDENCY MATRIX

Every occurrence class is one of A–K. Production runtime commercial paths do **not** query this table.

## 1. Production runtime verdict

| Question | Answer | Evidence |
|----------|--------|----------|
| Does any production runtime **read** `subscription_plans`? | **NO** | `getSubscriptionPlans` / `getSubscriptionPlanById` defined only in `server/db.ts`; no import/call from routers, webhooks, trial, checkout, CMS, CRS, limits, MRR |
| Does any production runtime **write** `subscription_plans`? | **NO** | `createSubscriptionPlan` defined only in `server/db.ts`; no production caller |
| Does any API depend on its **rows**? | **NO** | `listPlans` uses Live Plan offerings + `legacyPlanId` from `LEGACY_PLAN_BRIDGE`, not the leftover table |
| Does any foreign key exist? | **NO** | Drizzle schema has no FK; Production `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` returned `[]` |
| Does any database object reference it? | **NO** (no FK, no view found in schema) | Table is standalone |
| Does any migration depend on it as a live join? | **NO** after 0088 | 0088 explicitly does not touch it; earlier migrations created/altered it |
| Does any reset/seed process require it? | **YES (dev/ops only)** | `server/seed-plans.mjs` writes it; reset scripts preserve or inventory it |

## 2. ORM / schema

| File | Symbol | Class | Purpose | Removable now? |
|------|--------|-------|---------|----------------|
| `drizzle/schema.ts` | `subscriptionPlans` table | C | Leftover table definition (`id` int, prices, limits, features) | NO — schema drop needs SAFE DELETE + migration |
| `drizzle/schema.ts` | `InsertSubscriptionPlan` / `SelectSubscriptionPlan` | C | Types for leftover ORM | NO — tied to table |
| `server/db.ts` | `getSubscriptionPlans()` | C + H | `SELECT` active leftover rows | NO as a lone delete — tests mock it; runtime unreachable |
| `server/db.ts` | `getSubscriptionPlanById(id: number)` | C + H | `SELECT` by leftover integer id | NO as a lone delete |
| `server/db.ts` | `createSubscriptionPlan` | C + H | `INSERT` leftover row | NO as a lone delete |
| `server/db/schema/commercial/bindings.ts` | — | — | Does **not** reference leftover table. `planId` is Live Plan UUID; `legacyPlanId` is int compatibility | N/A |

`user_subscriptions.planId` is `varchar(36)` and is **not** a foreign key to `subscription_plans`.

## 3. Runtime commercial paths (negative proof)

Guards in `server/commercial-catalog/__tests__/subscriptionPlansResidual.guards.test.ts` and source inspection:

| Path | Function | Reads leftover table? | Class |
|------|----------|----------------------|-------|
| Checkout PayPal | `createCheckoutSession` → `resolveCheckoutOfferFromLivePlan` | NO | J (integer handle only) |
| Checkout Tap | `createTapCheckout` → same | NO | J |
| listPlans | `listPlansForSelectionLegacyShape` | NO — Live Plan + bridge | J |
| getCurrentSubscription | `resolveSubscriptionPlanView(subscription.planId)` | NO — UUID / Live Plan | A of Live Plan, not leftover table |
| Trial | `resolveTrialPlanId` → `resolveCanonicalLivePlanId` | NO | J (30002 handle) |
| PayPal webhook | `resolveCanonicalLivePlanId` | NO | J |
| Tap webhook | `resolveCanonicalLivePlanId` | NO | J |
| Admin create/update | `resolveCanonicalLivePlanId` | NO | J |
| Limits | `resolvePlanLimitsForUser` → `resolveOwnerEntitlements` | NO | — |
| MRR | `computeMrrFromChargedTerms` | NO | — |
| Invoice PDF | Charged Terms `chargedAmount` | NO | — |
| Deprecated admin stats | `getAdminStatistics` uses `planService` + `resolveLegacyPlanIdFromPlan` | NO leftover SELECT | J (display integer) |
| Deprecated revenue | `getRevenueByMonth` returns 0 buckets | NO | H (soft-sunset) |

## 4. Seeds / scripts

| File | Class | What it does | Required for production runtime? |
|------|-------|--------------|----------------------------------|
| `server/seed-plans.mjs` | D + B (ops only) | `DELETE` + `INSERT` leftover catalog rows. Marked deprecated emergency bridge repair | NO |
| `update-plans-features.mjs` | F | Historical leftover `featuresAr` updater | NO |
| `scripts/clean-db-2-execute.mjs` | F | **Keeps** `subscription_plans` as a reference table | Dev reset only |
| `scripts/production-operational-data-reset.mjs` | F | Inventories / preserves leftover table in reset set | Ops only |
| `scripts/financial-epoch-reset.mjs` | F | Preserves leftover table (financial reset must not drop catalog leftovers) | Ops only |
| `scripts/data-integrity-audit-phase2-readonly.mjs` S5 | F (stale) | `LEFT JOIN subscription_plans p ON p.id = s.planId` — **broken after OD-2** (UUID vs int). Would false-flag all 7 Production rows | Script repair later |
| `scripts/exec-4-commercial-authority-backfill.mjs` | F | Historical SELECT leftover prices | Historical |
| `scripts/clean-db-2-execution-preview-readonly.mjs` | F | Inventory | Ops only |
| Prior program `_snapshot.mjs` / `_validate.mjs` / `_forensics.mjs` | F + G | Historical production probes | Historical |

## 5. Tests

All leftover-table **mocks** are E. They do not prove production reads.

| File | Class | Kind |
|------|-------|------|
| `subscriptionPlansResidual.guards.test.ts` | E | Legacy regression guard (forbids leftover reads) |
| `livePlanIdentity.guards.test.ts` | E | Legacy regression guard |
| `commercialCatalogAdoption.guards.test.ts` | E | Legacy regression guard |
| `canonicalMrrChargedTerms.guards.test.ts` | E | Legacy regression guard |
| `trial-and-webhook.test.ts` | E | Fixture mock of leftover helpers |
| `subscription.test.ts` | E | Fixture mock |
| `payment-flow.test.ts` | E | Fixture mock |
| `routers.test.ts` | E | Fixture mock |
| `admin-invoice-billing.test.ts` | E | Fixture mock (unused by invoice path) |
| `admin-subscription.test.ts` | E | Fixture mock |
| `admin-auth-1e.test.ts` / `adminAuth1c.test.ts` | E | Fixture mock |
| `CommercialReadService*.test.ts` | E | Fixture mock; one asserts helper **not** called |
| `CommercialReportService.test.ts` / `analyticsAlignment.test.ts` | E | Fixture mock |
| `exec3DashboardApi.test.ts` / `exec7c2CommercialOverview.test.ts` / `exec4PostBackfill.parity.test.ts` / `authorityCleanup1.test.ts` | E | Fixture mock |
| `phase-c-verification.test.ts` / `restaurant-profile-verification.test.ts` / `subscription-invoice-verification.test.ts` | E | Fixture mock |

Do not delete these tests in this program.

## 6. Migrations

| Artifact | Class | Note |
|----------|-------|------|
| `drizzle/0000_shiny_blizzard.sql` | I | CREATE `subscription_plans` |
| `drizzle/0001_new_demogoblin.sql` | I | ALTER `isActive` |
| `drizzle/0002_watery_ironclad.sql` | I | Recreate leftover table |
| `drizzle/0004_wooden_anthem.sql` | I | DROP `featuresEn` |
| `drizzle/0006_colorful_storm.sql` | I | ADD `featuresAr` |
| `drizzle/meta/0000`–`0028` snapshots | I | Historical snapshots include leftover table |
| `drizzle/0085_*.sql` | I | Adds `bindings.legacyPlanId` — not leftover table |
| `drizzle/0086` / `0087` / `0088` comments | I | Explicitly do **not** touch leftover table |
| `drizzle/meta/_journal.json` terminus `0088` | I | Applied in Production (`6084102`) |

Journal history must remain. Dropping the table requires a **new** gated migration, not an edit of 0000–0006.

## 7. Documentation

Widespread G references in prior commercial programs and ADRs. They record that leftover table is **not** authority. Not runtime.

## 8. Runtime occurrence records (leftover table helpers)

### `getSubscriptionPlans`

- **File:** `server/db.ts`
- **Function:** `getSubscriptionPlans`
- **Caller:** none in production. Tests mock it.
- **Purpose:** list active leftover catalog rows
- **Data:** leftover name/price/limits
- **Customer-facing:** no (unreachable)
- **Financial:** would have been, if called — it is not
- **Identity-related:** leftover integer ids
- **Canonical replacement:** `listLivePlanOfferings` / public catalog
- **Removable now?** NO (tests + ORM coupling)
- **Separate program?** YES — SAFE DELETE / dead-helper cleanup after OD-4

### `getSubscriptionPlanById`

- Same as above. Replacement: `planService.get` / `resolveLivePlanDisplayByPlanRef`.

### `createSubscriptionPlan`

- Same as above. Replacement: Commercial Hub / `commercial_plans` writers. Seed `seed-plans.mjs` writes SQL directly, not this helper.

## 9. Historical data class (Production)

Production leftover table: **3 rows**, ids `30001` / `30002` / `30003`, all `isActive`.

Classification: **unused leftover catalog data** (mirror of the three Live Plan codes). Not customer contracts. Customer identity lives on `user_subscriptions.planId` (UUID) and Charged Terms.

Do not delete.

## 10. Dead-code candidates (do not remove here)

| Candidate | Evidence of deadness | Callers | Tests | Replacement |
|-----------|----------------------|---------|-------|-------------|
| `getSubscriptionPlans` | no production import/call | tests only | many mocks | Live Plan list |
| `getSubscriptionPlanById` | no production import/call | tests only | many mocks | `planService.get` |
| `createSubscriptionPlan` | no production import/call | none | none | Commercial Hub |
| `resolveTableOrderingEntitlement` + `BASIC_FREE_PLAN_ID` | only `subscription-entitlement.test.ts` | none in routers | unit tests | Live Plan entitlements |
| `monthlyEquivalentPlanPrice` | already deleted from runtime | docs + guard string | guard | Charged Terms MRR |
