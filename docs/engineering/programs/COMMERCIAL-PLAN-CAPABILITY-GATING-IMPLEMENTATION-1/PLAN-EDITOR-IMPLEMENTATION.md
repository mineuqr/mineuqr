# PLAN EDITOR IMPLEMENTATION

The four cards are no longer Always-On:

- `alwaysEnabled: false`
- `projectionKeys: [<canonical>]`
- `setPresentationCapabilityEnabled` writes the Projection key
- `projectFeatureKeysForCommercialDisplay` includes a key only if it is in the bundle set
- New feature-bundle picker defaults the four keys ON (preservation, not a Basic=OFF matrix)

Admin save still goes through `saveLive` → `replaceIncludedFeatures` → existing `commercial_catalog_updated` audit.
