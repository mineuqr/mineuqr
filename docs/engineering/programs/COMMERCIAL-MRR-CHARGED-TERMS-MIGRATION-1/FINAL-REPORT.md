# FINAL-REPORT

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1  
**Date:** 2026-08-15

## A. STATUS

**MRR MIGRATION — COMPLETE**

## B. CURRENT SOURCE (previous)

`CanonicalMetricsService.computeMrrFromStates` summed `subscription_plans.priceMonthly` / `priceYearly` via `getSubscriptionPlans` / `getSubscriptionPlanById` and `monthlyEquivalentPlanPrice`.

That path was **non-compliant** with ADR-ARCH-036.

## C. NEW SOURCE

```
Qualifying owner (countsInMrr)
        ↓
commercial_subscription_bindings Charged Terms
        ↓
monthly-equivalent (monthly = amount; yearly = amount / 12)
        ↓
MRR
```

Implementation: `server/commercial/metrics/chargedTermsMrr.ts` + `CanonicalMetricsService.computeMrrFromStates`.

Missing Charged Terms: **0** (`INCOMPLETE_CHARGED_TERMS`). No catalog or legacy-price fallback.

## D. ELIGIBILITY

Reuse hub `countsInMrr`. No second eligibility system.

**Include:** BASIC / PROFESSIONAL / ENTERPRISE with `countsInMrr === true`, a `subscriptionId`, and positive USD Charged Terms.

**Exclude (hub already false):** TRIAL, FROZEN, NONE, PLATFORM_OWNER / ADMIN, FULL_PLATFORM, SIMULATED_PLAN, cancelled, expired.

**Zero / complimentary:** amount `<= 0` → `ZERO_VALUE` → 0.

## E. MONTHLY NORMALIZATION

| Cycle | MRR |
|-------|-----|
| monthly | `chargedAmount` |
| yearly | `chargedAmount / 12` |
| other / missing | 0 (`UNSUPPORTED_BILLING_CYCLE`) |

Example: $120 / year → **$10**.

## F. LEGACY DEPENDENCY

Does canonical MRR still read `subscription_plans`? **NO.**

## G. CATALOG INDEPENDENCE

Does canonical MRR read current Live Plan price? **NO.**

Catalog $45 vs Charged Terms $35 → MRR **$35**.  
Catalog $30 vs Charged Terms $35 → MRR **$35**.

## H. REVENUE SEPARATION

Check Revenue remains `SUM(Paid Check.grandTotal)`. Reporting / settlement / Order Sales were not modified.

## I. TEST RESULTS

Executed:

```
pnpm exec vitest run
  server/commercial/metrics/__tests__/canonicalMrrChargedTerms.guards.test.ts
  server/commercial/metrics/CanonicalMetricsService.test.ts
  server/commercial/metrics/chargedTermsMrr.test.ts
  server/commercial/exec3DashboardApi.test.ts
  server/commercial/adminAuth1c.test.ts
  server/commercial/exec7c2CommercialOverview.test.ts
  server/commercial/reporting/CommercialReportService.test.ts
  server/commercial/reporting/analyticsAlignment.test.ts
  server/commercial-catalog/__tests__/commercialCatalogAdoption.guards.test.ts
```

**Test Files  9 passed (9)**  
**Tests  61 passed (61)**  
**exit_code: 0**

Architecture guard proves CMS and the Charged Terms loader do not read `subscription_plans` price or Live Plan catalog price.

## J. BUILD

```
pnpm build
```

**exit_code: 0**  
vite production build succeeded (4019 modules). esbuild wrote `dist/index.js` and `dist/vercel-api.mjs`.

## K. REMAINING `subscription_plans` DEPENDENCIES

Canonical MRR no longer depends on the table. Residuals remain:

- Legacy integer identity (`user_subscriptions.planId`, CRS `planId`, `LEGACY_PLAN_BRIDGE`)
- Unbound display name (`CommercialReadService` → `getSubscriptionPlanById`)
- Webhooks (`paypal-webhook.ts`, `tap-webhook.ts`)
- Admin invoice / notification plan reads in `routers.ts`
- Trial legacy resolve comments / fallbacks
- Deprecated `getAdminStatistics` / `getRevenueByMonth` / `computeAdminMrr`
- `subscriptionPlanLimits.ts`
- ORM schema, seeds, reset scripts, leftover tests

## L. SAFE DELETE

**Can `subscription_plans` be deleted now?** **NO.**

MRR dependency removed: **YES**.  
Remaining dependencies have not independently disappeared.  
No DROP TABLE. SAFE DELETE remains a future gated program.

## M. ADR IMPACT

| ADR | Action |
|-----|--------|
| 034 | No amendment. Catalog authority unchanged. |
| 035 | No amendment. Charged Terms write policy unchanged. |
| 036 | **Implementation aligned.** No automatic amend. Header still says “Governance only” (registration-era text). |

## N. GIT

| Item | Value |
|------|-------|
| HEAD | `1330c8e4f9fe257a7adc3a98326343a4c0f903fe` — `feat(commercial): consolidate checkout on live plans` |
| Branch | `main` tracking `origin/main` |
| Modified | `CanonicalMetricsService.ts`, `CanonicalMetricsService.test.ts`, `exec3DashboardApi.test.ts`, `adminAuth1c.test.ts` |
| Untracked | `docs/engineering/programs/COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1/`, `chargedTermsMrr.ts`, `chargedTermsMrr.test.ts`, `server/commercial/metrics/__tests__/` |
| Commit | **None** (this program) |
| Push | **None** |
| Deploy | **None** |

## STOP

Do not automatically start Checkout, Payment Provider, Tax, FX, Refund, Credit Note, POS, Staff Access, Inventory, or SAFE DELETE.
