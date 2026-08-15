# FIELD-OWNERSHIP-MATRIX.md

Do not copy contractual or transactional fields onto Live Plan.

| Field | Current meaning | Correct owner | Action |
|-------|-----------------|---------------|--------|
| `id` | Integer sellable / activation handle | Compatibility → Live Plan UUID/`code` | **RETAIN TEMPORARILY** as `legacyPlanId` (LEGACY COMPATIBILITY IDENTIFIER). Removal path: binding + Checkout identity cutover |
| `nameEn` / `nameAr` | Display name | Live Plan `name` (+ presentation i18n) | **ALREADY EXISTS IN LIVE PLAN**. Residual DTO/notification reads remain |
| `descriptionEn` / `descriptionAr` | Marketing copy | Live Plan `description` | **ALREADY EXISTS IN LIVE PLAN** |
| `priceMonthly` | Legacy monthly charge list | Live Plan Offer (`commercial_prices` monthly USD) | **MOVE TO PLAN OFFER** — Checkout now reads Live Plan. Column leftover for MRR/invoice/DTO |
| `priceYearly` | Legacy yearly charge list | Live Plan Offer yearly | **MOVE TO PLAN OFFER** — same as monthly |
| Billing cycle (not a column) | Which price is charged | Subscription + Charged Terms | **MOVE TO SUBSCRIPTION** / Charged Terms (already stored on bind) |
| `maxRestaurants` / `maxItemsPerRestaurant` / `maxCategories` | Legacy quotas | Live Plan limit profile | **ALREADY EXISTS IN LIVE PLAN**. Runtime does not read these columns. **DELETE** with table |
| `features` / `featuresAr` | Legacy feature JSON | Live Plan feature bundle | **ALREADY EXISTS IN LIVE PLAN**. **DELETE** with table |
| `isActive` | Sellable flag | Live Plan `isHidden` + publishing | **ALREADY EXISTS IN LIVE PLAN** |
| `sortOrder` | Display / trial pick | Live Plan `sortOrder` + trial policy | **ALREADY EXISTS IN LIVE PLAN**. Trial fallback still uses legacy column |
| `stripePriceIdMonthly` / `stripePriceIdYearly` | Unused Stripe ids | Provider layer (deferred) | **MOVE TO PROVIDER LAYER** / **DELETE** — unused. Do not put on Live Plan |
| Currency (not stored) | PayPal USD / Tap SAR hardcoded | USD canonical; Tap local deferred | **MOVE TO PLAN OFFER** (USD). Provider SAR **RETAIN TEMPORARILY** on Tap call only |
| `createdAt` / `updatedAt` | Row timestamps | Historical / test | **TEST DATA ONLY** / **DELETE** with table |
| Customer price / payment / tax / FX / invoice / refund / status | Must not live here | Subscription / Charged Terms / Payment | **Do not move to Live Plan** (I-CONSOLIDATION-08) |

## Invariants

- **I-CONSOLIDATION-01** — Public Pricing and Checkout charge the same Live Plan Offer Price. **Checkout path now satisfies this.**
- **I-CONSOLIDATION-08** — No customer-specific contract data on Live Plan.
- **I-CONSOLIDATION-09** — No third plan table created.
