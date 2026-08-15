# IDENTITY-FORENSICS

## Current dual identity (proven)

```
commercial_plans.id          varchar(36) UUID     catalog PK
commercial_plans.code        unique string        stable business key
user_subscriptions.planId    int                  legacy compatibility
bindings.planId              varchar(36)          Live Plan UUID (already)
bindings.legacyPlanId        int nullable         copy of integer handle
LEGACY_PLAN_BRIDGE           30001/30002/30003    integer ↔ code
PLAN_ID_TO_CATALOG_PLAN      same integers        second map (client/shared)
```

## Why the integer still exists

| Caller | Why integer? | Can Live Plan UUID replace it today? |
|--------|--------------|--------------------------------------|
| `user_subscriptions.planId` | Column type `int NOT NULL` | Only after ALTER + data map |
| `createCheckoutSession` / `createTapCheckout` | `z.number()` | Only after API + Pricing cutover |
| Pricing `planId={legacyPlanId}` | Checkout input | Consumer exists |
| `listPlans` compatibility `id` | Integer DTO | Consumer/tests exist |
| Public offering `legacyPlanId` | Checkout handle | Consumer exists |
| Trial `resolveTrialPlanId` | Writes `user_subscriptions.planId` | Same column |
| PayPal/Tap `custom_id` / metadata | Correlates checkout integer | Provider payload is ours; type can change with checkout |
| Admin create/update subscription | `planId: z.number()` | Consumer exists |
| Customer Success admin UI | `legacyPlanId` | Consumer exists |
| Unbound entitlements | `bridgeByLegacyPlanId` → catalog key | Binding UUID path already preferred when bound |
| Catalog bootstrap | Iterates bridge to seed standard plans | Could iterate codes; not a reason to keep integers |

## Provider IDs (do not touch)

PayPal order id, Tap charge id, `stripeSubscriptionId` columns, invoice ids, check/order ids, subscription row ids. These are **not** MineuQR plan identity.

## 30002

Normative Professional integer in `LEGACY_PLAN_BRIDGE` and `PLAN_ID_TO_CATALOG_PLAN`. Used as trial fallback and throughout fixtures. Not a provider id. Not a customer contract id.
