# IDENTITY-FORENSICS

## Proven current model

```
commercial_plans.id          varchar(36) PK     randomUUID() at create
commercial_plans.code        unique varchar     basic | professional | enterprise
commercial_prices.planId     varchar(36)        Live Plan UUID
bindings.planId              varchar(36)        Live Plan UUID (already)
bindings.legacyPlanId        int nullable       compatibility copy
user_subscriptions.planId    int NOT NULL       compatibility column (no FK)
LEGACY_PLAN_BRIDGE           30001/30002/30003  integer ↔ code
PLAN_ID_TO_CATALOG_PLAN      same integers      duplicate client/shared map
subscription_plans.id        int PK             leftover table — not catalog authority
```

## Validation (repository)

| Claim | Evidence | Result |
|-------|----------|--------|
| Live Plan UUID exists and is unique | `commercial_plans.id` PK; `newCommercialId()` = `randomUUID()` | Proven |
| UUID used by bindings | `commercial_subscription_bindings.planId` varchar(36) NOT NULL | Proven |
| UUID used by catalog prices | `commercial_prices.planId` varchar(36) | Proven |
| UUID already public | `PublicCatalogOffering.planId: string` | Proven |
| UUID immutable on edit | `saveLive` forces `id: existing.id` | Proven |
| Code unique | `commercial_plans_code_uq` | Proven |
| Code preserved on edit | `saveLive` forces `code: existing.code` | Proven |
| Integer remains compatibility | checkout `z.number()`, trial write, webhook echo | Proven |
| `subscription_plans` not commercial authority | residual cleanup + identity guards; routers do not call `getSubscriptionPlanById` | Proven |
| `legacyPlanId` does not determine price | checkout `currentPriceForPlan` | Proven |
| `legacyPlanId` does not determine capabilities/limits | `resolveEntitlementsFromLivePlan` | Proven |
| `legacyPlanId` does not determine MRR | Charged Terms only | Proven |
| No second catalog authority | Live Plan is catalog (ADR-034) | Proven |
| No tenant column on catalog | `commercial_plans` has no restaurant/tenant id | Proven platform-global |

## Charged Terms already store UUID

`CommercialChargedTerms.planId: string` is the Live Plan UUID of the catalog template that was bound. Amount/currency/cycle remain contract fields and are independent of later catalog edits.

## What is not proven this session

Production row counts and distinct `user_subscriptions.planId` values were **not** re-queried. That is OD-5 (implementation preflight), not a reason to reject UUID as the identity type.
