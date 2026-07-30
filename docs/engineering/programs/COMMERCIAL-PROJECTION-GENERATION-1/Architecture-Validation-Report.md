# Architecture Validation Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Checklist

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Every Projection from Discovery | Pass | packaging orphan/invalid guards + tests |
| No orphan projections | Pass | generate throws if ELIGIBLE uncovered |
| Catalog uses Projection | Pass | FILTER_KEYS = PROJECTION_IDS; bundle normalize |
| Plans use Projection | Pass | seed + wizard picker |
| Offerings use Projection | Pass | public read normalize |
| Runtime resolves Projection | Pass | matrix + expandFeatureKeysForRuntime |
| Legacy FEATURE_KEYS not SSOT | Pass | Compat module only |
| Backward compatible subscriptions | Pass | expand aliases; ordering continuity |
| Discovery not redesigned | Pass | docs untouched; machine ELIGIBLE input only |
| Catalog/Plan/Runtime not redesigned | Pass | wiring/adoption only |

## Test evidence

- `shared/commercial-projection/__tests__/commercialProjectionGeneration.guards.test.ts`  
- `shared/commercial-capability/__tests__/commercialCapabilityPlatformAdoption.guards.test.ts`  
- `server/commercial-catalog/__tests__/commercialCapabilityOperationalValidation.test.ts`  
- Runtime entitlement + planFeatureMatrix suites  

## Residual (accepted)

- Domain `hasFeature` adoption for new Projection IDs beyond `ordering` remains flags_only (separate enforcement adoption programs).  
- Legacy Compat retirement deferred.
