# 11 — TEST RESULTS

Command (2026-08-15):

```
pnpm exec vitest run
  server/subscription.test.ts
  server/payment-flow.test.ts
  server/subscriptionAudit.test.ts
  server/create-trial-subscription.test.ts
  server/trial-and-webhook.test.ts
  server/commercial-catalog/__tests__/od3PublicApiUuid.test.ts
  server/commercial-catalog/__tests__/od3PublicApiUuid.guards.test.ts
  server/commercial-catalog/__tests__/commercialCheckoutLivePlanOffer.test.ts
  server/commercial-catalog/__tests__/resolveCanonicalLivePlanId.test.ts
  server/commercial-catalog/__tests__/subscriptionPlansResidual.guards.test.ts
  server/commercial-catalog/__tests__/livePlanIdentity.guards.test.ts
  server/admin-invoice-billing.test.ts
  server/admin-subscription.test.ts
  server/admin-auth-1e.test.ts
  server/commercial/authorityCleanup1.test.ts
  server/subscription-invoice-verification.test.ts
```

| Metric | Value |
|--------|-------|
| files | 16 |
| tests | 112 |
| passed | 112 |
| failed | 0 |
| duration | 40.74s |
| vitest | 2.1.9 |

## Coverage vs required minimum

| Area | Covered by |
|------|------------|
| UUID input | `od3PublicApiUuid.test.ts` |
| malformed UUID | same |
| unknown UUID | same |
| integer rejection | same + guards |
| checkout | `commercialCheckoutLivePlanOffer.test.ts`, payment-flow, subscription |
| pricing | checkout offer + public catalog guards |
| admin | admin-subscription, admin-invoice-billing, authorityCleanup1 |
| Customer Success | OD-3 guards (`id: o.planId`, no `parseInt`) |
| trial | `create-trial-subscription.test.ts` |
| PayPal | `trial-and-webhook.test.ts`, paypal UUID write guard |
| Tap | webhook residual + OD-3 guards |
| DTO | listPlans / offering UUID guards |
| subscription | `subscription.test.ts`, `subscriptionAudit.test.ts` |
| compatibility | webhook dual-read tests |
| bridge guards | `od3PublicApiUuid.guards.test.ts` (bridges remain) |
| architecture | `livePlanIdentity.guards.test.ts`, `subscriptionPlansResidual.guards.test.ts` |

## Architecture guards (all passed)

1. UUID is canonical — GUARD-IDENTITY-01  
2. No new integer writer — routers have no `planId: z.number()`  
3. Public plan identity is UUID — OD-3 guards + live API  
4. `subscription_plans` is not a commercial authority — residual guards  
5. Checkout uses Live Plan Offer List Price — GUARD-IDENTITY-02/03  
6. MRR uses Charged Terms — GUARD-IDENTITY-06  
7. Legacy webhook read remains supported — dual-read tests  
8. OD-4 bridges remain untouched — leftover-bridge guard  

## Decision

**TEST GATE: PASS**
