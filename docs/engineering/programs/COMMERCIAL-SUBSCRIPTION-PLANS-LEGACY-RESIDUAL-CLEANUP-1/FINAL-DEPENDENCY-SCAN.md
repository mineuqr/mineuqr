# FINAL-DEPENDENCY-SCAN

Literal `subscription_plans` after implementation. Every hit classified.

| Remaining Reference | Owner | Runtime? | Why Remaining | Safe to Remove? |
|---------------------|-------|----------|---------------|-----------------|
| `drizzle/schema.ts` table | ORM | Schema only | Persistence until SAFE DELETE | No (this program) |
| `drizzle/0000–0006` + meta snapshots | Migrations | No | History | No |
| `drizzle/0086` / `0087` comments | Migrations | No | “does not touch” comments | N/A |
| `db.getSubscriptionPlans` / `ById` / `create` | ORM helpers | Callable, **unreferenced by routers** | Last table accessors | Future SAFE DELETE |
| `LEGACY_PLAN_BRIDGE` comment | Identity | Yes (map only) | Integer ↔ Live Plan code | When APIs drop integers |
| `user_subscriptions.planId` | Subscription | Yes | Compatibility handle | When APIs drop integers |
| `bindings.legacyPlanId` | Binding | Yes | Bind key | Same |
| `server/seed-plans.mjs` | Script | If executed | Emergency repair | Future |
| Reset / clean-db preserve lists | Script | If executed | Keep table | Future |
| Historical program forensics / ADRs | Docs | No | Record | Keep |
| Architecture guards (negative strings) | Tests | No | Prevent regression | Keep |
| Leftover test mocks | Tests | No | Fixture inertia | Optional later |
| `planIdMapping.ts` comment | Identity docs | No | Maps integer → catalog key | With bridge |

**No unexplained application commercial read remains.**
