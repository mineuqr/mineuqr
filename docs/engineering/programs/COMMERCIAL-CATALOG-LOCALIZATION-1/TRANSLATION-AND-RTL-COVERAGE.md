# Translation, RTL/LTR & Formatting Coverage

**Program:** COMMERCIAL-CATALOG-LOCALIZATION-1  
**Date:** 2026-07-29

---

## 1. Languages

| Language | Status (architecture) | Runtime Catalog UI |
|----------|----------------------|--------------------|
| Arabic (`ar`) | **Required complete** | Shell metrics/title only; Experience/Manage largely English hardcoded |
| English (`en`) | **Required complete** | Same — labels already English literals, not locale keys |
| Future languages | Extensible via locale JSON + `Language` union | Not in scope to implement now |

**Law LOC-06:** Catalog UI must use platform localization resources (`t(key)` / locale JSON). Missing keys are observability errors, not silent English embeds.

---

## 2. Translation coverage matrix (required surfaces)

| Surface | Required keys namespace | Runtime |
|---------|------------------------|---------|
| Experience tabs (Dashboard…Manage) | `admin.platformOps.commercialCatalog.experience.tabs.*` | Hardcoded `EXPERIENCE_TAB_LABELS` |
| Manage subsections | `…section.*` (partial keys exist, unused by nav) | Hardcoded `MANAGEMENT_SECTION_LABELS` |
| Plan Wizard | `…wizard.*` | Hardcoded English |
| Validation / smart remediation | `…validation.*` | Hardcoded English |
| Bulk Operations | `…bulk.*` | Hardcoded English |
| Compare / Deep Clone | `…compare.*` | Hardcoded English |
| Timeline | `…timeline.*` | Hardcoded English |
| Dependency Graph | `…graph.*` | Hardcoded English |
| Customer Preview | `…customerPreview.*` | Hardcoded English |
| Pricing Preview | `…pricingPreview.*` | Hardcoded English |
| Publication / Health / Validation panels | `…publication.*` / `…health.*` | Hardcoded English |
| CRUD dialogs / toasts / empty states | `…manage.{entity}.*` | Hardcoded English |
| Dual-price labels (Canonical / Local) | `…money.*` | Missing |
| Public pricing Catalog-backed | `pricing.*` + catalog offer keys | Legacy `$` plans; not dual Catalog |

---

## 3. RTL / LTR

| Rule | Statement |
|------|-----------|
| **RTL-01** | Layout, icons, spacing, alignment, navigation, dialogs, tables, wizard, timeline, and graphs adapt to `dir` from locale. |
| **RTL-02** | Customer / public commercial pages follow document `dir` (Arabic → RTL). |
| **RTL-03** | Admin Platform Ops shell today forces LTR geometry (`ADMIN_WORKSPACE_DIR = "ltr"`) for operational density — **Catalog Experience must still localize strings**; full RTL shell adaptation for admin may remain shell-scoped, but **customer presentation is RTL-mandatory**. |
| **RTL-04** | No mirrored-logic forks: one component tree; CSS logical properties / `dir` aware layouts. |

**Runtime:** `LanguageContext` sets `html[dir]`; Catalog admin inherits ops LTR shell; customer Catalog presentation not yet dual-price RTL-certified.

---

## 4. Number formatting

| Locale | Example |
|--------|---------|
| Arabic | `١٬٢٣٤٫٥٦` (or locale-appropriate Arabic-Indic / Western digits per platform Intl policy) |
| English | `1,234.56` |

**Law FMT-01:** Use `Intl.NumberFormat(locale, …)`. No hand-rolled separators.

---

## 5. Date formatting

**Law FMT-02:** Use `Intl.DateTimeFormat(locale, …)`. No hardcoded `YYYY-MM-DD` in Catalog presentation (ISO may remain internal/API).

---

## 6. Currency formatting

| Market | Example display |
|--------|-----------------|
| Saudi Arabia | `71 ر.س` / `SAR 71` per locale |
| United States | `$19` |
| Germany | `17 €` |
| United Kingdom | `£15` |
| Japan | `¥2,900` |

**Law FMT-03:** Use locale-aware currency formatting APIs (`Intl.NumberFormat` with `style: "currency"`).  
**Law FMT-04:** Canonical USD slot always formatted as USD regardless of visitor locale’s default currency.

---

## 7. SEO (localized pricing pages)

| Requirement | Architecture |
|-------------|--------------|
| Localized titles / descriptions / metadata | Per-language SEO resources |
| Canonical URL | Single commercial offer canonical |
| `hreflang` alternates | `ar` / `en` (+ future) |

**Law SEO-01:** Localization metadata must not invent alternate commercial SKUs.

---

## 8. Reuse points (existing)

- `client/src/contexts/LanguageContext.tsx`  
- `client/src/locales/ar.json` · `en.json` (`admin.platformOps.commercialCatalog.*` partial)  
- `client/src/lib/subscription/formatters.ts` (`formatCurrencyUSD`) — **legacy subscription**; Catalog must add shared commercial formatters without duplicating price *logic*
