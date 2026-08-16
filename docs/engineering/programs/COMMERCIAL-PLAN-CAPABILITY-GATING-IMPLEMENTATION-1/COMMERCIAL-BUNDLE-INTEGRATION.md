# COMMERCIAL BUNDLE INTEGRATION

Persistence is unchanged: `commercial_bundle_features` (`bundleId`, `featureKey`, `included`).

- Enabled = row with `included=true`
- Disabled = key absent (fail-closed)
- `assertCommercialCapabilityFilterKeys` accepts the four keys because they are Projection IDs
- `replaceIncludedFeatures` remains the Admin write path

Unrelated Projection keys are unchanged.
