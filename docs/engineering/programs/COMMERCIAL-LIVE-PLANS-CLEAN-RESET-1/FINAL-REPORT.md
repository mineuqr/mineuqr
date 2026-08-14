# FINAL-REPORT.md — COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1

**Date:** 2026-08-15  
**Verdict:** **READY FOR ARCHITECTURE AUTHORITY**

Preflight **PASS**. Unapplied conversion `0086` **replaced** with a catalog-only clean reset. **Not applied** to production. No commit, push, or deploy. Owner `600001` and Tap payment `60001` were not written.

---

## Exact migration number

`0086_commercial_live_plans` (journal idx 86). Replaced in place because it was never applied. Governance terminus updated to 0086 (87 entries).

## Exact tables modified (when applied)

| Table | Operation |
|-------|-----------|
| `commercial_plans` | ADD composition columns; **DELETE all rows** |
| `commercial_prices` | ADD `planId`; DROP `planVersionId`; **DELETE all rows** |
| `commercial_promotions` | rename eligible ids; **DELETE all rows** |
| `commercial_subscription_bindings` | ADD live/charged columns; DROP version/snapshot columns (0 rows) |
| `commercial_feature_bundles` / `commercial_bundle_features` | DELETE rows |
| `commercial_limit_profiles` / `commercial_limit_values` | DELETE rows |
| `commercial_trial_policies` / `commercial_migration_policies` | DELETE rows |
| `commercial_regions` / `commercial_billing_cycles` | DELETE rows |

## Exact tables deleted (when applied)

`commercial_plan_versions`, `commercial_snapshot_definitions`, `commercial_publication_rules`, `commercial_retirement_policies`

## Exact plans created (bootstrap, after migrate)

`basic` Basic · `professional` Professional · `enterprise` Enterprise  

Codes only; new UUIDs at bootstrap time. Idempotent: second run `already_initialized`, no duplicates.

## Exact capabilities assigned

`projectionFeatureKeysForBridgePlan` (Projection + Presentation). Test D asserts equality per plan. `qrMenu` and other legacy keys are not bundle members.

## Exact prices assigned (catalog book)

| Plan | Monthly USD | Yearly USD | Monthly SAR | Yearly SAR |
|------|-------------|------------|-------------|------------|
| Basic | 0.00 | 0.00 | — | — |
| Professional | 26.40 | 264.00 | 99.00 | 990.00 |
| Enterprise | 79.73 | 797.33 | 299.00 | 2990.00 |

Checkout `subscription_plans` 19/39/99 USD **unchanged**.

## Test results

| Suite | File | Count | Result |
|-------|------|-------|--------|
| Clean reset A–D + 0086 guards | `commercialLivePlans.cleanReset.test.ts` | 6 | PASS |
| AA capability / price | `commercialLivePlans.architectureAuthority.validation.test.ts` | 2 | PASS |
| Atomic save / rollback | `commercialCatalogFoundation.services.test.ts` | 4 | PASS |
| Bootstrap + public | `commercialPersistentCatalogBootstrap.architecture.test.ts` | 4 | PASS |
| Public publishing | `commercialCatalogPublicPublishing.test.ts` | (file) | PASS |
| Entitlement enforcement | `subscriptionRuntimeEntitlement.enforcement.test.ts` | 10 | PASS |
| Entitlement guards | `subscriptionRuntimeEntitlement.guards.test.ts` | 5 | PASS |
| Subscription audit | `subscriptionAudit.test.ts` | 13 | PASS |
| Trial / webhook | `trial-and-webhook.test.ts` | 5 | PASS |
| Admin invoices | `admin-invoice-billing.test.ts` | 5 | PASS |
| Invoice verification | `subscription-invoice-verification.test.ts` | 11 | PASS |
| Projection guards | `commercialProjectionGeneration.guards.test.ts` | 8 | PASS |
| Catalog architecture | `commercialCatalogFoundation.architecture.guards.test.ts` | 7 | PASS |
| Admin UI | `commercialCatalogManagementUi.guards.test.ts` | 2 | PASS |
| Production polish | `commercialCatalogProductionPolish.guards.test.ts` | 8 | PASS |
| Admin experience | `commercialCatalogAdminExperience.guards.test.ts` | 4 | PASS |
| Operational validation | `commercialCapabilityOperationalValidation.test.ts` | 8 | PASS |
| Migration governance | `migrationGovernance.test.ts` | 10 | PASS |
| `pnpm db:governance-check` | guard | n/a | OK |
| Locales en/ar | JSON parse | n/a | OK |
| Production `tsc` / `npm run build` | — | n/a | **Not certified** (repo-wide typecheck was already failing before this program) |

Combined highlighted runs: **80/80** then **35/35** additional.

## Database validation

Production still **0085**. Post-apply validation is **pending AA**. Preflight proved wipe is consumer-free.

## Owner-data safety

`600001` not modified. P0 expired access unchanged (`currentPeriodEnd` 2026-08-07). Separate program: `OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`.

## Known residuals

1. Unbound runtime still uses `planFeatureMatrix` until a later bind program.  
2. Checkout price book ≠ catalog price book (by design this program).  
3. Catalog Basic list price is 0.00 USD.  
4. Leftover filenames/UI: `snapshotLoader.ts`, `versionCompare.ts`, `CapabilityLifecycleRail.tsx` (not wired as publish/version actions).  
5. `PlanService.update` remains for in-memory bootstrap; HTTP `updatePlan` now calls `saveLive`.  
6. Migration **not applied**; deploying live-plan code before 0086 remains a hard failure.

---

**STOP.** Await Architecture Authority to authorize production migrate + bootstrap. Do not self-certify deployment.
