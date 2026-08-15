# TEST-PLAN

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

## Unit — `CanonicalMetricsService.test.ts`

| # | Case | Expected |
|---|------|----------|
| 1 | ACTIVE monthly | Charged Terms monthly amount |
| 2 | ACTIVE annual | Charged Terms / 12 |
| 3 | Trial | 0; Charged Terms not loaded |
| 4 | Frozen (`countsInMrr` false) | 0 |
| 5 | NONE | 0 |
| 6 | PLATFORM_OWNER / ADMIN | 0 |
| 7 | FULL_PLATFORM | 0 |
| 8 | SIMULATED_PLAN | 0 |
| 9–10 | Complimentary / zero-value | 0 |
| 11 | Cancelled | 0 |
| 12 | Expired | 0 |
| 13 | Multiple qualifying | Sum |
| 14 / 20 | Monthly + annual | Independent normalization |
| 15 | Catalog $45 vs Charged Terms $35 | $35 |
| 16 | Catalog $30 vs Charged Terms $35 | $35 |
| 17 | $120 / year | $10 |
| 18 | No Charged Terms | 0 — no fallback |
| 19 | Legacy `subscription_plans.price` $79 vs Charged Terms $35 | $35 |

## Pure rules — `chargedTermsMrr.test.ts`

Cycle normalization, USD-only, incomplete / zero / unsupported cycle, mixed-owner sum.

## Architecture guard — `canonicalMrrChargedTerms.guards.test.ts`

Fails if CMS or `chargedTermsMrr.ts` reintroduce:

- `getSubscriptionPlans` / `getSubscriptionPlanById`
- `priceMonthly` / `priceYearly` / `subscription_plans`
- `planService` / `resolveLivePlanCapabilities` / `currentPriceForPlan`

## Integration / reporting regression

| Suite | Assertion after cutover |
|-------|-------------------------|
| `exec3DashboardApi.test.ts` | `getDashboardSummary.mrr === 0` without bindings (was 79 from catalog) |
| `adminAuth1c.test.ts` | Overview `executive.mrr === 0` without bindings |
| `exec7c2CommercialOverview.test.ts` | Snapshot MRR still equals `analytics.getMRR` |
| `CommercialReportService.test.ts` | Export copies overview MRR |
| `analyticsAlignment.test.ts` | Analytics MRR equals snapshot MRR |

No presentation semantic change. Absolute 79 expectations were catalog-price assertions and are updated to 0 (no Charged Terms in those fixtures).
