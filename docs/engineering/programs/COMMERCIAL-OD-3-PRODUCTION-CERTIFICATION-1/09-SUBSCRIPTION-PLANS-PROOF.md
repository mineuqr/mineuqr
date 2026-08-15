# 09 — SUBSCRIPTION PLANS PROOF

Production table **exists**. It was **not dropped**.

| Fact | Value |
|------|-------|
| Table exists | YES (BASE TABLE) |
| Row count | 3 |
| IDs | 30001, 30002, 30003 (all `isActive`) |
| FKs referencing it | none |
| FKs from it | none |

Three leftover rows are not a certification failure.

## Runtime commercial authority

| Concern | Uses leftover table? |
|---------|----------------------|
| Subscription identity | NO — `user_subscriptions.planId` is Live Plan UUID |
| Checkout price | NO — `currentPriceForPlan` |
| MRR | NO — Charged Terms |
| Entitlements | NO — Live Plan / hub |
| New public/admin writers | NO |
| Webhook activation | NO — `resolveCanonicalLivePlanId` |

Guards: `subscriptionPlansResidual.guards.test.ts` (9) and `livePlanIdentity.guards.test.ts` (6) — all passed.

ORM / seeds / reset KEEP remain. SAFE DELETE is a separate program.

## Decision

**subscription_plans GATE: PASS**  
NOT DELETED. NO RUNTIME AUTHORITY.
