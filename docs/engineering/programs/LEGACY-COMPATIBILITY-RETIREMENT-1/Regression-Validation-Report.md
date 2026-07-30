# Regression Validation Report

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

## Expected invariants

| Invariant | Status |
|-----------|--------|
| Discovery ELIGIBLE input unchanged | Pass |
| Commercial Projection IDs (15) unchanged | Pass (guard) |
| Plans FILTER_KEYS = Projection only | Pass |
| Published offerings normalize to Projection | Pass (prior adoption) |
| Runtime still expands legacy snapshot keys | Pass (expand kept) |
| UI gates still resolve legacy FeatureKeys | Pass (not migrated) |

## Test suites

| Suite | Role |
|-------|------|
| `legacyCompatibilityRetirement.guards.test.ts` | Classification + unused removal |
| `commercialProjectionGeneration.guards.test.ts` | Projection SSOT still valid |
| Runtime entitlement / operational validation | Snapshot + Catalog continuity |

## Residual risk

Without a live production DB scan of `includedFeatures.featureKey` values, snapshot residual volume is **UNKNOWN at data plane** — code path remains defensive via expand. Recommended AA follow-up: production snapshot key histogram before any RETIRE_LATER execution.
