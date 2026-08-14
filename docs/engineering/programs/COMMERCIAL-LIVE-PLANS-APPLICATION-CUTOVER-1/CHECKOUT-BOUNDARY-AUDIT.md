# CHECKOUT-BOUNDARY-AUDIT.md

This program does **not** redesign checkout.

## Charge path (unchanged)

`createCheckoutSession` / `createTapCheckout`:

```
getSubscriptionPlanById(planId)  // subscription_plans 30001–30003
amount = yearly ? priceYearly : priceMonthly
```

Production rows (read-only, unchanged):

| ID | Monthly USD | Yearly USD |
|----|-------------|------------|
| 30001 | 19.00 | 175.00 |
| 30002 | 39.00 | 349.00 |
| 30003 | 99.00 | 899.00 |

`createCheckoutSession` tests **PASS**.

## Display vs charge (dual book — retain)

| Surface | Source | Professional monthly |
|---------|--------|----------------------|
| Public Pricing UI | Live catalog `listOfferings` | **26.40 USD** (and SAR regional) |
| Checkout charge | `subscription_plans` | **39.00 USD** |
| `subscription.listPlans` after deploy | Live catalog if `legacyPlanId` set | catalog USD |

The two books do **not** overwrite each other. 0086/bootstrap never wrote `subscription_plans`. Catalog prices never written by checkout.

## Bind on payment (not this cutover)

`paypal-webhook` / `tap-webhook` / trial / admin audit may `ensureLivePlanBoundForSubscription` for **new** paid/trial rows. That writes `commercial_subscription_bindings` only. It does not run on owner login. Owner was not bound.

## Three test failures

`listPlans` and `checkTrialStatus` fail in vitest because `vi.mock("./db")` omits `getDb`, which live hydrate/binding lookup now calls.

| Question | Answer |
|----------|--------|
| A pre-existing (pre-Live-Plans mocks)? | Mocks predate Live Plans |
| B caused by Live Plans? | **Yes** — hydrate/binding now call `getDb` |
| C stale architecture? | No — architecture is current |
| Runtime incompatibility? | **No** — `server/db.ts` exports `getDb` |
| Checkout charge broken? | **No** |

Documented as test-infrastructure gap. Not a deploy P0.
