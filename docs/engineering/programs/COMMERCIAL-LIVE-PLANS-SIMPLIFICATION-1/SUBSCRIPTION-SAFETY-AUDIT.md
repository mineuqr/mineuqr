# SUBSCRIPTION-SAFETY-AUDIT.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14  
**Production DB:** not mutated in this review

## Lifecycle vs commercial plan

Access still depends on `user_subscriptions` status + period (`lifecycleSync` / `resolveSubscriptionEntitlement`):

| Subscriber | Expected after live-plan cutover (if binding+plan hydrate succeed) |
|------------|---------------------------------------------------------------------|
| Active Basic / Professional / Enterprise | Entitled; capabilities from **current** live plan bundle/limits |
| Expired | `plan: NONE` / not entitled — period elapsed, not catalog versioning |
| Canceled | Not entitled while cancelled |
| Trial | Trial lifecycle + live Professional capabilities if bound to professional plan |
| Billing cycle in progress | Same subscription row; charged terms on binding if populated |
| Historical invoice | Invoice row untouched (separate table) |

## Binding cutover hazards

1. **0086 DELETE unmatched bindings** → those users become unbound → `planFeatureMatrix`, not live plan. Features may differ (e.g. Basic matrix includes `ordering` while a live Basic bundle might not).
2. **Binding exists, live plan missing after hydrate** → **fail-closed** (no access). Worse than today’s snapshot-unreadable fail-closed only if hydrate drops plan identity.
3. **chargedAmount NULL after JSON copy** → capabilities still live; **displayed/charged commercial terms become current list price**. Policy 6 violated.

## Invoice / payment

- `createInvoice` in `server/routers.ts` still uses `subscription_plans.priceMonthly` / `priceYearly`.
- Invoice tests: `server/admin-invoice-billing.test.ts` 5 passed; `server/subscription-invoice-verification.test.ts` 11 passed.
- This program did not alter invoice schema or update paths.

Checkout/renewal **list** price for payment capture remains the legacy plan table. Live catalog charged terms are written only on catalog bindings at bind/renew. Dual price SSOT is **pre-existing** and out of checkout-redesign scope; it is residual inconsistency, not a new freeze.

## Simulated cases (no production writes)

In-memory AA tests plus existing lifecycle tests cover active grant, trial grant, expired/canceled deny, fail-closed unreadable plan. They do **not** exercise MySQL 0086 against production rows.

**Do not apply 0086 until a staging copy of production bindings is backfilled and counted.**
