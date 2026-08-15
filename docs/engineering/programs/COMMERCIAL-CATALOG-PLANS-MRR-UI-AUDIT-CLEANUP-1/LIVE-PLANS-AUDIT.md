# LIVE-PLANS-AUDIT.md

A Live Plan is:

```
Live Plan
  ├── Capabilities  (bundle → commercial_bundle_features)
  ├── Limits        (profile → commercial_limit_values)
  └── Prices        (commercial_prices + billing cycles + optional region)
```

No Plan Versions, Draft, Publish, Retire, or Snapshot tables remain in the current schema (dropped in 0086). Runtime still uses the filename `snapshotLoader.ts` to load the **bound live plan**.

## Composition path

```
commercial_plans
  → featureBundleId → commercial_bundle_features
  → limitProfileId  → commercial_limit_values
  → prices by planId + billingCycleId [+ regionId]
  → trialPolicyId (Professional only in bootstrap)
```

`saveLive` atomically writes plan + prices + capabilities + limits, then invalidates catalog / public / entitlement caches (COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1).

## Binding

`commercial_subscription_bindings` maps `user_subscriptions.id` → live `planId` + charged terms captured at bind/renewal.

Unbound subscriptions fall through Legacy Bridge (`planFeatureMatrix` / `PLAN_LIMITS`). That is a documented compatibility path, not Live Plan customer SSOT.
