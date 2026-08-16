# RECOMMENDED REMEDIATION ORDER

Do **not** start POS-READ-APIS-IMPLEMENTATION-1 until REQUIRED NOW and REQUIRED FOUNDATION items identified here are implemented and certified (per program stop condition).

## Dependency order

```
1. COMMERCIAL-LIMIT-OCCUPANCY-POS-SLOT-NEUTRAL-LOCK-1     (G-01 REQUIRED NOW)
        ↓
2. GIT COMMIT / PUSH occupancy + 0094 journal + governance terminus 0094 (G-03)
        ↓
3. COMMERCIAL-LIMIT-OCCUPANCY-APPLICATION-DEPLOY-1        (G-02)
        ↓
4. COMMERCIAL-LIMIT-OCCUPANCY-ONBOARDING-CAP-GUARD-1      (G-04)
5. COMMERCIAL-LIMIT-OCCUPANCY-CASCADE-POS-TERMINALS-1     (G-05)
6. COMMERCIAL-LIMIT-OCCUPANCY-ERROR-SEMANTICS-1           (G-06)
7. COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-1          (G-07, G-08)
        ↓
8. POLICY: admin menu exceed (G-09) + inactive occupancy (G-10) + freeze (G-11)
        ↓
9. Then POS-READ-APIS-IMPLEMENTATION-1
```

G-04–G-08 may proceed in parallel after deploy if they do not block runtime locking. G-01 should ship **in the same commit as occupancy** so Production never deploys the replace race.

## G-01 — POS slot-neutral replace

| Field | Value |
|-------|--------|
| Files | `server/pos/services/PosTerminalService.ts` |
| Resource | `posTerminals` |
| Invariant | occupancy ≤ cap |
| Path | `replace` when previous is provisioned |
| Cause | `performReplace(null)` skips helper |
| Correction | `withCommercialLimitOccupancy` + `occupancyDelta: 0` (serialize; COUNT+decide without +1) wrapping insert+mark replaced on **same tx** |
| Migration | none |
| Tests | real-DB concurrent double-replace → occupancy 1, one winner |
| Production | deploy with occupancy app |

## G-02 / G-03 — Commit + deploy

Occupancy code + docs + governance tail 0094. Deploy **after** 0094 (already applied). No new migration.

## G-04 — Onboarding cap

| Field | Value |
|-------|--------|
| Files | `server/auth-local/registerOwner.ts` |
| Correction | After trial bind in the same tx (or immediately after), fail registration if `checkLimit(restaurants, proposedTotal=1)` denies |
| Migration | none |

## G-05 — Cascade POS

| Field | Value |
|-------|--------|
| Files | `server/db/cascadeDeletes.ts` |
| Correction | delete `pos_terminals` (and optionally occupancy lock rows for that restaurant) inside restaurant cascade tx |
| Tests | cascade leaves 0 POS rows |

## G-06 — Errors

Map `limit_exceeded` vs `occupancy_unavailable` vs auth to distinct client codes. Files: `subscriptionPlanLimits.ts` `mapOccupancyError`, `posRouter.ts` `mapPosError`.

## G-07 / G-08 — Proof

Staging/Production TiDB occupancy drill **after** deploy; optional domain-table race tests on isolated MySQL.

## G-09 — Policy program (no code until decided)

If support-exceed remains: document constitution exception. If not: route admin category/item through the helper (same as restaurant).
