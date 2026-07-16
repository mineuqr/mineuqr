# GLOBAL-NUMERIC-PRESENTATION-POLICY-1 — Architecture

**Classification:** Cross-Platform Presentation Policy  
**Status:** Approved for implementation → PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Does not modify:** Order Domain, Operational Session, Check Management, Reporting Platform, Business Settings, Runtime, Business Identity  

---

## 1. Objective

Adopt **Western Digits (0–9)** as the official numeric presentation standard across MineuQR.

- Arabic and English interfaces remain fully supported  
- Only numeric glyphs change  
- No business logic, DTO, API, or domain changes  

---

## 2. Policy

| Concern | Rule |
|---------|------|
| Text | Remain localized (AR / EN) |
| Digits | Always Western `0–9` |
| Separators | Arabic `٫` → `.`, `٬` → `,` |
| Intl | `numberingSystem: "latn"` |

Example:

```
الإيرادات
15,450.75 SAR
```

Never:

```
١٥٬٤٥٠٫٧٥ ر.س
```

---

## 3. Platform helper

Canonical module:

`shared/utils/numericPresentation.ts`

| Export | Role |
|--------|------|
| `toWesternDigits` | Glyph / separator normalization |
| `withWesternDigitsIntlOptions` | Force `latn` on Intl options |
| `formatLocaleNumber` | Number formatting |
| `formatLocaleDateTime` | Date/time formatting |

Client façade: `client/src/lib/numericPresentation.ts`

---

## 4. Choke points

| Layer | Adoption |
|-------|----------|
| `formatInRestaurantTimezone` | Defaults `numberingSystem: "latn"` |
| `currencyLocale.formatCurrencyAmount` | `latn` + `toWesternDigits` |
| Kitchen presentation | Removed Eastern-digit conversion |
| Reporting exports | Import shared `toWesternDigits` |
| Bypass formatters | Waiter / Dashboard offers / settlement trends / print timestamps |

---

## 5. Non-goals

- No Reporting Platform / DTO changes  
- No calculation changes  
- No Runtime / domain redesign  
