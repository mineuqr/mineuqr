# DATABASE ANALYSIS

## Engine

TiDB Cloud (MySQL protocol). App: `drizzle-orm/mysql2` pool. `db.transaction` is used in Order/CRMP/onboarding — **not** in restaurant/category/item/POS limit creates.

## Option evaluation

### A — Transaction + row locking (`SELECT … FOR UPDATE`)

Lock a **known existing row** in the same transaction as COUNT + INSERT.

Correct **if** the lock row exists and all three steps share one tx/connection. Empty resource table cannot lock itself. Parent row (`users` / `restaurants`) or a dedicated lock row is required.

Deadlock: lock order must be stable (owner user, then restaurant). Retry on deadlock is already a MineuQR Order-identity pattern.

TiDB: PK `FOR UPDATE` is the proven local pattern (`order_business_day_sequences` historic path).

Do **not** `FOR UPDATE` `commercial_limit_values` (plan-wide contention).

### B — Atomic occupancy counter

`INSERT … ON DUPLICATE KEY UPDATE occupied = occupied + 1` with `occupied < cap` in the UPDATE predicate.

Correct if cap is in the same row **or** checked in the same locked read. Cap lives on Live Plan and changes independently → counter must still compare to a freshly read cap, or drift on plan change / delete.

Delete/release must decrement. Failure to decrement **silently inflates** occupancy. Higher operational risk than COUNT.

Order BI sequences use this for **unbounded** numbers, not for commercial caps.

### C — Reservation-first

Reserve slot, then create, then confirm. Extra states, expiry, leak on crash. Appropriate for high-contention inventory, not owner provisioning. Overkill.

### D — OCC (`version` on occupancy row)

Read version, insert if version matches, bump. Needs an occupancy row (same as A). Weaker than `FOR UPDATE` for this low-row hotspot (retry storms at exact cap). POS `version` is lifecycle OCC, not quantity.

### E — Unique constraint as occupancy

Cannot express `COUNT(*) <= K` as a unique index. Unique only prevents duplicate **identity**. **Insufficient alone.**

### F — Existing MineuQR mechanism, generalized

**Chosen family:** lock-token row + `FOR UPDATE` + domain `COUNT(*)` + domain insert in **one** Drizzle transaction.

Evidence: `DrizzleBusinessIdentityAllocator.ensureAssigned` inserts/ensures `order_business_day_sequences`, `SELECT last_number … FOR UPDATE`, then counts.

Hot BI path uses atomic increment **without** a commercial cap — do **not** copy that for limits.

### G — Parent-row lock without new table

`SELECT * FROM users WHERE id = owner FOR UPDATE` before restaurant insert; `SELECT * FROM restaurants WHERE id = ? FOR UPDATE` before category/item/POS insert.

No migration. Couples Commercial serialization to domain rows; profile updates stall behind provisioning; lock order must be documented. Acceptable **interim** in an implementation program that forbids DDL. Prefer a Commercial-owned lock table when DDL is allowed.

### Named `GET_LOCK`

Not used in repo. Session-scoped; unsafe across pool connections unless lock+insert+unlock are the same connection. TiDB cluster semantics for advisory locks are **not proven** here. **Do not choose** without a TiDB proof program.

## Compatibility

| Concern | A+F lock row + COUNT |
|---------|----------------------|
| Drizzle | `db.transaction` + `tx.execute(sql\`… FOR UPDATE\`)` already exists |
| TiDB/MySQL | PK lock + insert in one tx |
| Plan change | COUNT vs current `checkLimit` cap; no freeze |
| Release | COUNT shrinks; no counter repair |
| Branches/add-ons | new `limitKey` + occupancy scope in the same helper |
| Migration | dedicated lock table = additive DDL; parent-row = none |

## Decision implication

Implementing A+F with a Commercial lock table **requires a migration**. This program **stops** (no DDL, no apply). Parent-row lock would still require multi-domain wiring and **real DB** concurrency tests (not in-memory). Not implemented here.
