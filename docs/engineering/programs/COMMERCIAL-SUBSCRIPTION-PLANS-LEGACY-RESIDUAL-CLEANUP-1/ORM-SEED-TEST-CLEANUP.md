# ORM-SEED-TEST-CLEANUP

## ORM / schema

`drizzle/schema.ts` still defines `subscription_plans`. Historical migrations 0000–0006 remain. **No DROP TABLE.**

`db.ts` retains `getSubscriptionPlans` / `getSubscriptionPlanById` / `createSubscriptionPlan` as unused ORM helpers. They are **not** commercial authority. No application router calls them after this program.

## Seeds / scripts (not executed)

| Artifact | Class | Action |
|----------|-------|--------|
| `server/seed-plans.mjs` | H | Retained — emergency bridge repair; do not run on production |
| `scripts/clean-db-2-execute.mjs` preserve list | H | Still keeps the table |
| `scripts/production-operational-data-reset.mjs` | H | Lists the table |
| Historical `_snapshot.mjs` / `_readonly-select.mjs` | H / F | Forensics only |

## Tests

Updated: subscription DTO, payment-flow, trial, webhooks, invoice, CRS, KPI, residual guards.

Leftover `getSubscriptionPlanById` **mocks** remain in older suites (G). They do not restore runtime authority.
