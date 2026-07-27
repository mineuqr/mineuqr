# Regression Report

## Unchanged planes (verified via git path inventory)

| Area | Diff vs HEAD? |
|------|---------------|
| Order Domain | **None** |
| Check Aggregate / write path | **None** |
| Settlement Platform ownership | **None** |
| Register / Custody Plane | **None** |
| Database schema / migrations | **None** |
| New/deleted tRPC procedures | **None** |
| `package.json` / lockfile / `vercel.json` | **None** |

## Intentional touch (documentation / comments only on server)

| Path | Change |
|------|--------|
| `server/reporting-platform/reportingRouter.ts` | JSDoc only — Payment Analytics source wording |

## Runtime financial behavior

- Revenue / Refund / Tax / Settlement formulas: **unchanged**
- Reporting SSOT: **preserved**
- Payment default source: **`settlement_record`** (pre-existing; not altered by this program)

**Regression status:** **CLEAR**
