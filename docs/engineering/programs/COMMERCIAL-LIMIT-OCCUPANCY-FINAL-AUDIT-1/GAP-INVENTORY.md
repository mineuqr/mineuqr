# GAP INVENTORY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

| ID | Finding | Class |
|----|---------|-------|
| — | No unprotected quantity-consuming create | — |
| G-07 default 5s timeout | P6 exceeded 5000ms on first independent run; occupancy still isolated | INTENTIONAL / ACCEPTED (harness). Aligned to 30s |
| Hub mock missing `isLivePlanUuid` | PLATFORM_OWNER customer path threw in unit test | INTENTIONAL / ACCEPTED (test mock). Completed |
| `assertProvisioningAllowed` | Unused; would map limit deny to `PosEntitlementDeniedError` | NON-BLOCKING RISK / SAFE TO DEFER |
| `routers` unused `createRestaurant` import | Dead import | SAFE TO DEFER |
| Residual `db.create*` | Not router paths; helper unlocked fallback / leftover | A / D |
| staff/branches/devices/screens | No occupancy primitive | INTENTIONAL / SAFE TO DEFER |
| Decide-time cap vs in-flight create | Occupancy may exceed **new** cap | INTENTIONAL / ACCEPTED (G-11 B) |
| `CANONICAL_MIGRATION_TAIL_TAG` = 0093 | Journal ends 0094 | SAFE TO DEFER (git commit) |
| Occupancy app not deployed | Schema ready; app not in Production | REQUIRED FOUNDATION FOR FUTURE (Production Certification) |
| stagIn no `pos_terminals` | POS proven on fixture table | INTENTIONAL / ACCEPTED |

## CRITICAL BLOCKER

**None.**

## REQUIRED NOW

Keep Policy B + G-10 COUNT. Do not auto-cleanup on downgrade. Do not deploy from this program.

## POLICY DECISION REQUIRED

**None.** G-10 and G-11 remain the certified policies. No contradiction with the live architecture.

## ARCHITECTURE GAP

**None** that blocks occupancy certification.
