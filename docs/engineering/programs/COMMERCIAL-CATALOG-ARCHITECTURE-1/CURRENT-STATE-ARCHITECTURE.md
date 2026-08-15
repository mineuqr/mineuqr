# CURRENT-STATE-ARCHITECTURE.md

```
Live Plan (commercial_plans + bundle + limits + commercial_prices)
        │
        ├─ Plan Editor saveLive ──► catalog / public / entitlement caches
        ├─ Public Pricing listOfferings ──► display USD catalog
        └─ Binding (commercial_subscription_bindings)
                charged terms = catalog price at bind/renewal
                        │
user_subscriptions.planId (30001–30003)
        │
        ├─ Checkout createCheckoutSession / createTapCheckout
        │       amount = subscription_plans.priceMonthly|Yearly
        │
        ├─ MRR CanonicalMetricsService
        │       amount = subscription_plans monthly-equivalent
        │
        └─ Entitlement hub resolveOwnerEntitlements
                bound  → live capabilities + limits
                unbound → Legacy Bridge (planFeatureMatrix / PLAN_LIMITS)
                owner  → FULL_PLATFORM | SIMULATED_PLAN
                        │
                commercialAccountState ACTIVE | FROZEN | NONE
                        │
                Server: requireFeature(ordering, devices)
                        checkLimit(restaurants, categories, items)
                        Frozen verifiedProcedure prefixes
                        isSubscriptionActive (templates / colors / fonts)
                UI: hasFeature (presentation)
```

## Contradictions (proven)

1. **GAP A.** Pricing displays Live Plan catalog (e.g. Professional 26.40 USD). Checkout charges `subscription_plans` (39.00 USD).
2. **GAP B.** MRR uses `subscription_plans`, not charged terms. No constitution.
3. **GAP C.** Most Plan capabilities are flags_only.
4. **GAP D.** `isSubscriptionActive` is period-valid trial/active **row liveness**, plus `role === admin` skip — not the entitlement hub.
5. **GAP E.** Limits persist and enforce on create; Pricing does not display them.

These are authority problems, not cosmetic UI bugs.
