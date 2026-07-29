# LEGACY-REPLACEMENT — COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1

## Superseded as Commercial SSOT

| Legacy source | Replacement |
|---------------|-------------|
| `subscription_plans` configuration ownership | `commercial_plans` / versions / prices |
| `server/seed-plans.mjs` | Catalog seed + Platform Ops publish |
| Hardcoded `TRIAL_DAYS=14` as policy SSOT | Catalog `commercial_trial_policies` |
| Hardcoded feature/limit *configuration* | Feature bundles + limit profiles |
| Duplicated regional / promotion logic | Catalog regions + promotions |

## Retained (compatibility / non-SSOT)

| Asset | Why retained |
|-------|----------------|
| `subscription_plans` rows | Payment/activation `planId` bridge |
| `user_subscriptions` | Subscription instance lifecycle |
| `planFeatureMatrix` | Entitlement **evaluation** runtime (explicit non-rewrite) |
| PayPal/Tap webhooks | Out of scope (no payment work) |

## Dead / deprecated markers

- `seed-plans.mjs` — deprecated header  
- `planFeatureMatrix.ts` — documented non-SSOT  
- `TRIAL_DAYS` / `TRIAL_PLAN_SORT_ORDER` — fallback only
