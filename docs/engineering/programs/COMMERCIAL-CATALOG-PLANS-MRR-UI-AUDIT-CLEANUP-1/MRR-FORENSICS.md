# MRR-FORENSICS.md

## Implementations

| ID | Function | Price source | Inclusion | Status |
|----|----------|--------------|-----------|--------|
| A | `CanonicalMetricsService.computeMrrFromStates` | `getSubscriptionPlans()` / `subscription_plans` | `countsInMrr && planId` | **Declared canonical admin path** |
| B | `computeAdminMrr` | same table | `status === "active"` only | **LEGACY** (deprecated statistics) |
| Shared | `monthlyEquivalentPlanPrice` | yearly = `priceYearly / 12` | — | Shared helper |

APIs: `analytics.getMRR`, dashboard summary, Commercial overview, StatisticsPanel, report CSV.

Neither path uses `commercial_subscription_bindings.chargedAmount` or Live Plan `commercial_prices`.

## Answers (evidence)

1. Calculated in `CanonicalMetricsService` (+ legacy `computeAdminMrr`).
2. Tables: owner commercial states + `subscription_plans`.
3. Price source: **legacy plan list prices**, not charged terms.
4. Monthly: `priceMonthly` of `subscription_plans`.
5. Yearly: `priceYearly / 12`.
6. Current catalog price is **not** used for MRR (legacy book is). Existing customers are **not** re-priced from catalog for MRR.
7. Historical charged terms are preserved on bindings; **MRR ignores them**.
8. Renewal re-binds catalog price; MRR still uses `subscription_plans` until that table changes.
9. Expired → typically `countsInMrr: false` (plan NONE / entitlements off).
10. FROZEN → `countsInMrr: false`.
11. Trial → `countsInMrr: false`.
12. Complimentary: no distinct MRR policy found beyond plan flags.
13. Refunded/voided/cancelled: legacy helper excludes non-`active`; canonical uses `countsInMrr` not invoice state. **Incomplete**.
14. Owner FULL_PLATFORM: `countsInMrr: false`.
15. Owner SIMULATED_PLAN: owner entitlements, `countsInMrr: false`.
16. Internal/test: `commercialPopulation` excludes INTERNAL from KPI population (security audit).
17. UI: Admin KPIs, Commercial overview, StatisticsPanel.
18. Reporting: `CommercialReportService` copies snapshot MRR/ARR.
19. **Two implementations** (A canonical, B legacy). Same price table.

## GOVERNANCE GAP

There is **no MRR constitution**. I-CATALOG-13 (one canonical calculation authority) is **not fully satisfied**: charged terms vs `subscription_plans` vs catalog are unresolved. This program does **not** invent policy.
