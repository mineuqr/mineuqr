# Commercial Presentation Summary

**Program:** COMMERCIAL-CATALOG-LOCALIZATION-1  
**Date:** 2026-07-29

---

## 1. Public / customer pricing page

Must automatically present:

| Element | Source |
|---------|--------|
| Plan identity & features | Catalog Version / Bundle (SSOT) |
| Canonical USD | Catalog USD price row |
| Localized currency | Override → FX → USD fallback |
| Billing cycle | Catalog cycles |
| Regional availability | CC-15 |
| Taxes | Tax-policy *reference* from Catalog; calculation remains Billing |
| Language / RTL | Platform locale |

**Wireframe (mandatory dual slot)**

```
Starter
────────────────────────
USD
$19 / month
────────────────────────
Local Currency
≈ 71 SAR / month
────────────────────────
[ CTA ]
```

---

## 2. Admin experience

| Action | Allowed |
|--------|---------|
| Create / edit price amount | **USD only** |
| Set regional override (CC-15) | Local amount+currency as **override policy**, not replacement of USD row |
| Edit “local” as sole commercial currency | **Prohibited** |
| Localized Preview panel | Read-only multi-market preview |

**Admin preview example**

```
Canonical
USD 19

Preview
Saudi Arabia   ≈ 71 SAR   (or exact override)
Germany        ≈ 17 EUR
Japan          ≈ ¥2,900
```

Preview NEVER mutates stored data.

Hosts (already in Experience): **Pricing Preview**, **Customer Preview** — must be upgraded to dual-price + country override + locale formatting without new domain engines.

---

## 3. Presentation composition (no duplicated pricing logic)

Single resolver used by:

- Public `/pricing` (Catalog-backed path)  
- Customer Preview  
- Pricing Preview  
- Dual-price atoms in cards / wizard review  

```
CommercialCatalog (USD facts + overrides)
        ↓
resolveLocalizedAmount(country)
        ↓
CommercialDualPrice (USD slot + Local slot)
```

Legacy `subscriptionPlans` dollar UI is **not** a second commercial SSOT; adoption path remains Catalog.

---

## 4. Prohibited presentation patterns

- Showing local only (hiding USD)  
- Showing USD only on international storefronts (local slot required; may mirror USD for US)  
- Hardcoded `$` without formatter  
- Language → country inference  
- Per-country cloned Catalog databases  

---

## 5. Runtime baseline

| Surface | Today |
|---------|-------|
| `/pricing` | Legacy plans; `$` + monthly/yearly; i18n copy via `pricing.*` |
| Pricing Preview | Single amount+currency string |
| Customer Preview | Manual region; single currency line |
| Manage Pricing | Free-text currency (default SAR) |
| Wizard pricing step | Defaults `currency: "SAR"`, `countryCode: "SA"` |
