# IMPLEMENTATION

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Primitive

`server/db/restaurantRowLock.ts`

- `lockRestaurantRowForUpdate(tx, restaurantId)` → `{ id, userId } | null`
- `requireRestaurantRowForUpdate` → throws `RestaurantGoneError`
- SQL: `SELECT id, userId FROM restaurants WHERE id = ? FOR UPDATE`

Not Commercial. No COUNT. No mutex table.

## Call sites

| File | Change |
|------|--------|
| `server/db/cascadeDeletes.ts` | Lock parent first; RC on `deleteRestaurantCascade` / `deleteUserCascade` |
| `server/subscriptionPlanLimits.ts` | Parent lock at start of `countOccupancy` when `tx` present; map `RestaurantGoneError` → tRPC NOT_FOUND |
| `server/db.ts` | `createCategory` / `createMenuItem` RC txn: lock then insert |
| `server/routers.ts` | Admin create awaits db helpers; maps `RestaurantGoneError` |
| `server/pos/services/PosTerminalService.ts` | Lock inside `countOccupancy`; gone → `restaurant_not_found` |
| `server/order/infrastructure/persistence/DrizzleOrderRepository.ts` | Lock before order INSERT |

## Unchanged (by design)

- `server/subscription-runtime/commercialLimitOccupancy.ts`
- `drizzle/0094_commercial_limit_occupancy_locks.sql`
- `checkLimit()`
- COUNT(*) occupancy model
- G-09 admin skip of occupancy (lock still applied)

## Tests

- `server/db/__tests__/restaurantRowLock.test.ts`
- `server/db/__tests__/restaurantRowLock.guards.test.ts`
- `server/db/__tests__/commercialDomainCascadeToctou.tidb.test.ts`
- G-08 P12 expectation flipped to `orphanCategories=0`, `architectureGap=false`
- `occupancyG08Tidb.ts`: parent lock in locked creates; `deleteRestaurantLockedCascade`
- `cascadeDeletes.test.ts` mock `tx.execute`
- `cascadeDeletes.posOrphans.guards.test.ts`: lock before POS deletes

## Not done (classified D)

`createOffer`, `createTable`, POS grant/idempotency inserts. Primitive is available; not silently mixed into those authorities in this program.
