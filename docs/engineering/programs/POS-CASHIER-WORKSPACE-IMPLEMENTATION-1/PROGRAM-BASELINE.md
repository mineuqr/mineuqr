# PROGRAM BASELINE

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1  
**Status:** AUTHORIZED — IMPLEMENTATION  
**START SHA:** `196ee010860d9b7e7f9762417030d1144277508a`  
**Predecessor:** POS-READ-APIS-IMPLEMENTATION-1 (Production validation PASS WITH CONDITIONS)

## Certified predecessors

| Item | State |
|------|--------|
| Commercial Occupancy | CERTIFIED / UNCHANGED |
| Migration 0094 | CERTIFIED |
| G-07 → G-11 | PASS |
| Domain Cascade TOCTOU | PASS |
| TypeScript remaining | 27 classified, P0=0, P1=0 |
| POS Read APIs | locally certified, committed, pushed, deployed |

## Gate A

CASHIER UI DID NOT EXIST. This program is the first Cashier UI. Absence of UI was not a deployment defect.

## Non-goals

- Staff Access program
- Plan Entitlement vs Staff Permission governance
- POS seat / cashier seat limits
- Dashboard / Order / Check / Settlement / Reporting rewrite
- Schema / migration (default: none)
- Auto-grant Owner/Admin `POS_ACCESS`
