# IMPLEMENTATION — COMMERCIAL-CATALOG-PRODUCTION-POLISH-1

**Date:** 2026-07-29  
**Status:** Implemented (pending Architecture Authority review)

---

## P0 — Canonical currency (USD only)

| Change | Path |
|--------|------|
| createPrice rejects non-USD unless `regionId` set | `server/api/commercialCatalog/commercialCatalogRouter.ts` |
| Manage Prices defaults / locks USD for canonical | `CatalogManagementPanels.tsx` |
| Wizard writes both cycles as USD + `regionId: null` | `PlanCreationWizard.tsx` |
| Regions default US / USD (not SA/SAR) | `CatalogManagementPanels.tsx` |
| Adoption seed: USD canonical + SAR regional override | `seedAdoptionCatalog.ts` |
| Adoption offering fallback currency → USD | `adoptionService.ts` |

## P1 / P8 — Monthly + Yearly

| Change | Path |
|--------|------|
| Wizard dual amount fields + cycle ensure/reuse | `PlanCreationWizard.tsx` |
| Public toggle without reload | `client/src/pages/Pricing.tsx` |
| Admin preview cycle toggle | `AdminLocalizedPricePreview.tsx` |
| Dynamic savings % | `catalogCommercialDisplay.ts` → `yearlySavingsPercent` |

## P2 / P7 — Dual price + public cards

| Change | Path |
|--------|------|
| `CommercialDualPrice` on public pricing | `Pricing.tsx` |
| Popular badge, savings, responsive cards | `Pricing.tsx` + `polish.*` locales |

## P3 / P5 — Feature & limit localization

| Change | Path |
|--------|------|
| Display helpers | `catalogCommercialDisplay.ts` |
| Locale entries (`name`, `description`, `tooltip`, `category`, `keywords`) | `en.json` / `ar.json` |
| Manage + Experience + Wizard labels | panels / wizard / experience |

## P4 — Regional policy UX

| Change | Path |
|--------|------|
| Searchable country selector (flag / ISO / currency) | `CatalogCountrySelect.tsx` |
| Currency autofill read-only | regions + wizard regional step |

## P6 — Commercial summary review

| Change | Path |
|--------|------|
| Plan / billing / USD / region / local / Ready | `PlanCreationWizard.tsx` review step |

## P9 / P10 — Localization + visual polish

| Change | Path |
|--------|------|
| `polish.*` spacing/copy keys | locales |
| Composition program marker | `PlatformOpsCommercialCatalogComposition.tsx` |

## P11 — Admin preview

| Change | Path |
|--------|------|
| Monthly/Yearly, USD, local, FX vs override, savings | `AdminLocalizedPricePreview.tsx` |
| Cycle hints from Manage + Experience | panels |

## P12 — Quality gates

| Guard file |
|------------|
| `client/.../__tests__/commercialCatalogProductionPolish.guards.test.ts` |

---

## Prohibited (honored)

- No commits / deployment
- No duplicated plans, prices, or catalogs
- No subscription / payment / entitlement rewrites
- No country-specific catalogs (regional policies only)
