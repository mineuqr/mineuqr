# Production Usage Report

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

## Classification summary (feature keys)

| Class | Count | Keys / notes |
|-------|------:|--------------|
| ACTIVE_DEPENDENCY | **12** | qrMenu, search, cart, checkout, requestBill, callWaiter, orderTracking, reports, excelExport, templates, customColors, customFonts |
| TRANSITIONAL | **5** | categories, menuImages, hotelMode, roomQr, dynamicServiceCatalog |
| UNUSED (keys) | **0** | none safe to drop from FEATURE_KEYS |
| UNKNOWN | **0** | |

Total legacy feature keys: **17**.

## Structural usage

| Artifact | Class | Evidence |
|----------|-------|----------|
| expandFeatureKeysForRuntime | ACTIVE | Called by entitlementResolver + snapshotRuntimeAuthority |
| Legacy matrix rows | ACTIVE | capabilityMatrix LEGACY_COMPAT_MATRIX |
| UI gates | ACTIVE / BLOCKED | featureVisibility.ts |
| Catalog locale orphans | UNUSED | Picker uses Projection IDs only |
| LEGACY_DIRECT_PROJECTION_KEYS | UNUSED | Grep: definition only → **removed** |
| LEGACY_PLAN_BRIDGE | ACTIVE | seed + catalogPlanFromSnapshot |

## Safety verification (no removal of ACTIVE)

| Check | Result |
|-------|--------|
| Bound snapshots with legacy strings still expand | Preserved (expand kept) |
| UI branding/reports gates | Preserved |
| deniedFeatures qrMenu/search | Preserved |
| Projection FILTER_KEYS | Unchanged (15) |
| Published offerings Projection-only | Unchanged |
