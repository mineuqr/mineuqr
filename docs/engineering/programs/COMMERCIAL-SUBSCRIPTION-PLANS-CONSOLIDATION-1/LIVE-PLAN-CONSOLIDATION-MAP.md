# LIVE-PLAN-CONSOLIDATION-MAP.md

Existing Live Plan model (`commercial_plans` + related). **No new catalog table.**

```
Live Plan
├── Identity          commercial_plans.id (UUID), code
├── Name              commercial_plans.name
├── Description       commercial_plans.description
├── Capabilities      featureBundle → commercial_bundle_features
├── Limits            limitProfile → commercial_limit_values
├── Offer List Price  commercial_prices (cycle + USD + optional region)
├── Billing cycles    commercial_billing_cycles
├── Trial policy      commercial_trial_policies
└── Catalog metadata  sortOrder, isHidden, timestamps
```

Binding (not Live Plan):

```
commercial_subscription_bindings
├── planId (Live Plan UUID)
├── chargedAmount / chargedCurrency
├── billingCycleId / billingCycleCode
└── legacyPlanId (compatibility handle)
```

## Completeness vs `subscription_plans`

| Needed for sellable catalog | Already on Live Plan? |
|-----------------------------|------------------------|
| Identity | Yes |
| Name / description | Yes |
| Capabilities / limits | Yes |
| Offer price monthly/yearly USD | Yes (`commercial_prices`) |
| Visibility | Yes (`isHidden`) |
| Trial duration | Yes |
| Integer checkout handle | Bridge only (`legacyPlanId`) — not a second catalog |

Nothing valid is missing that would justify keeping `subscription_plans` as catalog authority.

Stripe price ids and leftover quota/feature **columns** are not Live Plan work.

## Public Pricing (verified)

`client/src/pages/Pricing.tsx` uses `commercialCatalog.public.listOfferings`.

- Plan identity: Live Plan `planId` / `planCode`
- Display price: Live Plan `priceMonthly` / `priceYearly`
- Checkout buttons: `legacyPlanId` handle only
- **No hidden `subscription_plans` read on the Pricing page**

After this program, Checkout charges the same Live Plan offer (I-CONSOLIDATION-01).
