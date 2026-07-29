# Currency Resolution & Country Detection Flows

**Program:** COMMERCIAL-CATALOG-LOCALIZATION-1  
**Date:** 2026-07-29

---

## 1. Commercial currency policy (binding)

```
Store:     USD only
Display:   USD always + Local always
Edit:      USD only (admin)
Snapshot:  USD commercial amount (+ region context metadata)
```

---

## 2. Country detection flow

```
                    ┌──────────────────────────┐
                    │ resolveVisitorCountry()  │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     1. Manual Override   2. Cloudflare      3. GeoIP fallback
        (cookie/query/       CF-IPCountry         (provider)
         admin preview)      header
              │                  │                  │
              └────────┬─────────┴────────┬─────────┘
                       ▼                  ▼
                 country found?     4. Default
                       │            United States
                       ▼            (USD display default)
                 ISO country code
```

**Laws**

| ID | Rule |
|----|------|
| **GEO-01** | Language MUST NOT determine country. |
| **GEO-02** | Priority is Manual → Cloudflare `CF-IPCountry` → GeoIP → United States. |
| **GEO-03** | Country detection failures are observable; display still shows USD + best-effort local (US default). |
| **GEO-04** | Admin Customer Preview / Pricing Preview may supply Manual Override without changing stored Catalog. |

---

## 3. Local currency resolution flow

```
Input: canonicalUsdAmount, planVersionId, countryCode, locale

1. Lookup Regional Override (CC-15)
   for (planVersion + country/region)
        │
        ├─ found → displayAmount = override.amount
        │          displayCurrency = override.currency
        │          source = "regional_override"
        │
        └─ missing ↓

2. Live FX Conversion
   displayCurrency = currencyForCountry(countryCode)
   displayAmount = convert(usdAmount → displayCurrency)
   source = "fx"
        │
        └─ FX unavailable ↓

3. USD only (still dual-slot UI)
   displayAmount = usdAmount
   displayCurrency = USD
   source = "usd_fallback"
```

**Public card always renders both slots:**

```
Canonical USD     $19 / month
Localized         ≈ 71 SAR / month   (or exact override without ≈)
```

Use **≈** for FX-derived amounts; omit ≈ when Regional Override is authoritative exact local list price.

---

## 4. Regional pricing (CC-15 restated)

Commercial Regional Policies remain Catalog SSOT for:

- Country / region eligibility  
- Tax-policy *references*  
- Distribution partner eligibility  
- **Optional local list-price override** (amount + currency)

**Examples (presentation)**

| Market | Canonical | Override (if any) | Else |
|--------|-----------|-------------------|------|
| Saudi Arabia | USD 19 | 69 SAR | FX → SAR |
| Germany | USD 19 | 17 EUR | FX → EUR |
| Japan | USD 19 | ¥2,900 | FX → JPY |
| United States | USD 19 | — | USD (local slot may mirror USD) |

**Prohibited:** country-specific catalog databases; storing non-USD as the sole commercial amount without USD canonical row.

---

## 5. FX service boundary

| May | Must not |
|-----|----------|
| Supply rates for presentation | Persist converted amounts as commercial facts |
| Cache rates with TTL | Replace Catalog USD |
| Emit `fx_usage` observability | Drive language selection |

---

## 6. Snapshot integrity (CC-13 alignment)

Snapshots capture:

- Canonical **USD** amount + cycle  
- Optional **regionId / countryCode** at bind time  
- Optional **override amount/currency** *as of bind* when override was used for commercial agreement  

Historical invoices continue to reference snapshot commercial facts — not live FX.

---

## 7. Observability signals

| Signal | Meaning |
|--------|---------|
| `detected_country` | Resolved ISO country |
| `country_source` | `manual` \| `cloudflare` \| `geoip` \| `default_us` |
| `currency_source` | `regional_override` \| `fx` \| `usd_fallback` |
| `override_used` | boolean |
| `fx_used` | boolean |
| `localization_language` | `ar` \| `en` \| … |
| `rtl_usage` | boolean |
| `localization_errors` | missing keys / format failures |
| `country_detection_failures` | CF/GeoIP errors |

---

## 8. Current runtime gap

| Flow step | Runtime |
|-----------|---------|
| Manual country | Partial (admin region pickers / free-text) — not visitor pipeline |
| CF-IPCountry | **Absent** |
| GeoIP | **Absent** |
| Default US | **Absent** for Catalog storefront |
| Regional override as presentation beside USD | Regions + free currency prices exist; **not** USD-canonical dual model |
| FX | **Absent** |
