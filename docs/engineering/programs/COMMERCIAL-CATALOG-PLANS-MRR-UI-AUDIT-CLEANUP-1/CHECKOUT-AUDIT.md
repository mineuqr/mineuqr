# CHECKOUT-AUDIT.md

```
Pricing UI (catalog display)
  → plan selection (legacyPlanId 30001–30003)
  → createCheckoutSession / createTapCheckout
  → getSubscriptionPlanById → subscription_plans amount
  → PayPal (USD) / Tap (SAR)
  → webhook
  → updateSubscriptionForActivation
  → ensureLivePlanBoundForSubscription (charged terms from catalog at bind)
```

## Classification

`subscription_plans` on the charge path: **LEGACY_COMPATIBILITY**.

Do not remove. Do not redesign Checkout in this program.

## Verified

- Selected plan identity: legacy integer ID from offering `legacyPlanId`.
- Billing cycle: mutation input `monthly` / `yearly`.
- Charge currency: PayPal USD; Tap SAR (legacy row amounts).
- Charged terms after webhook: catalog price at bind, stored on the binding — **not** necessarily equal to the PayPal/Tap charge.
- Platform Owner: checkout disabled in UI (`OwnerAccessPricingNote`).

## Dual-book customer-visible gap

Pricing shows Live Plan USD (e.g. Professional 26.40). Checkout charges `subscription_plans` (Professional 39.00). Intentional unfinished cutover. Follow-on: checkout catalog alignment (do not implement here).
