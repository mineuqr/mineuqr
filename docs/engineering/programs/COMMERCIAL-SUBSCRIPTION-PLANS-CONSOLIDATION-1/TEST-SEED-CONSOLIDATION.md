# TEST-SEED-CONSOLIDATION.md

## Seeds / scripts

| Artifact | Action |
|----------|--------|
| `server/seed-plans.mjs` | Deprecated emergency wipe+insert. **Recommend replace/delete** in SAFE DELETE — do not run |
| `update-plans-features.mjs` | One-off. **Recommend delete** when table drops |
| Reset scripts preserve list | Update when table drops |

Fixtures can be regenerated from Live Plan + `LEGACY_PLAN_BRIDGE`. Do not keep the table solely for tests.

## Tests updated this program

| File | Change |
|------|--------|
| `commercialCheckoutLivePlanOffer.test.ts` | **Added** — Live Plan offer 26.40 / fail-closed |
| `commercialCatalogAdoption.guards.test.ts` | Checkout must not call `getSubscriptionPlanById` |
| `payment-flow.test.ts` | Mocks `resolveCheckoutOfferFromLivePlan` |
| `subscription.test.ts` | Same |

## Tests still representing legacy architecture (not rewritten)

MRR, admin invoice, webhook, CRS, statistics tests still mock `getSubscriptionPlanById` / `getSubscriptionPlans`. They block SAFE DELETE §13 until those programs run. **Do not rewrite them merely to pass.**
