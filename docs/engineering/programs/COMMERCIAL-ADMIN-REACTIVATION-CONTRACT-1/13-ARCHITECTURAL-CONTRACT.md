# 13 — ARCHITECTURAL CONTRACT

This is the authoritative Admin Reactivation contract. It is **not implemented**.

## Definition

**Admin Reactivation** = a new commercial commitment (paid or free) that returns an existing **account-level** subscription row to an entitled `active` state.

It is **not** continuation of a cancelled or expired paid commitment.

## Locked rules

1. Reuse the existing `user_subscriptions` row (`restaurantId = 0`).
2. Do **not** create a second account-level row when one already exists.
3. Paid Reactivation **must** INSERT Charged Terms Snapshot N+1 from `currentPriceForPlan(selectedPlan, selectedCycle)` at `effectiveFrom=now`.
4. Historical snapshots are never updated or deleted.
5. Old snapshot reuse as live authority after termination is **forbidden**.
6. Amount `<= 0` is rejected. No $0 snapshot.
7. Yearly uses the yearly Live Plan offer.
8. Free Reactivation **must** persist a new concession from `now`. No Charged Terms. MRR = 0.
9. Free must not silently become paid.
10. Cancelled concessions are not restored.
11. Entitlement must not succeed if the required snapshot or concession failed.
12. `currentPeriodEnd` must be in the future (Admin-supplied or cycle-derived, same helper family as paid create).
13. Plan UUID and cycle are explicit command inputs.
14. Dedicated Admin procedure + `assertAdminAccess`.
15. Generic `updateUserSubscriptionByAdmin` must reject `canceled|expired → active`.
16. `createUserSubscriptionByAdmin` must CONFLICT if an account-level row already exists (entitled or not).
17. Duplicate Reactivation while already entitled with matching current snapshot is idempotent.
18. Audit: `commercial_subscription_reactivated` (see `10-RBAC-AND-AUDIT.md`).
19. Binding leftover is not price authority.
20. `subscription_plans` is not identity or price authority.
21. Webhook activation is out of scope (separate paid path).
22. Paid Admin **create** (no existing row) remains supported unchanged.
23. OD-4 / SAFE DELETE remain blocked.

## Atomicity

Paid: Classification **A** (one transaction: snapshot + identity + Binding `planId`).  
Free: Classification **A** preferred; **B** compensate only if success cannot be returned without the concession.

## Delete interaction

Delete still removes the subscription row and leaves snapshots/bindings/concessions. Reactivation requires the row to exist. After delete, the only legal Admin path is **create** (new row), not Reactivate. SAFE DELETE remains a future program.
