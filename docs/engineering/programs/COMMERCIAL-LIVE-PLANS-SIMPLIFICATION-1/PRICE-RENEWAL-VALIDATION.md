# PRICE-RENEWAL-VALIDATION.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14

## Policy

- Current period: keep the price actually charged.
- Renewal: current live plan price.
- Historical invoices: immutable.

## Code path

**Capture at bind/renew** — `bindSubscriptionToLivePlan`:

- Always reads `pricingService.currentPriceForPlan` (`chargedTermsForPlan`).
- Upserts binding `chargedAmount` / `chargedCurrency` / cycle.
- Admin period change or plan change in `subscriptionAudit.ts` calls `ensureLivePlanBoundForSubscription` with `event: "renewal" | upgrade | downgrade`.
- Payment webhooks (`tap-webhook.ts`, `paypal-webhook.ts`) call `ensureLivePlanBoundForSubscription` on activation.

No version publish, no snapshot capture, no retirement.

**Read for current period** — `resolveLivePlanCapabilities`:

```
if (binding.chargedAmount && binding.chargedCurrency && cycle)
  use binding charged terms
else
  chargedTermsForPlan(plan.id, ...)  // CURRENT live list price
```

The `else` branch **violates policy 6** whenever backfill leaves `chargedAmount` null.

## Tests run

| File | Test | Result |
|------|------|--------|
| `commercialLivePlans.architectureAuthority.validation.test.ts` | captured 100 SAR object vs later 150 SAR live price | PASS (list-price mutation; not DB binding) |
| `commercialCatalogFoundation.services.test.ts` | rolls back prices when live save validation fails | PASS |
| `admin-invoice-billing.test.ts` | 5 tests | PASS |
| `subscription-invoice-verification.test.ts` | 11 tests | PASS |

Invoice amount is never updated by catalog `saveLive`. Historical invoices are not rewritten by this program.

## Checkout residual

`createCheckoutSession` / `createTapCheckout` / `createInvoice` still take amounts from `subscription_plans`. Renewal **binding** charged terms come from live `commercial_prices`. Those two numbers can diverge. Out of scope to redesign checkout; document as residual dual SSOT.

## Renewal does not require

- old commercial version
- publishing a version
- feature snapshot
- retiring a version
- bootstrap publication

Renewal requires a resolvable live plan via `LEGACY_PLAN_BRIDGE` (`basic` / `professional` / `enterprise`).
