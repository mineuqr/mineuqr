# 01 — LIVE PLAN SCHEMA FORENSICS

Source: `server/db/schema/commercial/tables.ts`, Production INFORMATION_SCHEMA `2026-08-15T14:43:59.042Z`.

## Table

`commercial_plans` — platform-global catalog identity. **No `restaurantId` / tenant column.** No DB foreign keys to or from this table.

Primary key: `id` varchar(36). Unique business key: `code` (`commercial_plans_code_uq`).

UUID generation: `newCommercialId()` → `crypto.randomUUID()` in `CatalogStore.ts`. Application updates **never** change `id` or `code`.

## Field ownership

| Field | Meaning | Owner | SSOT | Mutable | Customer contract? | Affects existing subs? | Charged Terms | Checkout | Entitlements | Reporting | Public pricing |
|-------|---------|-------|------|---------|--------------------|------------------------|---------------|----------|--------------|-----------|----------------|
| `id` | Canonical Live Plan UUID | Catalog | Yes | No (app) | No — identity only | References remain | Bind stores copy of id | UUID input | Bound/unbound lookup | planCode via join | `planId` |
| `code` | Business key (`basic` / `professional` / `enterprise`) | Catalog | Yes | No (app) | No | No | `catalogPlanCode` derived | Not checkout input | Tier mapping | `planCode` | `planCode` |
| `name` | Display name | Catalog | Yes | Yes | No | Display only | Name at bind not snapshotted on binding row | Offer name | Display | planName | `planName` |
| `description` | Marketing text | Catalog | Yes | Yes | No | No | No | No | No | No | Not on PublicCatalogOffering |
| `sortOrder` | Admin/public order | Catalog | Yes | Yes | No | No | No | No | No | No | Implicit list order |
| `isHidden` | Visibility | Catalog | Yes | Yes | No | Hidden plans still resolve for existing subs | No | Hidden → offer null | Bound path ignores hide | Public list excludes | Excludes hidden |
| `featureBundleId` | Capability composition pointer | Catalog | Pointer only; values in `commercial_bundle_features` | Yes | No | **Yes — live capabilities propagate immediately** | No | No | Yes | Feature projection | `featureKeys` |
| `limitProfileId` | Limit composition pointer | Catalog | Pointer; values in `commercial_limit_values` | Yes | No | **Yes — live limits propagate** | No | No | Yes | Limits projection | `limits` |
| `trialPolicyId` | Trial policy pointer | Catalog | Pointer; duration in `commercial_trial_policies` | Yes | No | New trials only | No | No | Trial duration | Trial days on offering | `trialDurationDays` |
| `createdAt` / `updatedAt` | Audit timestamps | Catalog | Yes | Auto | No | No | No | No | No | `updatedAt` on offering | Yes |

## Fields that do NOT belong on Live Plan (and are correctly absent)

Price amount/currency, charged terms, subscription status, provider IDs, invoice amounts, tax calculation, FX rates, feature **values**, limit **values**, tenant identity.

## Related catalog tables (not the plan row)

| Table | Role |
|-------|------|
| `commercial_prices` | Offer List Price (amount, currency, cycle, optional region) |
| `commercial_billing_cycles` | monthly / yearly |
| `commercial_feature_bundles` + `commercial_bundle_features` | Capabilities |
| `commercial_limit_profiles` + `commercial_limit_values` | Limits |
| `commercial_trial_policies` | Trial duration |
| `commercial_regions` | Regional commercial metadata (currency, unused `taxPolicyRef`) |
| `commercial_promotions` | Promo definitions — **not applied at checkout** |
| `commercial_subscription_bindings` | Charged Terms + bind (not catalog) |

## Soft-delete / archive

No `deletedAt`. No `isActive` on plans. Archive = `isHidden = true`. No application delete API. No FK protection if SQL DELETE is issued.

## Production population

Three rows: `basic`, `professional`, `enterprise`. All visible. Each has bundle + limits. Enterprise has **no** trial policy pointer. Duplicate codes/ids: none.
