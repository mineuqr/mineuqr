# REPLACE RACES

POS registered/active replacement uses `occupancyDelta = 0` and re-reads lifecycle under the occupancy lock. Mismatch → `lifecycle_conflict`.

POS races used fixture table `occupancy_g07_terminals` because stagIn has no `pos_terminals` table. Semantics match `isProvisionedLifecycle` COUNT.

## Replace vs replace

Two concurrent `delta=0` replacements of the same provisioned terminal.

| Fulfilled | Rejected | Final provisioned COUNT |
|-----------|----------|-------------------------|
| 1 | 1 (`lifecycle_conflict`) | 1 |

One valid lifecycle outcome. Occupancy unchanged. No cap violation.

## Replace vs hard-delete

Replace (insert new + mark old unprovisioned) concurrent with `DELETE` of the previous row.

Final provisioned COUNT=1 (replace fulfilled). Never > cap.

## Repeat replacement

Second replace of an already-replaced id fails closed (`lifecycle_conflict` / not provisioned). Covered by the loser of replace-vs-replace.

## Verdict

**A. PASS.** No POS-specific lock was added. Slot-neutral replace remains Commercial occupancy with `occupancyDelta=0`.
