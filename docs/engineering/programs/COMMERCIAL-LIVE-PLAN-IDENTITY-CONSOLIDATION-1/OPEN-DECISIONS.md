# OPEN-DECISIONS

| ID | Decision | Why this program stopped |
|----|----------|--------------------------|
| OD-1 | Subscription FK = `commercial_plans.id` vs `code` | UUID vs stable code |
| OD-2 | Approve ALTER of `user_subscriptions.planId` | Destructive-adjacent |
| OD-3 | Approve public `planId: number` → canonical id | Breaking first-party API |
| OD-4 | Retire `PLAN_ID_TO_CATALOG_PLAN` with the bridge | Duplicate map |
| OD-5 | Production re-read of current planId values | Not executed here |

Not opened: SAFE DELETE, Payment Provider, Tax, FX, Refund, POS.
