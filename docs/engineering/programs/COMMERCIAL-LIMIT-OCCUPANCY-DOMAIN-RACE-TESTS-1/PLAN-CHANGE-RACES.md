# PLAN-CHANGE RACES

## What was tested

Shared cap row (`occupancy_g08_caps`) read inside `decide()`, analogous to `checkLimit` on a second connection (existing G-18). Concurrent:

- restaurant create holding the occupancy lock
- `UPDATE cap = 0`

## Result (TiDB)

| occupancy after | new cap | create | occupancy > new cap |
|-----------------|---------|--------|---------------------|
| 1 | 0 | rejected | yes |

The in-flight create was rejected after the cap dropped. The **already persisted** restaurant remained. `1 > 0` is leftover occupancy versus the new cap, not a create that beat the lock.

## Classification

This is **G-11 freeze-on-downgrade**, not an occupancy create invariant failure.

- **A. Documented policy:** existing rows stay operational after downgrade.
- **Not B:** no create committed `occupancy > cap_at_decide`.
- G-08 does not invent freeze or auto-delete-on-downgrade.

## Verdict

**C. POLICY DECISION — G-11.**
