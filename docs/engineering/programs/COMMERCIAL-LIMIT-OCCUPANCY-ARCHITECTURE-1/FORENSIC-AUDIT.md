# FORENSIC AUDIT

Read-only inspection of actual MineuQR code and schema. Production was not queried or mutated.

## What `checkLimit` actually does

`server/subscription-runtime/enforcement.ts`:

1. `resolveOwnerEntitlements(ownerId)` — Live Plan / PLATFORM_OWNER / fail-closed / legacy bridge.  
2. If `plan === "NONE"` → deny, cap 0.  
3. `readLimitValue(entitlements, limitKey)` — cap from the entitlement DTO.  
4. Compare **caller-supplied** `proposedTotal` to cap.  
5. Return `{ allowed, cap, policy }`.

`checkLimit` does **not**:

- count resources  
- lock anything  
- insert anything  
- open a transaction  
- know which restaurant is being mutated (except via whatever occupancy the caller already counted)

Occupancy is entirely the caller’s responsibility: count, then `proposedTotal = count + 1`, then later insert on a **different** round-trip.

## Callers (only these invoke `checkLimit`)

| Caller | Limit key | Occupancy source | Insert |
|--------|-----------|------------------|--------|
| `assertRestaurantCreateAllowed` | `restaurants` | `getRestaurantsByUser(ownerId)` — all rows | `createRestaurant` (separate) |
| `assertCategoryCreateAllowed` | `categories` | `getRestaurantStats` `COUNT(*)` | `createCategory` (separate) |
| `assertMenuItemCreateAllowed` | `items` | `getRestaurantStats` `COUNT(*)` | `createMenuItem` (separate) |
| `PosEntitlementService.assertProvisioningAllowed` | `posTerminals` | provisioned terminals (`registered`+`active`) | `PosTerminalStore.insert` (separate) |
| `PosEntitlementService.resolve` | `posTerminals` | same count | none (read) |

Tests also call `checkLimit` directly (mocked or hub-only).

## What is **not** a quantity-occupancy path

| Key | Registry | Runtime |
|-----|----------|---------|
| `devices` | limit vocabulary + **feature** `devices` | `requireFeature("devices")` only. `checkLimit("devices")` → `limit_key_unsupported` |
| `staffAccounts` | vocabulary | **not** `readLimitValue`; no create-path enforcement |
| `branches` | vocabulary | not enforced |
| `ordersPerMonth`, `qrCodes`, `storage`, `images` | vocabulary | not enforced |

`requireFeature` is capability on/off. It is not occupancy.

## Catalog vs occupancy

`commercial_limit_values` stores **plan composition** (`profileId` + `limitKey` → cap). Unique on `(profileId, limitKey)`.

That table is the **cap**, not occupancy. Locking it would serialize **every tenant on the same Live Plan**. Forbidden.

## Existing serialization (other domains)

| Mechanism | Where | Occupancy? |
|-----------|-------|------------|
| Unique indexes | POS `(restaurantId, code)`, grants, sale idempotency, dining open-guard, many Check/Settlement ids | Identity, not quantity vs cap |
| `order_business_day_sequences` atomic `INSERT … ON DUPLICATE KEY UPDATE last_number + 1` | Order display numbers | Unbounded counter, not compared to a commercial cap |
| Historic BI `SELECT … FOR UPDATE` then `COUNT(*)` | Order identity replay | Proves MineuQR already uses lock-row + count **inside one tx** |
| POS `version` increment | Terminal lifecycle OCC | Not a quantity cap |
| Named `GET_LOCK` | **absent** | — |
| Occupancy counter table | **absent** | — |
| Reservation table | **absent** (jobs platform is a reservation **name** only) | — |

## Transaction boundaries on limited creates

Restaurant / category / item: `assert*CreateAllowed` (own pool reads) **then** `db.insert` with **no** shared `db.transaction`.

POS register: `assertProvisioningAllowed` (list + `checkLimit`) **then** `store.insert`. Production Drizzle insert is not in a transaction with the count.

Onboarding `registerOwnerTransactional` inserts the **first** restaurant inside a user+subscription transaction **without** `checkLimit` (new owner, occupancy 0→1).

## Isolation proof (engine)

Production database is **TiDB Cloud** (MySQL protocol, drizzle/mysql2). Default isolation is Repeatable Read-style snapshot reads.

`COUNT(*)` in a transaction is a **non-locking consistent read** unless `SELECT … FOR UPDATE` (or equivalent) is used on a **specific lockable row**. Two transactions can both observe `N` and both `INSERT`.

Wrapping COUNT + INSERT in `db.transaction` **without a lock target does not serialize occupancy.**

Empty-table case: there is **no resource row to lock**. Parent/lock-token row is required.

## Admin category/item skip (related, not the race)

`category.create` / `menuItem.create`: `if (ctx.user.role !== "admin")` then `checkLimit`. Platform admin can exceed those caps. Restaurant create does **not** skip: it meters `ownerUserId`. POS provisioning meters `restaurant.userId` for all `assertRestaurantAccess` actors. Documented; not fixed here (not occupancy architecture).
