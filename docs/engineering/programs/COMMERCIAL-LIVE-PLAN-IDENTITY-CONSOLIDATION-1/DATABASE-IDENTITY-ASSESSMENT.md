# DATABASE-IDENTITY-ASSESSMENT

| Table | Plan identity | FK? |
|-------|---------------|-----|
| `commercial_plans` | UUID PK + unique `code` | — |
| `commercial_subscription_bindings.planId` | Live Plan UUID | Index, not formal FK |
| `commercial_subscription_bindings.legacyPlanId` | int nullable | No |
| `user_subscriptions.planId` | int | **No FK** to `subscription_plans` |
| `subscription_plans.id` | int PK | Orphan catalog leftover |

No DROP of `subscription_plans`. No ALTER executed.

A future cutover would need a controlled migration of `user_subscriptions.planId` after mapping proof. That is **not** this program.
