# DUPLICATE-AUTHORITY-AUDIT.md

| Concern | Canonical | Other | Class of other |
|---------|-----------|-------|----------------|
| Entitlements (bound) | `resolveOwnerEntitlements` → live plan | Legacy Bridge if unbound | LEGACY_COMPATIBILITY |
| Capabilities | Live bundle + hub | `planFeatureMatrix` unbound | LEGACY_COMPATIBILITY |
| Limits (bound create) | `checkLimit` + `commercial_limit_values` | `PLAN_LIMITS`, `maxRestaurants` | Isolated LEGACY |
| Prices (display) | `commercial_prices` | — | CANONICAL |
| Prices (checkout) | — | `subscription_plans` | LEGACY_COMPATIBILITY |
| Prices (MRR) | **undefined policy** | `subscription_plans` in CanonicalMetricsService | DUPLICATE vs charged terms |
| Plan identity | `commercial_plans` + binding | `user_subscriptions.planId` | LEGACY_COMPATIBILITY |
| Account state | `deriveCommercialAccountState` | — | CANONICAL |
| Trial | Catalog trial policy + lifecycle | hardcoded 14 in older docs | CANONICAL is policy row |
| Frozen | Account state + verifiedProcedure | — | CANONICAL |
| Templates/colors/fonts | should be hub | `isSubscriptionActive` | **DUPLICATE** |
| Restaurant quota | hub `checkLimit` | (removed admin skip / PLAN_LIMITS path) | CANONICAL after LIMITS-REPAIR-1 |

Bound Live Plan customer runtime must not silently use PLAN_LIMITS or maxRestaurants. Unbound remains Legacy Bridge.
