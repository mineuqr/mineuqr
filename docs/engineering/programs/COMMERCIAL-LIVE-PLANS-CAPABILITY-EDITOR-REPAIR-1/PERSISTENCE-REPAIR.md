# PERSISTENCE-REPAIR.md

Canonical path:

```
Edit → Validate → saveLive → atomic persist → cache invalidation
```

No publish, version update, snapshot, or second write path.

## saveLive

`options.capabilities?: { featureKey, included? }[]`

1. Map included flags.
2. `applyCommercialPresentationRules` (foundation, settlement-with-ordering, devices-from-channels).
3. Filter to `COMMERCIAL_PROJECTION_IDS`.
4. `replaceIncludedFeatures(bundleId, included)` or create `{code}-features` if the plan has no bundle.
5. Validate (`PlanSaveValidator`).
6. `persistLivePlan`.
7. Invalidate catalog-ready gate, public catalog cache, entitlement cache.
8. On validation or persist failure: restore plans, prices, **bundles, and bundleFeatures**.

## replaceIncludedFeatures

Delete all `commercial_bundle_features` rows for that `bundleId`, then insert the new included Projection keys. Unknown keys fail closed (`invalid_capability_filter`).

## Durable persist

`DbDurableLivePlanBackend.persistLivePlan` (single transaction):

1. Upsert `commercial_plans`
2. Replace `commercial_prices` for that plan
3. Upsert the plan’s feature bundle
4. **DELETE + INSERT** `commercial_bundle_features` for that `bundleId`

In-memory durable backend now **replaces** features for the plan’s bundle (does not merge leftovers).

## Atomicity

Test: validation failure after a capability patch rolls back Professional keys to the previous set. Either all capability changes persist or none do.

## API

`commercialCatalog.saveLivePlan` accepts optional `capabilities`. `updatePlan` remains `saveLive` without a capabilities array (metadata-only). The Plan Editor always sends `capabilities: capabilityPayload`.
