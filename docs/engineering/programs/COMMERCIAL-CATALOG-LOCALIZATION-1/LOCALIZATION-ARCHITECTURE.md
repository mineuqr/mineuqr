# Localization Architecture Summary

**Program:** COMMERCIAL-CATALOG-LOCALIZATION-1  
**Mode:** Architecture Authority  
**Date:** 2026-07-29

---

## 1. Core separation

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (locale / country / RTL / FX display)   │
│  language · dir · number/date/currency format · dual price  │
└────────────────────────────▲────────────────────────────────┘
                             │ reads only
┌────────────────────────────┴────────────────────────────────┐
│  COMMERCIAL CATALOG SSOT (immutable commercial facts)       │
│  Plan · Version · USD prices · cycles · bundles · limits    │
│  Regional policies (eligibility + optional local override)  │
│  Snapshots bind USD commercial facts (+ region context)     │
└─────────────────────────────────────────────────────────────┘
```

**Law LOC-01:** Localization MUST NEVER modify commercial facts.  
**Law LOC-02:** Business logic MUST remain language-independent.  
**Law LOC-03:** No duplicated pricing logic, no duplicated catalog, no country-specific catalog forks.

---

## 2. Canonical commercial currency

| Rule | Statement |
|------|-----------|
| **CUR-01** | Canonical commercial currency is **USD**. |
| **CUR-02** | All plans, pricing rows, subscriptions bindings’ commercial amounts, and snapshots store **USD only**. |
| **CUR-03** | USD is immutable as the financial reference. |
| **CUR-04** | Admin create/edit of price amounts is **USD-only**. Editing “local currency as commercial fact” is prohibited. |

Regional SAR/EUR/JPY amounts (when configured) are **Regional Presentation Overrides** under CC-15 — not alternate canonical price books that replace USD storage.

---

## 3. Dual presentation (mandatory)

Every public pricing surface MUST show:

1. **Canonical USD** (always visible)  
2. **Localized currency** (override or FX-derived)

Visitor MUST never lose visibility of USD.

Admin surfaces that show money MUST show **Canonical USD** plus optional **Localized Preview** (read-only; never writes).

---

## 4. Platform localization resources

| Concern | Owner |
|---------|-------|
| Language (`ar` \| `en` + future) | Existing `LanguageContext` + `client/src/locales/{ar,en}.json` |
| Catalog admin copy | Keys under `admin.platformOps.commercialCatalog.*` (+ experience subtree) |
| Public pricing copy | Existing `pricing.*` (+ catalog-backed copy keys) |
| Direction | `html[dir]` from language; Catalog must not force LTR when locale is RTL on customer surfaces |
| Number / date / currency format | `Intl.*` via shared formatters keyed by active locale + display currency |

**Law LOC-04:** No hardcoded UI strings in Catalog Manage / Experience / Wizard / Validation / Bulk / Compare / Timeline / Graph / Previews / Publication / Health.  
**Law LOC-05:** No hardcoded currency symbols or fixed decimal formats in Catalog presentation.

---

## 5. Ownership boundaries

| Owner | Owns |
|-------|------|
| **Commercial Catalog** | USD commercial amounts; regional eligibility; regional override amounts (presentation commercial policy); snapshot USD facts |
| **Localization / Presentation** | Language, RTL/LTR, formatting, dual-price composition, SEO hreflang |
| **Country Detection** | Visitor country resolution (manual → CF → GeoIP → US default) — does **not** invent prices |
| **FX Service** | Live rates for presentation conversion only — does **not** mutate Catalog |
| **Billing / Payments** | Settlement / charge currency policy downstream — **consumes** Catalog USD + optional regional context; does not author SKUs |

---

## 6. Target modules (implementation-bound; architecture-defined)

| Module | Responsibility |
|--------|----------------|
| `resolveVisitorCountry` | Priority chain (see CURRENCY-AND-COUNTRY-FLOWS) |
| `resolveDisplayCurrency` | Country → default currency for display |
| `resolveLocalizedAmount` | Override → FX → USD |
| `formatCommercialMoney` | Locale-aware currency formatting |
| `CommercialDualPrice` | UI atom: USD + local |
| `CatalogLocalizationKeys` | Complete AR/EN key coverage for Catalog UI |
| `localizationObservability` | Country, source, FX/override, lang, RTL, errors |

---

## 7. Current platform baseline (runtime fact)

| Area | State |
|------|-------|
| i18n shell | AR/EN + `t()` exist; Catalog Experience/Manage mostly hardcoded English |
| Price storage | Free-form `currency` string; seed/UI default **SAR** |
| Dual USD+local | Not implemented |
| CF-IPCountry / GeoIP | Not implemented for Catalog |
| FX | Not implemented for Catalog |
| Admin USD-only | Not enforced |
| Public `/pricing` | Legacy subscription plans; `$` presentation; not Catalog dual-price |

Architecture in this program **authorizes the target**; runtime compliance requires a follow-on implementation program.
