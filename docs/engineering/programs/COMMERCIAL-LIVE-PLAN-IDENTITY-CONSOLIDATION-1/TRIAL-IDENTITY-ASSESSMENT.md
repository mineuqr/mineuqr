# TRIAL-IDENTITY-ASSESSMENT

Trial policy (14-day Professional) unchanged.

Identity path:

1. Catalog trial policy → `legacyPlanId` (integer) + `professionalPlanId` (UUID)
2. Fallback: `LEGACY_PLAN_BRIDGE` professional **30002**
3. Row write: `user_subscriptions.planId = integer`
4. Bind: Live Plan UUID + `legacyPlanId`

The integer exists because the subscription column is int. Replacing trial with UUID-only requires that column change.

Do not change trial business policy here.
