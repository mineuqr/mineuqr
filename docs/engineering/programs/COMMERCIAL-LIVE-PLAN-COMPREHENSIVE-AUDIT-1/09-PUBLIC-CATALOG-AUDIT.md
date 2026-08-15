# 09 — PUBLIC CATALOG AUDIT

## Transformation

```
commercial_plans (!isHidden)
  + commercial_prices (global monthly/yearly)
  + bundle features / limit values / trial duration
  + LEGACY_PLAN_BRIDGE.legacyPlanId
→ PublicCatalogOffering
```

`publicCatalogReadModel.buildOffering`. Comment: **NEVER used as invoice/payment authority.** `assertPublicCatalogNotEntitlementAuthority` / `publishedCatalogParticipatesInEntitlement: false`.

## Fields

| Field | Source | Class |
|-------|--------|-------|
| `planId` | `commercial_plans.id` UUID | **A. Canonical** public identity (OD-3) |
| `planCode` | `code` | **A. Business key** |
| `planName` | `name` | **B. Derived** display |
| `priceMonthly` / `priceYearly` / `currency` | global `commercial_prices` | **B. Derived** Offer List Price projection |
| `featureKeys` / `limits` | live composition | **B. Derived** |
| `visibility` | `!isHidden` | **B. Derived** |
| `trialDurationDays` | trial policy | **B. Derived** |
| `legacyPlanId` | `LEGACY_PLAN_BRIDGE` | **D. Compatibility** — not authority |

No duplicated **write** authority. Public catalog is a **read projection**. Pricing page consumes `listOfferings`; checkout then re-resolves Offer List Price server-side (does not trust the client DTO as payment authority).

`description` is not projected. Dual-price FX on Pricing.tsx is presentation-only and does not use stored SAR regional rows (`regions: []`).
