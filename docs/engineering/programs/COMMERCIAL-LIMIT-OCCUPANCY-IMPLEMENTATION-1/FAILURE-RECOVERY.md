# FAILURE RECOVERY

## Fail closed

| Failure | Behavior |
|---------|----------|
| `decide.allowed === false` | `CommercialLimitExceededError`; ROLLBACK |
| Missing / unsupported limit key | `checkLimit` already returns deny (`limit_key_unsupported` / `not_entitled`); occupancy treats as exceed |
| `getDb()` unavailable | `CommercialOccupancyUnavailableError` (mapped to FORBIDDEN / POS entitlement denied) |
| Domain insert throws | ROLLBACK; occupancy unchanged |
| Deadlock 1213 / lock wait 1205 | retry whole transaction up to 3 times; then propagate |
| Missing lock row | INSERT creates it; SELECT FOR UPDATE then proceeds |

Missing limit is **never** interpreted as unlimited. Unlimited remains only the existing `checkLimit` `cap === null` policy.

## Retry after failure

Concurrency suite: create with cap 0 fails; subsequent create with cap 1 succeeds. The lock row is reusable; failed transactions do not consume occupancy.

## Deadlock / lock wait

Local retry in the occupancy helper. Does **not** import Order business-identity retry. No custom application-level spinlock.

`innodb-lock-wait-timeout=5` on the occupancy test container so tests fail fast if serialization is broken.

## Subscription unavailable / expired

Existing `checkLimit` / lifecycle semantics unchanged. Occupancy calls `decide` after the lock; expired / `plan === "NONE"` still deny. No new freeze or downgrade policy.

## Idempotent duplicate

If the domain supplies `resolveExisting`, a duplicate after the lock returns the existing row without COUNT+INSERT. POS same-code register uses this. Restaurant/category/item creates remain non-idempotent (existing product behavior).
