# CHECKOUT-IMPACT

Checkout was not modified. Price, currency, and provider metadata were not changed.

## Today

```
Public Pricing (offering.planId UUID + offering.legacyPlanId int)
        ↓
Pricing.tsx passes integer into checkout
        ↓
createCheckoutSession / createTapCheckout  planId: z.number()
        ↓
resolveCheckoutOfferFromLivePlan(legacyInt) → Live Plan Offer List Price
        ↓
Provider order/charge (amount from Live Plan; metadata echoes integer)
```

Checkout **price** is already Live Plan. Checkout **input identity** is still the integer.

## Future

Checkout can accept `commercial_plans.id` (UUID) without an integer:

```
Public Pricing offering.planId (UUID)
        ↓
Checkout input = UUID
        ↓
Live Plan Offer List Price
        ↓
Bind bindings.planId = same UUID
```

That is OD-3 plus a checkout identity cutover. It is **not** a pricing-policy change.

Until then, `legacyPlanId` remains the checkout handle. It must not determine price (already true).
