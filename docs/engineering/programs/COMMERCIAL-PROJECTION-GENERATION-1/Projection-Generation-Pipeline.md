# Projection Generation Pipeline

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Pipeline stages

```
1. Discovery ELIGIBLE input
   shared/capability-discovery/commercialEligible.ts
        ↓
2. Packaging policy
   shared/commercial-projection/packaging.ts
   (1:1 + bundles register / devices)
        ↓
3. generateCommercialProjectionRegistry()
        ↓
4. COMMERCIAL_PROJECTION_REGISTRY (generated constant)
        ↓
5. Commercial Filter Registry projection
   shared/commercial-capability/registry.ts
   (COMMERCIAL_CAPABILITY_FILTER_KEYS / _REGISTRY)
```

## Generation rules

| Rule | Behavior |
|------|----------|
| Orphan Detection | Throws if ELIGIBLE CAP has no packaging rule |
| Invalid Reference | Throws if packaging cites non-ELIGIBLE CAP |
| Deterministic | Same input → same registry order/content |
| No FEATURE_KEYS | Packaging rules never read legacy lists |

## Regeneration

Re-run is compile-time: importing `@shared/commercial-projection` executes `generateCommercialProjectionRegistry()`. Guards assert regeneration equals exported registry.
