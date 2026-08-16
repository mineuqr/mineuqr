# DECISION

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Decision

Use the **existing restaurant row** as the restaurant-lifecycle serialization point.

- Child creates that must not orphan: `requireRestaurantRowForUpdate` in the **same transaction** as the INSERT.
- Restaurant deletion: `lockRestaurantRowForUpdate` **before** cascade child deletes, in a **READ COMMITTED** transaction.
- Commercial occupancy primitive is **unchanged**.

Do **not** add an FK. Do **not** modify 0094. Do **not** put restaurant existence into `commercialLimitOccupancy.ts`.

## Why this is correct on TiDB today

Both competitors lock the same committed `restaurants` primary key.

- If create holds the row: it inserts, commits; delete then sees the child (RC) and cascades it away.
- If delete holds the row: it cascades and removes the parent; create’s `FOR UPDATE` returns no row → `RestaurantGoneError` → occupancy txn rolls back.

Proven on `mineuqr-stagIn` with independent pools (`db` / `dbB`).

## Why occupancy mutex stays first

Quantity creates already serialize on 0094. Taking the restaurant row **after** that mutex keeps a single lock order:

`occupancy mutex → restaurant row`

Delete and admin/order creates take **only** the restaurant row. No path takes restaurant then occupancy, so there is no inversion with the quantity path.

## Why not FK / extra lock / occupancy change

See `ARCHITECTURAL-OPTIONS.md`. Application lock matches current schema conventions and needs no migration.

## Quality gate

| Class | Item |
|-------|------|
| REQUIRED NOW | Parent `FOR UPDATE` on delete + covered child creates; RC delete txn |
| REQUIRED FOUNDATION | Remaining D-class restaurant-owned inserts adopt the same primitive |
| SAFE TO DEFER | FK, 0095, D-class product programs, G-09/G-10/G-11 policy |
| NEVER | POS lifecycle lock, Redis, app locks, shadow orphan counters, Commercial-owned delete, hiding orphans from COUNT |
