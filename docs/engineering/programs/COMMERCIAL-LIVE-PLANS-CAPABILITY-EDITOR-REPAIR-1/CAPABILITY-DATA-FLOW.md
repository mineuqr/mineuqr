# CAPABILITY-DATA-FLOW.md

```
Discovery
    ↓
Commercial Projection (COMMERCIAL_PROJECTION_IDS)
    ↓
Presentation overlay (applyCommercialPresentationRules)
    ↓
Plan Editor (CapabilityFilterPicker → capabilityPayload)
    ↓
saveLivePlan API (capabilities[])
    ↓
planService.saveLive
    ↓  applyCommercialPresentationRules
    ↓  FeatureBundleService.replaceIncludedFeatures
    ↓  PlanSaveValidator
    ↓  persistLivePlan (atomic plan + prices + bundle features)
    ↓
Cache invalidation
    (catalog ready gate, public catalog, entitlement cache)
    ↓
Hydration / next read
    ↓
Runtime entitlement (bound → Live Plan keys; unbound → planFeatureMatrix)
```

## What the editor receives

After repair: **flattened Presentation cards** whose toggles write **Projection keys**. Not a parallel capability list. Not the bundle name as commercial authority.

| Surface | Source |
|---------|--------|
| Visible cards | `listCommercialVisiblePresentation()` — 12 cards |
| Persist keys | `COMMERCIAL_PROJECTION_IDS` after presentation rules |
| Public display | `projectFeatureKeysForCommercialDisplay` (hides bundle IDs, printing, realtime, devices, expo, raw settlement children) |

## What is not in the path

- Plan Version
- Snapshot
- Publication / retire
- Bootstrap-as-publication
- A second persistence mechanism beside `saveLive`
