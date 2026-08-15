# 04 — CHECKOUT PROOF

Safe non-financial identity verification only. **No real payment. No provider order created.**

## Identity contract (deployed)

`createCheckoutSession` and `createTapCheckout` accept `livePlanUuidInput` only.

```
UUID planId
  → resolveCheckoutOfferFromLivePlan
  → Live Plan
  → pricingService.currentPriceForPlan
  → Offer List Price
```

Public integer `planId` is rejected by Zod (`invalid_live_plan_id`).  
`resolveCheckoutOfferFromLivePlan` does not call `getSubscriptionPlanById`.

## Price authority

Unchanged. Canonical source remains **Live Plan Offer List Price**.

Not used:

- `subscription_plans.priceMonthly`
- `subscription_plans.priceYearly`
- leftover integer price lookup

`LivePlanCheckoutOffer.legacyPlanId` is documented as a compatibility handle, not a price authority.

Live public catalog prices observed (read-only; not inferred or changed):

| planCode | priceMonthly | priceYearly | currency |
|----------|--------------|-------------|----------|
| basic | 19.00 | 199.00 | USD |
| professional | 29.00 | 349.00 | USD |
| enterprise | 99.00 | 999.00 | USD |

These are catalog Offer List Prices. Tax / FX / provider behavior was not exercised.

## Rejection proof

| Case | Proof |
|------|-------|
| UUID accepted | `livePlanUuidInput.safeParse(uuid)` + live `getOffering` 200 |
| malformed UUID rejected | unit test + live `getOffering` 400 |
| unknown UUID rejected | `unknown_live_plan` / live `getOffering` 404 |
| integer rejected by new public contract | `livePlanUuidInput.safeParse(30002) === false`; live `getOffering` 400 |

Checkout mutations were **not** invoked (they would create a PayPal/Tap payment session).

## Client

Pricing checkout buttons receive `planId={checkoutPlanId}` where `checkoutPlanId = offering.planId` (UUID). They do not pass `legacyPlanId`.

## Decision

**CHECKOUT GATE: PASS**  
Identity changed to UUID. Price authority did not change.
