# DELETE RACES

Deletes are **not** occupancy-locked. Occupancy is `COUNT(domain rows)`. A concurrent delete can only reduce COUNT. Creates remain serialized.

## Create vs delete (same owner, restaurants, cap = 2)

| Ordering | Final COUNT | Notes |
|----------|-------------|-------|
| A create starts → delete seed | 1 | create fulfilled; seed gone |
| B delete starts → create | 1 | internally consistent |
| C concurrent | 1 | create fulfilled |

No occupancy > cap. No occupancy ≠ COUNT(*). No lost delete of the targeted id (affectedRows=1 in A). Create after a freed slot is allowed.

## At-cap create vs delete (occupancy = 2, cap = 2)

Seed two restaurants. Concurrent: delayed create, delete of one seed, second create.

Final COUNT=2 (remaining seed + one new row). One create rejected. Never 3.

## Hard-delete category vs category create

`DELETE menu_items` then `DELETE categories` concurrent with locked category create.

Final category COUNT=1 (cap 2). Orphan `menu_items` with missing category: **0**.

## POS deactivate vs provision

Deactivate is `UPDATE provisioned=0` without the occupancy lock, concurrent with a slot-consuming provision.

Final provisioned COUNT <= 1.

## Accounting

No decrement ledger. No shadow occupancy table. Lock table row count is unrelated to occupancy.

## Verdict

**A. PASS** for occupancy. Incorrect rejection of a create that races a delete is possible (create still sees COUNT=cap) and is occupancy-safe, not an invariant break.
