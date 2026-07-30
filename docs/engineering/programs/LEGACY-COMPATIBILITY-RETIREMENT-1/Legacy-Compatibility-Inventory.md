# Legacy Compatibility Inventory

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1  
**Code SSOT:** `shared/commercial-projection/legacyRetirement.ts`

## A. Per-key Runtime entitlement compat (17)

| Key | Maps to Projection | Primary consumers |
|-----|--------------------|-------------------|
| `qrMenu` | — | deniedFeatures default |
| `categories` | — | unbound matrix |
| `menuImages` | — | unbound matrix |
| `search` | — | deniedFeatures default |
| `cart` | `ordering` | snapshot expand |
| `checkout` | `ordering` | snapshot expand |
| `requestBill` | `checkManagement` | snapshot expand |
| `callWaiter` | `waiter` | snapshot expand |
| `orderTracking` | `ordering` | snapshot expand |
| `reports` | `reporting` | UI gates + expand |
| `excelExport` | `reporting` | UI gates + expand |
| `hotelMode` | — | unbound matrix / tests |
| `roomQr` | — | unbound matrix |
| `dynamicServiceCatalog` | — | unbound matrix |
| `templates` | — | UI gates |
| `customColors` | — | UI gates |
| `customFonts` | — | UI gates |

Source: `LEGACY_COMPAT_FEATURE_KEYS` + `LEGACY_TO_PROJECTION`.

## B. Structural mechanisms

| ID | Artifact | Path |
|----|----------|------|
| LEGACY-KEYS-LIST | `LEGACY_COMPAT_FEATURE_KEYS` | `legacyCompat.ts` |
| LEGACY-ALIAS-MAP | `LEGACY_TO_PROJECTION` / normalize | `legacyCompat.ts` |
| RUNTIME-EXPAND | `expandFeatureKeysForRuntime` | `commercial-projection/index.ts` |
| MATRIX-LEGACY-ROWS | `cap.legacy.*` | `capabilityMatrix.ts` |
| UNBOUND-MATRIX | `planFeatureMatrix` legacyExtras | `planFeatureMatrix.ts` |
| UI-GATES-LEGACY-KEYS | `featureVisibility` | `featureVisibility.ts` |
| UI-LABELS-LEGACY | `LEGACY_LABELS` | `entitlementsDisplay.ts` |
| CATALOG-LOCALE-ORPHANS | i18n old feature keys | `en.json` / `ar.json` |
| LEGACY-PLAN-BRIDGE | plan id bridge | `legacyPlanBridge.ts` |
| LEGACY-DIRECT-PROJECTION-KEYS | dead constant | **REMOVED** |

## C. Related (out of FEATURE_KEYS plane; inventoried)

| Artifact | Notes |
|----------|-------|
| `LEGACY_COMMERCIAL_SOURCES_SUPERSEDED` | Already-superseded SSOT list — not Runtime feature keys |
| `LEGACY_RUNTIME_ALLOWED_TO_REMAIN` | Catalog adoption allow-list |
| Admin `ADMIN_LEGACY_ROUTES` | Nav redirects — not commercial entitlement compat |
