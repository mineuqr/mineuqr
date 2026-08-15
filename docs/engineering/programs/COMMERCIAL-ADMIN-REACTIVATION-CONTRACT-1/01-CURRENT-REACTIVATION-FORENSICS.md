# 01 — CURRENT REACTIVATION FORENSICS

**There is no `reactivate` procedure.** No dedicated service, no dedicated audit event, no dedicated UI action.

## Paths that can write `user_subscriptions.status = active`

| Path | Auth | Financial write | Classification |
|------|------|-----------------|----------------|
| `admin.updateUserSubscriptionByAdmin` with `status=active` | `assertAdminAccess` | Snapshot **only if** plan or cycle also changes | **AMBIGUOUS / UNSAFE** implicit reactivate |
| `admin.createUserSubscriptionByAdmin` after not-entitled | `assertAdminAccess` | Paid → Snapshot #1; free-first → concession only | Accidental **Model C** |
| PayPal / Tap webhook activation | provider webhook | Adoption may bind + snapshot (`webhook_bind`) | **Not Admin Reactivation** |
| Free-first create | `assertAdminAccess` | Concession, no snapshot | Create, not reactivate |

Restaurant-scoped Admin procedures are retired throws after `assertAdminAccess`. They are not a bypass.

## Implicit Admin path (the GAP)

UI: Customer Success edit dialog → status select includes `active` → `updateUserSubscriptionByAdmin`.

Runtime: `applyAdminUserSubscriptionUpdate`.

If **only** status (and optionally `subscriptionEndDate`) change:

1. No `resolveChargedTermsForAdminCreate`
2. No `applyAdminCommercialIdentityChange`
3. No new Charged Terms row
4. `updateSubscriptionById` writes `status=active` (and period end if sent)
5. Audit: `subscription_updated_by_admin` only

If plan or cycle **also** changes and **no current concession**:

- Transaction inserts Snapshot N+1 at **then-current** Live Plan offer (`admin_update`)
- That is a new commitment, but it is labeled as a generic update, not Reactivation

If plan or cycle changes **while a concession is current**:

- Identity only. No snapshot.

## Create-after-termination (accidental Model C)

`ownerHasEntitledAccountSubscription` is false for canceled / read-time expired.

Create is therefore **allowed**. It inserts a **new** `user_subscriptions` row. The old row remains. `pickUserLevelSubscription` prefers entitled rank 0.

## What does **not** happen today

- No reuse justification as continuation
- No refusal of status-only revive
- No dedicated snapshot source `admin_reactivate`
- No restoration of a cancelled concession
- Grant/revise/cancel concession **reject** `canceled` / `expired` (`invalid_status`)
