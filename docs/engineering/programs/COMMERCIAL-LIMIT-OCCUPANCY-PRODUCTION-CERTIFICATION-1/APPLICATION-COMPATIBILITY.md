# APPLICATION COMPATIBILITY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**File:** `server/subscription-runtime/commercialLimitOccupancy.ts`  
**Redesign:** NONE

## Table used

`commercial_limit_occupancy_locks`

The helper writes `(scopeKind, scopeId, limitKey)` and reads the same key for `SELECT … FOR UPDATE`. That is exactly the Production PK.

## `withCommercialLimitOccupancy()` — certified sequence (unchanged)

1. `ensureCommittedLockRow` — committed `INSERT IGNORE` mutex row (TiDB serialization: FOR UPDATE locks the latest **committed** version).
2. Occupancy transaction `{ isolationLevel: "read committed" }`.
3. `SELECT scopeKind FROM commercial_limit_occupancy_locks WHERE … FOR UPDATE`.
4. Optional `resolveExisting` (POS code replay; no occupancy consumed).
5. Caller `countOccupancy` — canonical domain `COUNT(*)`.
6. `decide(proposedTotal)` → `checkLimit()`.
7. `isNewCapacityDenial` — occupancyDelta `0` + hard `limit_exceeded` is not a new-capacity denial (G-11).
8. Domain `create` inside the same transaction.
9. COMMIT. Deadlock / lock-wait retry up to 3; `CommercialLimitExceededError` is not retried.
10. Missing `getDb()` → `CommercialOccupancyUnavailableError`.

Unlocked path remains `NODE_ENV === "test"` without an injected db only.

## Live quantity wiring (deployment candidate)

| Path | Helper | Role semantics |
|------|--------|----------------|
| Restaurant create | `createRestaurantWithCommercialLimit` | Owner uses `ctx.user.id`. Admin resolves target owner, then the **same** helper / tenant cap. No role bypass. |
| Category create | `createCategoryWithCommercialLimit` | After `assertRestaurantAccess` + menu feature. Admin and owner share the tenant cap (G-09). |
| Item create | `createMenuItemWithCommercialLimit` | Same as categories. |
| POS register / reactivate | `withCommercialLimitOccupancy` `occupancyDelta = 1` | POS grants required; owner/admin/PLATFORM_OWNER are not cashier shortcuts. |
| POS replace | `occupancyDelta = 0` when provisioned | Slot-neutral, including over-cap if entitled. |
| PLATFORM_OWNER | G-09 **B** | Target tenant cap. `FULL_PLATFORM` is entitlement, not a quota bypass. Occupancy helper contains no `PLATFORM_OWNER` special case. |
| Onboarding | G-04 `assertOnboardingFirstRestaurantPermitted` | Helper not forced into the register transaction. |

Category/item `isActive` / `isAvailable` updates do **not** call the occupancy helper (G-10: flags do not release).

## Production schema compatibility

| Expectation | Production |
|-------------|------------|
| Table exists | YES |
| PK `(scopeKind, scopeId, limitKey)` | YES |
| Columns include `createdAt` | YES |
| Empty lock table is valid | YES — first live mutation creates the mutex row |

No missing required index/constraint. No 0095 required.

## Result

PASS — the deployment candidate is compatible with the already-migrated Production schema.
