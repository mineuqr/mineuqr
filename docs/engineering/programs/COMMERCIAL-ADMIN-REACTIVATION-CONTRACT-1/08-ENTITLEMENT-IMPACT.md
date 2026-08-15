# 08 — ENTITLEMENT IMPACT

Authority: `user_subscriptions.planId` → Live Plan → capabilities. Concession does not downgrade.

## When entitlement turns on (contract)

Only after the Reactivation persist succeeds:

- Paid: status `active` + future `currentPeriodEnd` + Snapshot N+1 committed
- Free: status `active` + concession current + period end = concession `endsAt`

Selected Live Plan UUID (not the catalog default, not `subscription_plans`) controls capabilities.

## Incomplete success — forbidden

| Failure | Required outcome |
|---------|------------------|
| Snapshot persist fails | Must not return paid success. Must not leave entitled paid row without snapshot. Classification A transaction or compensate-delete/revert (same class as paid create). |
| Concession persist fails (free) | Must not leave entitled free row without concession. |
| Activation fails after snapshot insert | Transaction rollback (preferred) so no orphan Snapshot N+1 on a still-canceled row. |

Today’s status-only update **violates** this: entitlement can return with no new snapshot and no concession.

## Plan identity

Uses the **newly selected** Live Plan UUID on the Reactivation command (defaults to the row’s current `planId` if Admin does not change it). Original historical plan on Snapshot #1 is irrelevant to entitlement.
