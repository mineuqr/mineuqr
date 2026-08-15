# BINDING COMPLETION

For every successful Admin create:

- `binding.planId` = Live Plan UUID
- `legacyPlanId` = `null` (compatibility column unused by the new writer)
- unique `subscriptionId` — at most one Binding

Insert-only. No `onDuplicateKeyUpdate`. Existing different terms → `historical_terms_immutable`.

No FK from Binding → `user_subscriptions`. Incomplete-write cleanup deletes only `WHERE subscriptionId =` the current Admin create id. Unique index prevents deleting another subscription’s Binding.

Webhook bind path is unchanged (still fail-soft, still may default monthly).

Binding remains **not** a prerequisite for entitlement.
