# SUBSCRIPTION vs FINANCIAL COMMITMENT

## Subscription lifecycle (persisted on `user_subscriptions`)

- `status`: active / trial / expired / canceled
- `billingCycle`: monthly / yearly (lifecycle cadence, not Charged Terms)
- `currentPeriodStart` / `currentPeriodEnd`
- `planId`: canonical Live Plan UUID (`commercial_plans.id`)
- `restaurantId`: Admin path forces `0` (account-level)
- Entitlement: `resolveSubscriptionEntitlement` (status + period). Elapsed `active` is **not** entitled.

No `chargedAmount` / `chargedCurrency` columns exist on Production `user_subscriptions` (INFORMATION_SCHEMA 2026-08-15).

## Financial commitment (persisted on `commercial_subscription_bindings`)

- `chargedAmount`
- `chargedCurrency`
- `billingCycleCode` / `billingCycleId`
- `planId` (Live Plan UUID at bind)
- Unique on `subscriptionId` → at most one Binding per subscription

This is the Charged Terms snapshot used for MRR and Admin invoice PDF.

## Entitlement vs MRR

| Question | Authority |
|----------|-----------|
| Can the owner use the product? | Subscription lifecycle + Live Plan / entitlements (`getCommercialEntitlements`). Binding is **not** required. |
| Does the owner count in certified commercial MRR? | COMMERCIAL population + `countsInMrr` + **valid Charged Terms**. Missing terms → contribution **0**. |
| Can Admin generate an invoice PDF? | Requires `binding.chargedAmount`. Missing → `NOT_FOUND` "لا توجد شروط تجارية مسجلة لهذا الاشتراك". |

## Must every commercially MRR-qualifying Admin-created subscription have Charged Terms?

**Yes, before it is financially complete.** Lifecycle completeness is not financial completeness.

### I-ADMIN-CT-01 (recorded invariant — intended, not enforced)

Any Admin-created subscription that is commercially qualifying and eligible for MRR MUST have a corresponding valid Charged Terms record before it can be considered financially complete.

**Supported by architecture:**

- Canonical MRR reads only Charged Terms (`chargedTermsMrr.ts`).
- Admin invoice PDF refuses missing `chargedAmount`.
- Current Admin create **calls** `ensureLivePlanBoundForSubscription`.
- Post-cutover Production Admin creates 810001 and 840001 **do** have Charged Terms.

**Not enforced:**

- Bind is fail-soft; create succeeds without Binding.
- Pre-cutover Admin creates (750001, 780001) have lifecycle rows and no Charged Terms.
- `billingCycleCode` is omitted at bind, so a yearly qualifying create would snapshot the wrong catalog cycle if bind succeeded.
- INTERNAL accounts are excluded from certified commercial KPI population even when entitled; I-ADMIN-CT-01 is about financial completeness, not KPI population membership.

The architecture **does** support I-ADMIN-CT-01 as the financial-completeness rule. Runtime Admin create **does not** fail closed on it.
