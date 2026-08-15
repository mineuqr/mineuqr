# LEGACY-BOUNDARY.md

## `subscription_plans`

**Do not delete.**

| Question | Decision |
|----------|----------|
| Why it exists | Checkout (PayPal/Tap), activation `planId`, current MRR, some DTOs |
| What it still owns (current) | Charge amount, yearly/monthly legacy prices, `maxRestaurants` column |
| What it must no longer own (target) | Catalog composition, Live Plan limits, public list price, entitlements, **MRR** |
| Consumers | `createCheckoutSession`, `createTapCheckout`, `CanonicalMetricsService`, `computeAdminMrr`, `listPlans` fallback, Subscription UI DTO |
| Layer type | **LEGACY COMPATIBILITY** charge/DTO layer — not catalog SSOT |
| Future target | Checkout reads Live Plan Offer; MRR reads charged terms; table remains as bridge IDs 30001–30003 until a dedicated cutover |
| Prerequisites | ADR-035 Accepted; currency/cutover design; dual-write; tests; no production wipe |
| Risks | Customers charged a different amount than Pricing; MRR ≠ contracted terms; seed-plans.mjs can destroy the table |

## Checkout target (not implemented)

```
Live Plan → Offer (plan + cycle + currency) → Checkout → Subscription → Charged Terms
```

Checkout should eventually charge the Offer (Live Plan list price). Not a versioned snapshot table (retired). Not a new monetary aggregate.

## `isSubscriptionActive`

See [IS-SUBSCRIPTION-ACTIVE-FORENSICS.md](./IS-SUBSCRIPTION-ACTIVE-FORENSICS.md). Coarse **subscription liveness**, not entitlement hub. Do not delete; do not mass-replace.
