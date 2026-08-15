# TEST-PLAN

Implemented now:

| # | Proof | How |
|---|-------|-----|
| 6 | Checkout remains Live Plan | Existing checkout tests + guards |
| 7 | MRR remains Charged Terms | Existing MRR tests + guards |
| 10 | No `subscription_plans.price` on commercial paths | Residual + identity guards |
| 11 | Legacy id is not commercial authority | GUARD-IDENTITY-03…06 |
| 12 | Bridge removed | **Not done** — still required |
| 18 | No third identity table | GUARD-IDENTITY-07 |

Deferred until cutover: 1–5, 8–9, 13–17 (subscription column / API identity).

## Execution (2026-08-15)

```
pnpm exec vitest run
  server/commercial-catalog/__tests__/livePlanIdentity.guards.test.ts
  server/commercial-catalog/__tests__/subscriptionPlansResidual.guards.test.ts
  server/commercial-catalog/__tests__/commercialCatalogAdoption.guards.test.ts
  server/commercial-catalog/__tests__/commercialCheckoutLivePlanOffer.test.ts
  server/commercial/metrics/__tests__/canonicalMrrChargedTerms.guards.test.ts
  server/commercial/metrics/CanonicalMetricsService.test.ts
  server/commercial/metrics/chargedTermsMrr.test.ts
  server/create-trial-subscription.test.ts
  server/subscription.test.ts
  server/payment-flow.test.ts
  server/trial-and-webhook.test.ts
  server/admin-invoice-billing.test.ts
  server/subscriptionPlanLimits.test.ts
  server/commercial/getCommercialEntitlements.test.ts
  server/subscription-runtime/__tests__/subscriptionRuntimeEntitlement.enforcement.test.ts
  server/subscription-runtime/__tests__/subscriptionRuntimeEntitlement.guards.test.ts
  server/commercial-catalog/__tests__/commercialCatalogPublicPublishing.test.ts
  server/invoices-notifications.test.ts
  server/subscriptionAudit.test.ts
  server/commercial/reporting/CommercialReportService.test.ts
```

**Result: 20 files passed, 165 tests passed, 0 failed.**

```
pnpm build
```

**Result: exit 0.**
