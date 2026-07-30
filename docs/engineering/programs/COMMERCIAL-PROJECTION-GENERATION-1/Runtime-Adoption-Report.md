# Runtime Adoption Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Changes (no algorithm redesign)

| Surface | Adoption |
|---------|----------|
| `capabilityMatrix` | Projection `cap.*` rows + legacy compat rows |
| `entitlementResolver.featuresFromSnapshot` | `expandFeatureKeysForRuntime` |
| `snapshotRuntimeAuthority.featuresFromSnapshot` | same |
| `FEATURE_KEYS` / `FeatureKey` | Runtime vocabulary = Projection ∪ Compat |
| `hasFeature("ordering")` | Unchanged call site; Projection ID |

## Enforcement path

```
Snapshot featureKey strings
        ↓ expandFeatureKeysForRuntime
CommercialFeatures[Projection|Compat]
        ↓ hasFeature / requireFeature
Domain gates (ordering full; others flags_only residual)
```

Runtime **resolves Projection IDs**. Legacy FEATURE_KEYS are not an independent commercial authority — only Compat aliases for continuity.

## I-SRE invariants

- I-SRE-01: Runtime remains exclusive entitlement authority.  
- I-SRE-02: Matrix completeness vs Runtime FeatureKey vocabulary (Projection + Compat).  
- I-CPP-01: Published Catalog still not authz input.
