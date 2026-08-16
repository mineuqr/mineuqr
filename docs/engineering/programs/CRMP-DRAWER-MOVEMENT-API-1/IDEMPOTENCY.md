# IDEMPOTENCY

## Chosen scope

```
restaurantId
+ registerId
+ financialShiftId (server-resolved active shift)
+ actorUserId (authenticated)
+ idempotencyKey
```

Hash → deterministic `movementId` (`mov_` + SHA-256 hex).

Existing unique index `crmp_drawer_movements_movement_id_unique` is the persistence constraint. **No new column.**

## Behavior

| Case | Result |
|------|--------|
| First request | Append movement, bump shift version |
| Exact retry (same key + equivalent type/amount/reason) | Return original movement; `alreadyApplied: true`; no second financial effect |
| Same key, conflicting payload | `CrmpConflictError` |
| Concurrent duplicate same key | OCC: loser reloads; equivalent movement → alreadyApplied |

`recordedAt` is not part of equivalence so a retry after simulated failure may carry a different `at`.

Internal `recordMovement` without `movementId` still mints a new id (legacy internal callers). The public API always supplies the derived id.
