# CURRENT-MRR-FORENSICS

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1  
**As of:** 2026-08-15 (pre-cutover repository state)

## Canonical calculator

`CanonicalMetricsService.computeMrrFromStates` in `server/commercial/metrics/CanonicalMetricsService.ts`.

### Pre-cutover algorithm (NON-COMPLIANT with ADR-ARCH-036)

1. Load all owner states from CRS (`commercialReadService.getAllOwnerCommercialStates`).
2. Eligibility: `state.commercialStatus.countsInMrr && state.planId != null`.
3. Price: `getSubscriptionPlans()` then `getSubscriptionPlanById(state.planId)`.
4. Monthly equivalent: `monthlyEquivalentPlanPrice` in `server/adminKpiCalculations.ts`:
   - `billingCycle === "yearly"` → `priceYearly / 12`
   - else → `priceMonthly`
5. Sum, round to 2 decimals.

`planId` was the **legacy integer** (`subscription_plans.id`), not the Live Plan UUID.

### Pre-cutover sources (forbidden after this program)

| Input | Source | Allowed for MRR? |
|-------|--------|------------------|
| Eligibility | Hub `countsInMrr` | Yes — reuse |
| Plan identity | `OwnerCommercialState.planId` (legacy) | Identity only; not a price |
| Recurring value | `subscription_plans.priceMonthly` / `priceYearly` | **No** |
| Billing cycle | `OwnerCommercialState.billingCycle` | Subscription lifecycle field |
| Live Plan list price | Not read by CMS (but catalog could diverge) | **No** |
| Checkout / provider / FX | Not read | **No** |
| Check / Order | Not read | **No** |

## Callers of `computeMrrFromStates`

All private; reached only through `CanonicalMetricsService`:

| Method | Consumer |
|--------|----------|
| `getMRR` | `analytics.getMRR` (`server/commercial/analyticsRouter.ts`) |
| `getARR` | `analytics.getARR` — `mrr * 12` |
| `getCommercialOverviewSnapshot` | `admin.getCommercialOverview` — `executive.mrr` / `executive.arr` |
| `getDashboardSummary` | `admin.getDashboardSummary` — `mrr` / `arr` |

ARR is **not** an independent source. It is `MRR × 12`.

## Presentation / export consumers

| Surface | Path | Semantics |
|---------|------|-----------|
| Admin dashboard summary | `admin.getDashboardSummary.mrr` | Same metric |
| Commercial overview | `executive.mrr` | Same metric |
| Analytics | `analytics.getMRR` / `getARR` | Same metric |
| Reporting CSV / Excel | `CommercialReportService` copies overview `executive.mrr` | Same metric |
| Statistics / KPI cards | Wired to analytics / dashboard summary in prior EXEC programs | Same metric |

Presentation labels were not changed in this program.

## Residual non-canonical “MRR”

`getAdminStatistics` / `computeAdminMrr` still sum `subscription_plans` for **deprecated** admin statistics (`totalRevenue`). That path is **not** `computeMrrFromStates` and is **not** the canonical MRR. Documented as a remaining legacy dependency. Not rewritten here.

## Annual plans

Yes. Catalog and Charged Terms both represent `monthly` and `yearly`. Pre-cutover yearly used `subscription_plans.priceYearly / 12`.

## Zero / complimentary / owner / frozen

Pre-cutover exclusion was **only** `countsInMrr` (plus `planId != null`). Hub already sets `countsInMrr: false` for TRIAL, NONE, ADMIN, FULL_PLATFORM, SIMULATED_PLAN, and for FROZEN/cancelled/expired (entitlements disabled → plan NONE). Zero-value catalog prices would have contributed 0 via `parseFloat`. Complimentary is not a separate plan code.
