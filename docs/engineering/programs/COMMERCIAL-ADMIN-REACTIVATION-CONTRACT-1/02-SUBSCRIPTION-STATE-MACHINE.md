# 02 — SUBSCRIPTION STATE MACHINE

## Durable DB enum (`user_subscriptions.status`)

`trial | active | canceled | expired`

There is no `pending` / `reactivated` durable status.

## Read-time commercial projection (`syncCommercialLifecycle`)

| DB status | Period | Projected state | Entitled |
|-----------|--------|-----------------|----------|
| `canceled` | ignored | `cancelled` (`db_canceled`) | **false immediately** |
| `expired` | ignored | `expired` (`db_expired`) | false |
| `trial` | `now < trialEndsAt` | `trial` | true |
| `trial` | ended | `expired` (`trial_ended`) | false |
| `active` | `now < currentPeriodEnd` | `active` | true |
| `active` | `now >= currentPeriodEnd` | `expired` (`period_ended`) | false |

Expiry of an `active` row is **read-time**. No job writes `expired`.

## Current transitions that look like Reactivation

```
canceled  --update status=active-->  active     (implicit; may reuse old snapshot)
expired   --update status=active-->  active     (implicit; still expired if period past)
active+past-end --update end date--> entitled   (implicit; may reuse old snapshot)
canceled/expired --create new row--> new active (accidental Model C)
```

`active → active` via the same update procedure is used as a generic edit. When the prior commercial projection was **not entitled** (canceled, or `period_ended`), that write is **implicit reactivation**.

**Classification of implicit `* → active`: UNSAFE** as a commercial contract. It can restore entitlement without a new paid commitment and can resume MRR from a historical snapshot.

## Contract state machine (proposed — not implemented)

```
canceled paid     --reactivate paid-->     active + Snapshot N+1
expired paid      --reactivate paid-->     active + Snapshot N+1
canceled free     --reactivate free-->     active + new concession vN (no snapshot)
expired free      --reactivate free-->     active + new concession vN (no snapshot)
canceled/expired  --reactivate paid-->     active + Snapshot N+1
                    (even if history was free-first)

active entitled   --reactivate-->          IDEMPOTENT no-op
```

Generic `updateUserSubscriptionByAdmin` MUST NOT be the Reactivation operation.

Webhook checkout activation remains a **separate** paid-commitment path (`webhook_bind`), not Admin Reactivation.
