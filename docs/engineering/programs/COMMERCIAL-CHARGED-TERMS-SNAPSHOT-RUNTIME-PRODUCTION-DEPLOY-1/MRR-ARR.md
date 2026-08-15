# MRR / ARR

## Authority

`loadChargedTermsForMrr` → `loadCurrentChargedTermsForSubscriptions` only.

`chargedTermsMrr.ts` does not contain `commercialSubscriptionBindings`. Binding `chargedAmount` is not an MRR fallback.

`CanonicalMetricsService` ARR:

```
arr = Math.round(mrr * 12 * 100) / 100
arrMethod: "MRR_X12"
```

Catalog price and `subscription_plans` are not used to recompute historical MRR.

## Production implication

Snapshot rows = 0. Eligible subscriptions without a current snapshot contribute 0. That is fail-closed, not a license to invent history from Binding leftover or the current catalog.

Existing customers are not repriced by this deploy.
