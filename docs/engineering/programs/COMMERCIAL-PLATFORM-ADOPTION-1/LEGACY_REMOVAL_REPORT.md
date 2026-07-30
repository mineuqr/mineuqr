# LEGACY_REMOVAL_REPORT.md — COMMERCIAL-PLATFORM-ADOPTION-1

## Removed from UI (no remaining client callers)

| Legacy path | Former consumers | Replacement |
|-------------|------------------|-------------|
| `subscription.listPlans` | `Pricing.tsx`, `CustomerSuccessAccountsSection.tsx` | `commercialCatalog.public.listOfferings` / `listPublishedOfferings` |
| `commercialCatalog.publishVersion.useMutation` (foundation) | Catalog panels, wizard, bulk, diff | `useCatalogPublishingMutations` → `publishing.*` |
| `commercialCatalog.deprecateVersion.useMutation` / `retireVersion.useMutation` | Same | `publishing.deprecateVersion` / `publishing.retireVersion` |
| Hardcoded Pricing feature JSON (`plan.features` / `featuresAr`) | Pricing bullets | Catalog `featureKeys` + `resolveCatalogLabel` |

## Not removed (intentional residuals)

| Path | Reason |
|------|--------|
| Server `subscription.listPlans` | Payment/checkout activation bridge; billing out of scope; payment tests still call it |
| `src/lib/commercial/planFeatureMatrix.ts` | Server unbound-subscription Legacy Bridge only; **no client imports** |
| `planIdMapping.ts` | Compat for numeric plan id → catalog key; Pricing now prefers plan code |
| `entitlementsDisplay.ts` labels | i18n display for Runtime plan enums — not a plan matrix |
| Foundation `commercialCatalog.publishVersion` procedure | Server compat for non-UI / scripts; UI no longer calls it |

## Dead code

No obsolete client commercial services deleted beyond call-site removal. No duplicated entitlement/lifecycle decision engines found in UI beyond display helpers over Runtime DTOs.
