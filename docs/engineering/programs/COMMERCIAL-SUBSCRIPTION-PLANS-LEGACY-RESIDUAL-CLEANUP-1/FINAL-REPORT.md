# FINAL-REPORT

**Program:** COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-CLEANUP-1  
**Date:** 2026-08-15

## A. STATUS

**LEGACY RESIDUAL CLEANUP — COMPLETE**

SAFE DELETE remains **NO**.

## B. BEFORE

`subscription_plans` still supplied listPlans fallback, subscription DTO plan rows, CRS unbound names, trial sortOrder fallback, PayPal/Tap plan reads, admin invoice prices, notification names, and deprecated `computeAdminMrr`.

## C. AFTER

```
LIVE PLANS → identity / capabilities / limits / offer price
     ↓
CHECKOUT (unchanged)
     ↓
SUBSCRIPTION (lifecycle + integer compatibility id)
     ↓
CHARGED TERMS → MRR / admin invoice amount
```

`subscription_plans` is no longer a commercial runtime authority.

## D. REMOVED

listPlans table fallback; CRS/DTO/webhook/notification/trial table reads; PayPal price fallback; `computeAdminMrr` / `monthlyEquivalentPlanPrice`; `getRevenueByMonth` plan-price sum; `SelectSubscriptionPlan` limits type.

## E. MOVED

| From table | To |
|------------|----|
| Plan display name | Live Plan / bridge |
| DTO catalog price/limits | Live Plan view |
| Invoice amount | Charged Terms |
| `admin.getStatistics.totalRevenue` | Canonical MRR |
| Trial fallback id | `LEGACY_PLAN_BRIDGE` 30002 |
| Webhook existence | Known legacy id (bridge) |

## F. RETAINED

Integer `planId` / `legacyPlanId` / `LEGACY_PLAN_BRIDGE`; ORM table + unused helpers; seeds/scripts; leftover test mocks; historical docs/ADRs.

## G. LEGACY IDENTITY

**Remains.** Compatibility only. Not price/capability/limit/MRR authority.

## H. WEBHOOKS

No `getSubscriptionPlanById`. Settlement unchanged.

## I. ADMIN / DTO / INVOICE / NOTIFICATION

DTO + notifications → Live Plan. Invoice amount → Charged Terms (fail closed if missing).

## J. LIMITS / TRIAL / STATISTICS

Limits: hub only. Trial: no table. Statistics: canonical MRR; sunset monthly revenue = 0.

## K. DATABASE

Table + schema + helpers remain. No DROP TABLE.

## L. TESTS

**21 files, 137 tests, all passed** (`exit_code: 0`).

## M. BUILD

`pnpm build` — **exit_code: 0**.

## N. FINAL DEPENDENCY SCAN

See [FINAL-DEPENDENCY-SCAN.md](./FINAL-DEPENDENCY-SCAN.md). No unexplained commercial read.

## O. SAFE DELETE READINESS

**NO.** Separate program required.

## P. ADR IMPACT

034 / 035 / 036: no amendment. Implementation aligned. Stale governance sentences optional later.

## Q. GIT

| Item | Value |
|------|-------|
| HEAD | `4fdfd8f6` — feat(commercial): migrate mrr to charged terms |
| Modified | routers, db, CRS, trial, webhooks, catalog helpers, limits, KPI, related tests |
| Untracked | this program package + `subscriptionPlansResidual.guards.test.ts` |
| Commit / Push / Deploy | **None** |
