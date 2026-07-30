# Compatibility Removal Report

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

## Removed (UNUSED / SAFE)

| Artifact | Change |
|----------|--------|
| `LEGACY_DIRECT_PROJECTION_KEYS` | Deleted from `legacyCompat.ts` |
| Dead `void LEGACY_COMPAT_FEATURE_KEYS` import usage | Cleaned in `entitlementsDisplay.ts` |

## Explicitly NOT removed

| Artifact | Why |
|----------|-----|
| All 17 `LEGACY_COMPAT_FEATURE_KEYS` | ACTIVE or TRANSITIONAL consumers |
| `expandFeatureKeysForRuntime` | Snapshot assemblers |
| Legacy capability matrix rows | Runtime completeness |
| `featureVisibility` legacy keys | Production UI |
| `LEGACY_PLAN_BRIDGE` | Plan identity continuity |
| Catalog i18n orphan keys | Harmless UNUSED; deferred locale sweep |

## Added (classification only)

| Artifact | Purpose |
|----------|---------|
| `legacyRetirement.ts` | Evidence-based classification SSOT |
| Retirement guards test | Prevent silent drift / incomplete classification |

## Behavior

**No intentional production behavior change.** Commercial Projection remains sole Commercial Registry for Plans/Catalog/Offerings.
