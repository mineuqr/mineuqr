# PRODUCTION READINESS

## This program (LOCAL ONLY)

| Action | Count |
|--------|------:|
| Production schema | **0** (0094 already applied by predecessor; not touched) |
| New migration 0095 | **0** |
| Modify 0094 | **0** |
| Production data / POS provision / plans | **0** |
| Commit / push / deploy | **0** |

Application occupancy code is **still not deployed**. Closing G-01 in local source does not activate Production locking until a later deploy program (audit G-02) after git commit (G-03).

## What is ready locally

- Provisioned replace is a Commercial occupancy consumer (`occupancyDelta: 0`)
- Same tenant lock + same transaction as COUNT/insert/mark-replaced
- Isolated MySQL 8 concurrency for the replace invariant
- Architecture guards against re-bypass

## What is not claimed

- Production TiDB concurrency
- Live Production occupancy enforcement for replace (app undeployed)
- Governance terminus still **0093** in `scripts/lib/migration-governance-lib.cjs` (audit G-03 — out of this program)

## Deploy coupling

G-01 should ship in the **same** application deploy as occupancy adoption so Production never runs occupancy locking on register while leaving provisioned replace unlocked. This program does **not** deploy.

## Rollback of this change

Revert `PosTerminalService.replace` wiring. No schema rollback. Occupancy primitive unchanged.
