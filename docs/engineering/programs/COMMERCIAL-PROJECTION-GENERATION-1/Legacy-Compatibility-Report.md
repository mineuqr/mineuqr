# Legacy Compatibility Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1  
**Module:** `shared/commercial-projection/legacyCompat.ts`

## Purpose

Preserve bound Snapshot entitlement resolution and existing UI gates (`templates`, `customColors`, …) without admitting legacy keys into Catalog/Plans/Offerings.

## Layers

| Layer | Contents | Used by |
|-------|----------|---------|
| **Projection** | 15 IDs | Catalog, Plans, Offerings, Runtime |
| **Legacy Compat** | 17 former FEATURE_KEYS (excl. `ordering`) | Runtime FeatureKey map, UI gates |
| **FEATURE_KEYS** | Projection ∪ Legacy Compat | `CommercialFeatures` completeness |

`ordering` remains a Projection ID (direct continuity).

## Alias map (legacy → projection)

| Legacy | Projection |
|--------|------------|
| `cart`, `checkout`, `orderTracking` | `ordering` |
| `requestBill` | `checkManagement` |
| `callWaiter` | `waiter` |
| `reports`, `excelExport` | `reporting` |
| `qrMenu`, `categories`, `menuImages`, `search`, `hotelMode`, `roomQr`, `dynamicServiceCatalog`, `templates`, `customColors`, `customFonts` | **null** (deprecated; Runtime-only if present in snapshot) |

## Compatibility strategy

1. **Snapshot read:** `expandFeatureKeysForRuntime` enables legacy key + mapped Projection ID.  
2. **Catalog write:** aliases normalized to Projection; deprecated-only keys rejected.  
3. **Public offerings:** `normalizeFeatureKeysForProjection` drops deprecated; maps aliases.  
4. **UI gates:** still type against `FeatureKey` including legacy compat keys.

## Removal strategy

| Phase | Action |
|-------|--------|
| Now | Compat layer live; documented |
| Later AA | Domain enforcement on Projection IDs; retire UI gates on deprecated keys |
| Final | Remove `LEGACY_COMPAT_FEATURE_KEYS` after zero snapshot references |

**No automatic data migration of bound snapshots in this program.**
