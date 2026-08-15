# 05 — CHECKOUT CUTOVER

## Before

```
planId: number → resolveCanonicalLivePlanId → UUID
  → resolveCheckoutOfferFromLivePlan → Offer List Price
```

Pricing sent `offering.legacyPlanId`.

## After

```
planId: UUID → resolveCheckoutOfferFromLivePlan → Offer List Price
```

Pricing sends `offering.planId`.

Price source remains `pricingService.currentPriceForPlan(live UUID, cycle)`.

Same Live Plan ⇒ same Offer List Price (proven in `commercialCheckoutLivePlanOffer.test.ts`).

No leftover-table price. No Tax. No FX. No provider change. Amounts unchanged except identity representation in `custom_id` / `metadata.plan_id` / PayPal `reference_id`.
