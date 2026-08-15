# TRANSACTION / COMPENSATION MODEL

**Classification: B — compensation / rollback-by-delete.**

This is **not** a database transaction (`BEGIN…COMMIT`). Do not call the create path “atomic.”

Existing writers (`createSubscriptionForRestaurant`, Binding insert) each call `getDb()` separately. This program does **not** add a new transaction framework.

## Implemented sequence

1. Resolve Charged Terms in memory (no row yet).
2. Insert `user_subscriptions` → `result.id` = that insert’s `insertId`.
3. Insert Binding + Charged Terms for `result.id`.
4. If step 3 fails: `deleteUserSubscriptionById(result.id)` then throw. Success is never returned.

## Compensating delete safety

`deleteUserSubscriptionById(id)` is an unconstrained PK delete. Safety is **call-site**:

- Sole production caller: `applyAdminUserSubscriptionCreate` catch after persist failure.
- Argument is always `result.id` from the insert performed in that same invocation.
- `user_subscriptions.id` is AUTO_INCREMENT. Concurrent Admin creates receive different ids.
- Historical rows (including 780001) are not that `insertId`.
- The helper is not used by Admin update or Admin delete (`deleteSubscriptionCascade` remains the owned delete path).

Bindings have **no FK** to `user_subscriptions` (unique on `subscriptionId` only). Compensating delete of the subscription row does not cascade-delete Bindings.

`persistAdminCreateChargedTerms` incomplete-write cleanup deletes Bindings `WHERE subscriptionId = input.subscriptionId` (the same `result.id`). Unique index prevents that delete from matching another subscription’s Binding.

## Failure modes

| Failure | Client result | Row left behind |
|---------|---------------|-----------------|
| Invalid offer (before insert) | PRECONDITION_FAILED | none |
| Subscription insert fails | error | none |
| Binding persist fails, compensate succeeds | PRECONDITION_FAILED | none |
| Binding persist fails, compensate fails | PRECONDITION_FAILED | possible orphan **lifecycle** row **without** success response |
| Insert Binding succeeds, read-back incomplete, Binding cleanup succeeds, compensate succeeds | PRECONDITION_FAILED | none |
| Insert Binding succeeds, read-back misses (`written == null`), Binding cleanup skipped, compensate succeeds | PRECONDITION_FAILED | possible orphan **Binding** for the deleted `subscriptionId` (dead unique key; cannot attach to a later AUTO_INCREMENT id) |
| Persist succeeds, later notification fails | success (notification is non-critical) | complete financial rows |

No silent financially incomplete **success**. An incomplete lifecycle row can exist only if compensate itself fails; the client still receives `PRECONDITION_FAILED`.
