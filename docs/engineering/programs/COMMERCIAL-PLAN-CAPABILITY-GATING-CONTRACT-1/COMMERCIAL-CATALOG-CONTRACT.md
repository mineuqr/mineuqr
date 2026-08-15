# COMMERCIAL CATALOG CONTRACT

## Definition

Each of the four keys is a Commercial Projection ID: commercializable, plan-available, persisted on `commercial_feature_bundles` via `commercial_bundle_features.featureKey` + `included`.

## Assignment

`featureBundleService.replaceIncludedFeatures(bundleId, keys)` — already atomic with Live Plan save. Disabled = key omitted. Enabled = row with `included=true`.

## Read / runtime

`plan.featureBundleId` → included keys → `resolveEntitlementsFromLivePlan` / hub `features[key]`. Dynamic from **current** entitled Live Plan. Not snapshotted into Charged Terms.

## Admin API

Existing `commercialCatalog.updatePlan` / live save / bundle replace. No new catalog router. `assertAdminAccess` remains.

`assertCommercialCapabilityFilterKeys` accepts **Projection IDs only**. After the four IDs join `COMMERCIAL_PROJECTION_IDS`, persist works with no second allowlist.

Packaging: catalog-promoted rules (see `ARCHITECTURAL-DECISION.md`). Do not expand the 17 Discovery ELIGIBLE IDs.

## Immediate effect

After catalog persist + entitlement cache invalidation (existing cache scopes), the next `resolveOwnerEntitlements` sees the new map. No financial event.

## Defaults

| Situation | Contract |
|-----------|----------|
| New plan | Implementation must require explicit Admin set, **or** default all four **ON** (document in implementation). Must not silently default OFF without AA. Recommended: default **ON** to match current Always-On product until Admin unchecks. |
| Existing Production plans | Cutover seed **ON** for all four on basic / professional / enterprise bundles. **Not** an invented Basic=OFF matrix. |
| Missing key after cutover | Fail-closed = disabled |
