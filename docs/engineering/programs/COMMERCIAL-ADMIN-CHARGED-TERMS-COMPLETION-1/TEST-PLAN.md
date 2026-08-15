# TEST PLAN

| # | Case | Coverage |
|---|------|----------|
| 1 | Admin monthly | `adminChargedTermsCompletion.test.ts` + `subscriptionAudit.test.ts` persist call |
| 2 | Admin yearly | resolve yearly amount + MRR /12; persist writes `billingCycleCode: yearly`; audit persist call |
| 3 | Invalid cycle | `weekly` / `""` → `invalid_billing_cycle` |
| 4 | Missing amount | fail closed |
| 5 | Missing currency | fail closed |
| 6 | Missing Live Plan | fail closed |
| 7–8 | Binding / incomplete write | persist throws; incomplete write deletes this subscription’s Binding; create compensates `result.id` |
| 9 | Retry identical terms | no second insert |
| 10 | Price source | `currentPriceForPlan(planId, cycle)` |
| 11 | `subscription_plans` independence | source guard |
| 12 | MRR independence | `chargedTermsMrr` + missing terms = 0 |
| 13 | Entitlement independence | hub has no Charged Terms persist |
| 14 | Historical immutability | different existing terms rejected |
| 15 | Admin update | no persist / no `ensureLivePlanBound` |

Guards: `adminSubscriptionChargedTermsIntegrity.guards.test.ts`.

Related suites run: `subscriptionAudit`, `authorityCleanup1`, `admin-invoice-billing`, `admin-auth-1e`, `trial-and-webhook`, `chargedTermsMrr`, `canonicalMrrChargedTerms.guards`, `commercialSnapshotRuntimeAuthority`.

`GUARD-IDENTITY-03` stale comment-string assertion was corrected to the architecture checks (`currentPriceForPlan`, not `getSubscriptionPlanById` / `legacyPlanId` / `priceMonthly`). Assertion was not weakened.
