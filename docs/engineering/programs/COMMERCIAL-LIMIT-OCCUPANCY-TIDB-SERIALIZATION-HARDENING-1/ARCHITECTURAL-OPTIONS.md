# ARCHITECTURAL OPTIONS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  

## Option 1 — Pre-create 0094 mutex, then occupancy txn

`INSERT IGNORE` mutex **commits** before `BEGIN`. Occupancy txn: `SELECT … FOR UPDATE` on that existing PK, COUNT, decide, create.

**TiDB:** E1/E4 prove existing-row `FOR UPDATE` serializes. Must also fix COUNT (option 1a `COUNT FOR UPDATE` on domain rows, or 1b READ COMMITTED occupancy txn).

| Axis | Assessment |
|------|------------|
| Absent-row | Solved: row exists before the race |
| Tenant isolation | PK still `scopeKind+scopeId+limitKey` |
| Migration | None (0094 unchanged) |
| Domain COUNT | Remains caller-owned |
| Debt | Small: two-phase ensure+lock |
| Reject | Creating the mutex **inside** the occupancy txn (G-07) |

## Option 2 — Parent-row `FOR UPDATE` (users / restaurants)

Always-existing owner or restaurant row.

| Axis | Assessment |
|------|------------|
| Absent-row | Parent exists (onboarding restaurant is not this helper) |
| Coupling | Commercial occupancy locks identity/restaurant rows; profile updates contend |
| Multi-limitKey | Restaurant vs category would share one restaurant row — over-serializes unrelated limits |
| Migration | None |
| Verdict | Weaker than per-limitKey mutex |

## Option 3 — New dedicated serialization table (0095)

Same as option 1 with a new table. Unnecessary: 0094 already is that table.

## Option 4 — Occupancy counters

Second source of truth. Forbidden unless COUNT cannot be made correct. COUNT **can** be made a current read (E2/E5).

## Option 5 — Redis / GET_LOCK / app memory / POS lock

Forbidden (H, G, E, F). TiDB Serverless `GET_LOCK` is not a cluster mutex we will own.

## Selected: Option 1 + READ COMMITTED occupancy transaction (1b)

- `INSERT IGNORE` commits the 0094 row **before** the occupancy transaction.
- Occupancy `db.transaction(..., { isolationLevel: "read committed" })`.
- `SELECT … FOR UPDATE` on the existing mutex.
- Caller `COUNT(*)` / list+filter stays domain-owned and is a **current** read under RC.
- No 0095. No counters. No POS lock. No global lock.

Does **not** create the serialization row inside the occupancy race.
