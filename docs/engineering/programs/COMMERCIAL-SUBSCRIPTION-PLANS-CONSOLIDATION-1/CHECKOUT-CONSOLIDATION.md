# CHECKOUT-CONSOLIDATION.md

## Decision

**YES — Checkout can safely move its commercial price source to Live Plans** without waiting for Payment Provider / FX / Tax architecture.

Those deferred topics are not required to choose **which catalog amount** is sent to the existing PayPal (USD) / Tap (SAR) calls.

Formal dual-write / provider-routing “Cutover Design” is **not** a blocker for this price-source swap. No real customer contracts exist.

## What shipped in this program

```
Pricing UI (Live Plan offerings)
    ↓  planId = legacyPlanId (compatibility handle)
createCheckoutSession / createTapCheckout
    ↓
resolveCheckoutOfferFromLivePlan(legacyPlanId, billingCycle)
    ↓  ensureCatalogReady → Live Plan UUID → currentPriceForPlan
    ↓
amount = Live Plan Offer List Price (USD string)
    ↓
PayPal createOrder (currency USD) / Tap createCharge (currency SAR unchanged)
```

Fail closed: missing Live Plan, hidden plan, or missing cycle price → `NOT_FOUND` / invalid amount. **No fallback** to `subscription_plans.price`.

Helper: `server/services/commercial-catalog/adoptionService.ts`  
`resolveCheckoutOfferFromLivePlan`

## What did not change

| Item | Status |
|------|--------|
| Numeric `planId` API input | **LEGACY COMPATIBILITY IDENTIFIER** |
| Tap `currency: "SAR"` | Deferred provider/local — not redesigned |
| PayPal / Tap webhooks | Still may read table for existence / email |
| Charged Terms at bind | Still Live Plan price at bind (`chargedTermsForPlan`) |
| FX / Tax / provider routing | Not implemented |

## Historical defect

Professional catalog **26.40** vs legacy Checkout **39.00** is closed **on the charge-creation path**. New Checkout uses the Live Plan offer.

## Residual Checkout-adjacent reads

Webhooks still call `getSubscriptionPlanById` after payment. That is identity/email, not the charge book. Removal: later binding/identity program.

## Tests

- `commercialCheckoutLivePlanOffer.test.ts`
- `commercialCatalogAdoption.guards.test.ts` (Checkout blocks must not call `getSubscriptionPlanById`)
- `payment-flow.test.ts` / `subscription.test.ts` mock the Live Plan resolver
