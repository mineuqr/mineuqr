# IMPLEMENTATION — COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1

**Date:** 2026-07-29

---

## Localization implementation summary

| Layer | Location |
|-------|----------|
| Shared presentation SSOT | `shared/commercial-catalog/localization/*` |
| Server country + dual-price API | `server/api/commercialCatalog/commercialCatalogLocalizationRouter.ts` (nested `commercialCatalog.localization.*`) |
| Dual price UI | `client/src/components/commercial/CommercialDualPrice.tsx` |
| Admin multi-market preview | `client/src/components/commercial/AdminLocalizedPricePreview.tsx` |
| Catalog shell i18n | `PlatformOpsCommercialCatalogComposition.tsx` + locale keys |
| Public pricing | `client/src/pages/Pricing.tsx` + SEO via `useMarketingDocumentMeta` |
| USD write gate | `commercialCatalog.createPrice` rejects non-USD without `regionId` |

Locale resources: `client/src/locales/{en,ar}.json` under `admin.platformOps.commercialCatalog.*` (+ `pricing.localizedMeta*`, `pricing.dualCurrencyNote`).

---

## Translation coverage

| Surface | Status |
|---------|--------|
| Experience tabs | i18n keys via `EXPERIENCE_TAB_I18N_KEYS` |
| Manage section nav | i18n keys via `MANAGEMENT_SECTION_I18N_KEYS` |
| Hero / experience live | locale keys |
| Plans + Pricing manage panels | localized titles/actions + USD-only create |
| Pricing / Customer preview hosts | dual-price + admin market preview |
| Public pricing labels / SEO | locale keys |
| Remaining Experience/Manage English literals | Partially remain in deep panels/wizard/toasts — keys exist for primary flows; follow-on sweep recommended for 100% literal elimination |

---

## Country detection

`resolveVisitorCountry` priority: **Manual → CF-IPCountry → GeoIP headers (`x-geo-country` / `x-vercel-ip-country` / `x-appengine-country`) → US**.

Exposed as `commercialCatalog.localization.resolveVisitorContext` (public). Language is never consulted.

---

## FX implementation

`FxService` + `StaticFxProvider` + cache TTL + fallback provider + observability events in `shared/commercial-catalog/localization/fx.ts`. Presentation-only; no Catalog writes.

---

## Regional override

Dual resolver: price row with matching `regionId` for visitor country → `regional_override` (exact, no ≈). Else FX from USD. Else USD fallback.

---

## Dual currency

`CommercialDualPrice` always shows USD slot + local slot + source label (Regional Price / Converted from USD / USD).

---

## Admin preview

`AdminLocalizedPricePreview` for SA / DE / US / JP / GB — read-only. Wired into Manage Pricing + Pricing Preview.

---

## Public pricing

`/pricing` uses visitor country + dual display. Checkout/payment amounts unchanged (legacy subscription plans still charge as before).

---

## RTL / LTR

Catalog composition and public pricing set `dir` from language. Customer dual-price atom is direction-aware (`ms-*` spacing).

---

## SEO

Localized title/description, canonical, OpenGraph locale, `hreflang` ar/en/x-default on `/pricing`.

---

## Observability

`commercialLocalizationObservability` counters + `commercialCatalog.localization.observabilitySnapshot` (admin).

---

## Regression

No pricing row migration. No entitlement/subscription/payment mutations. Catalog SSOT preserved. createPrice write-path enforces USD for canonical rows only.
