# DECISION

## Decision

**Do not implement occupancy serialization in this program.**

**Do adopt (for a later Commercial implementation program) Option A+F:**

Tenant-scoped lock record + `SELECT … FOR UPDATE` + domain `COUNT(*)` + domain insert in **one** Drizzle/mysql2 transaction. Cap remains `checkLimit` / Live Plan. Occupancy remains COUNT of domain rows.

**Do not** invent plan-downgrade freeze policy here (Option E in the program prompt: **defer product policy**). Technical occupancy correctness ≠ commercial freeze.

## Why this is the smallest correct architecture

- Reuses a mechanism MineuQR already runs (BI sequence lock-row).  
- Keeps Commercial as cap authority.  
- Avoids counter drift.  
- Avoids POS-/Order-/Device-owned occupancy.  
- Avoids locking catalog limit rows.  
- Avoids global locks.

## Why not now (REQUIRED FOUNDATION, not REQUIRED NOW)

| Factor | Judgment |
|--------|----------|
| Race real? | Yes |
| Frequency | Low (provisioning, not orders) |
| Customer harm today | Extra row beyond cap on concurrent double-create |
| Schema | Dedicated lock table needs migration (unauthorized here) |
| Tests | Concurrency cannot be certified on mocked in-memory stores |
| Successor | `COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1` (not started) |

Parent-row `FOR UPDATE` (Option G) is the authorized **no-DDL** fallback for that successor if Architecture Authority forbids a new table.

## Explicit non-decisions

- No freeze/deactivate of excess resources on downgrade.  
- No global commercial idempotency table.  
- No `devices` / `staffAccounts` / `branches` quantity occupancy (not implemented).  
- No change to `checkLimit` signature as a side effect of this program.

## Implementation authorization

**Not granted.** DEFAULT READ ONLY. Migration not created. Production not touched.
