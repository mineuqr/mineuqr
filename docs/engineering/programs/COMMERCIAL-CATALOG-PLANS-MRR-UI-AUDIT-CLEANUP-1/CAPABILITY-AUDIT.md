# CAPABILITY-AUDIT.md

Projection SSOT: `COMMERCIAL_PROJECTION_IDS` (`shared/commercial-projection/schema.ts`).  
Runtime vocabulary: Projection ∪ Legacy Compat.  
Constitution: a Pricing / Plan Editor capability is **not implemented** until `requireFeature` (or approved equivalent) and negative tests exist.

## Classification (production)

| Key | Editor | Pricing | Server enforcement | Class |
|-----|--------|---------|--------------------|-------|
| `ordering` | VISIBLE | VISIBLE | `hasFeature("ordering")` | **CANONICAL** |
| `devices` | HIDDEN (dependency) | omitted | `requireFeature("devices")` | **CANONICAL** |
| `waiter`, `kiosk`, `counterPickup`, `kitchen`, `register`, `reporting` | VISIBLE | if enabled | flags only | **MISSING_ENFORCEMENT** |
| `checkManagement`, `splitPayment`, `multiCheckAllocation`, `refund` | HIDDEN (nested) | via Financial Settlement card | flags only | **MISSING_ENFORCEMENT** |
| `printing`, `realtime` | HIDDEN foundation | omitted | none | **UI_ONLY** / foundation |
| `expo` | HIDDEN | omitted | none | **ORPHANED** commercially |
| Always-on cards: session/menu/design/QR | LOCKED visible | product claims | no Projection ID | **UI_ONLY** |
| Legacy `templates`, `customColors`, `customFonts` | n/a | n/a | **`isSubscriptionActive`** (parallel) | **LEGACY** / **DUPLICATE** |
| Legacy `reports` / `excelExport` | n/a | banners | none | **LEGACY** / **UI_ONLY** |
| `hotelMode`, `roomQr`, `dynamicServiceCatalog` | none | none | none | **ORPHANED** |

Registry (`shared/commercial-capability/registry.ts`): only `ordering` and `devices` are `runtimeEnforced: "full"`.

## Rule

UI capability → entitlement hub → server enforcement.

Most projection keys resolve in the hub but are **not** mutation-gated. That is a known governance residual (CE-04 / CE-15), not invented by this audit.
