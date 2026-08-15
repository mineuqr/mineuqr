# COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-CLEANUP-1

| Field | Value |
|-------|-------|
| **Type** | Residual dependency cleanup (no table drop) |
| **Date** | 2026-08-15 |
| **Baseline** | `4fdfd8f6` — feat(commercial): migrate mrr to charged terms |
| **Prior programs** | COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1 · COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1 |
| **SAFE DELETE** | **NO** — ORM / helpers / seeds / scripts / tests remain |
| **Primary status** | See [FINAL-REPORT.md](./FINAL-REPORT.md) |

## Objective

Remove, replace, or formally classify every remaining `subscription_plans` **runtime commercial** dependency so a future SAFE DELETE program can decide.

## What this program did

| Area | Result |
|------|--------|
| `listPlans` fallback | **Removed** — catalog or empty |
| Subscription DTOs | **Live Plan view** |
| CRS unbound name | **Live Plan / bridge** |
| Trial table fallback | **Removed** — catalog then `LEGACY_PLAN_BRIDGE` |
| PayPal / Tap plan reads | **Removed** — identity + Live Plan name |
| Admin invoice amount | **Charged Terms** |
| Notification plan names | **Live Plan display** |
| `computeAdminMrr` | **Deleted** — `admin.getStatistics.totalRevenue` = canonical MRR |
| `getRevenueByMonth` | **No plan-table read** (sunset zeros) |
| `subscriptionPlanLimits` type | **Detached** from `SelectSubscriptionPlan` |
| Table drop | **Not performed** |

## STOP

Do not start SAFE DELETE, Payment Provider, Tax, FX, Refund, POS, or Pricing UI.
