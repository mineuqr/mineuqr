# LEGACY-ID-DEPENDENCY-MATRIX

| Reference | Class | Why needed | Replace with Live Plan now? |
|-----------|-------|------------|-----------------------------|
| `user_subscriptions.planId` | B | Stored integer | **No** — schema |
| `bindings.legacyPlanId` | B | Bind audit/compat | Not required for capabilities (binding.planId UUID is) |
| `bindings.planId` | A | Live Plan UUID | Already canonical |
| `LEGACY_PLAN_BRIDGE` | B | Integer ↔ code | **No** — still required |
| `PLAN_ID_TO_CATALOG_PLAN` | B | Duplicate map | Same integers |
| Checkout `planId: number` | B / I | Public API | **No** — consumers |
| Offering `legacyPlanId` | B / I | Pricing checkout | **No** |
| Offering `planId` string | A | Live Plan UUID | Already present |
| Trial integer | B | Writes subscription column | **No** |
| Webhook integer | B | Echo of checkout | Changes with checkout |
| PayPal/Tap charge ids | F | Provider | Keep |
| Invoice / check / order ids | E / F | Financial | Keep |
| Subscription row `id` | D | Customer sub | Keep |
| Test `30002` | H | Fixtures | Keep until cutover |
| `subscription_plans.id` helpers | I / B | Unused by routers | ORM residual |

A = canonical internal · B = legacy compat · C = provider plan · D = subscription · E = financial doc · F = payment tx · G = historical · H = test · I = obsolete · J = unknown
