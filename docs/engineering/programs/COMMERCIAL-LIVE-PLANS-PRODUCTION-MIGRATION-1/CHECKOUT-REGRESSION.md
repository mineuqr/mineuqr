# CHECKOUT-REGRESSION.md

## Production data

`subscription_plans` 30001–30003 were **not** modified by 0086 or bootstrap.

| ID | nameEn | priceMonthly | priceYearly |
|----|--------|--------------|-------------|
| 30001 | Basic Plan | 19.00 | 175.00 |
| 30002 | Professional Plan | 39.00 | 349.00 |
| 30003 | Enterprise Plan | 99.00 | 899.00 |

`createCheckoutSession` / `createTapCheckout` still load `getSubscriptionPlanById(input.planId)` and charge `plan.priceMonthly` / `plan.priceYearly`. Checkout identity remains integer `30001`–`30003`.

## Tests

`createCheckoutSession` cases in `server/subscription.test.ts` and `server/payment-flow.test.ts` **passed**.

Three **pre-existing mock-isolation** failures (not introduced by this migration SQL):

| Test | Cause |
|------|--------|
| `subscription.listPlans` | `listPlans` hydrates live catalog via `getDb`, which the test mock does not export |
| `payment-flow` list plans | same |
| `checkTrialStatus` | entitlement hub calls `getSubscriptionCommercialBinding` → `getDb` |

Charge path does not use those hydrates. Failures are test-mock gaps from the earlier live-plan `listPlans` adoption (`SIMPLIFICATION-1`), not a change to checkout amounts or plan IDs in this program.

## Dual-book residual (unchanged policy)

After application deploy, `subscription.listPlans` **prefers** live catalog offerings when `legacyPlanId` is set (now true for the three bootstrapped plans). Displayed list prices would then be catalog USD (0.00 / 26.40 / 79.73) while **checkout still charges** 19 / 39 / 99 from `subscription_plans`.

This program did **not** redesign checkout. Closing the dual book is a separate billing program.
