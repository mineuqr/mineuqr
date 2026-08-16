# FINAL REPORT

PROGRAM  
COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1

STATUS  
PASS — COMMERCIAL PRODUCTION CERTIFIED

PRODUCTION TARGET  
Certified Production TiDB Cloud endpoint

PRODUCTION IDENTITY  
ACCEPT_PRODUCTION — host `gateway01.eu-central-1.prod.aws.tidbcloud.com:4000`, SQL user prefix `43cECBySTU9sFco`, not stagIn (`3BUSFE99csVhDLu`), not local Docker, not MySQL 8 occupancy test DB

DATABASE  
mineuqr (`DATABASE()` confirmed)

MIGRATION JOURNAL TAIL  
0093_pos_sale_idempotency (id 6174104) followed by 0094_commercial_limit_occupancy_locks (id 6204102)

0094 JOURNAL ID  
6204102

0094 HASH  
134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47  
(matches certified hash)

0094 COUNT  
1

SCHEMA RESULT  
PASS — `commercial_limit_occupancy_locks` exists; columns `scopeKind`, `scopeId`, `limitKey`, `createdAt`; PRIMARY KEY `(scopeKind, scopeId, limitKey)`; no conflicting occupancy table; Drizzle agrees; lock rows = 0

APPLICATION COMPATIBILITY  
PASS — helper uses `commercial_limit_occupancy_locks` and the certified sequence (committed `INSERT IGNORE` → RC txn → `SELECT … FOR UPDATE` → COUNT(*) → `checkLimit()` → domain mutation → COMMIT). No redesign.

COMMERCIAL LIMIT RESULT  
Readable. Sellable Live Plans have restaurants / categories / items. All three plans are missing `posTerminals`. Classification: NON-BLOCKING / REQUIRED BEFORE POS COMMERCIAL USE.

OCCUPANCY CENSUS  
restaurants 4 (cap leftover: owner 1 has 2 vs 1); categories 7 (0 over-cap); items 11 (0 over-cap); POS provisioned 0. G-10 counts. No repair.

G-10 RESULT  
PASS — Production semantics compatible; G-10 TiDB 9/9 on G07

G-11 RESULT  
PASS — Policy B compatible; owner-1 leftover is allowed leftover, not a blocker; G-11 TiDB 15/15 on G07

POS RESULT  
PASS for occupancy deploy. 0 Production terminals. Helper wired for provision / reactivate / replace (`occupancyDelta = 0`). `posTerminals` catalog key still required before POS commercial use.

ONBOARDING RESULT  
PASS — G-04 retained (`assertOnboardingFirstRestaurantPermitted` before register txn; helper not forced into that txn)

ERROR SEMANTICS RESULT  
PASS — G-06: exceeded → FORBIDDEN / quota; unavailable → INTERNAL_SERVER_ERROR / capacity verification. Not generic authorization.

GOVERNANCE TAIL RESULT  
GOVERNANCE FOLLOW-UP REQUIRED — `CANONICAL_MIGRATION_TAIL_TAG` still 0093 while Production journal is 0094. Not an occupancy architecture failure. Fix in the Git/governance commit.

DATABASE MUTATION  
INSERT 0 / UPDATE 0 / DELETE 0 / DDL 0 / MIGRATION 0  
SELECT-only certification queries (17). `pnpm db:migrate` not run.

PRODUCTION MUTATION  
0

TS BASELINE  
188

TS CURRENT  
188

TS DELTA  
0

BUILD  
PASS (`pnpm build`)

REGRESSION  
G-07 12/12 PASS; G-08 18/18 PASS; TOCTOU 12/12 PASS; G-09 10/10 PASS; G-10 9/9 PASS; G-11 15/15 PASS (TiDB 76/76). Targeted non-TiDB 18 files / 94 + 4 files / 24 PASS.

CRITICAL BLOCKERS  
NONE

NON-BLOCKING RISKS  
- All sellable Live Plans lack `posTerminals` (fail-closed after deploy; required before POS commercial use).  
- Owner userId 1 has 2 restaurants vs cap 1 (G-11 Policy B leftover; new create will be denied).  
- Governance canonical tail still 0093.  
- Occupancy application is not yet deployed.

REQUIRED NOW  
Review this certification. Do not deploy from this program. Do not mutate Production. Do not start POS-READ-APIS.

REQUIRED FOUNDATION FOR FUTURE  
GIT COMMIT + GOVERNANCE 0094, then push, then application deployment, then post-deployment Commercial occupancy smoke / certification.

SAFE TO DEFER  
Publishing `posTerminals` on Live Plans until POS commercial use. staff/branches/devices COUNT. Unused `assertProvisioningAllowed` cleanup. Unused `createRestaurant` import. POS hard-delete API.

SHOULD NEVER BE INTRODUCED  
Shadow occupancy counters. POS/admin Commercial subsystems. Downgrade debt / auto-delete / freeze-on-downgrade. Hide-inactive-to-free-slots. Role quota bypass. Blind `pnpm db:migrate` against Production.

DEPLOYMENT READINESS  
READY FOR APPLICATION DEPLOYMENT

NEXT PROGRAM  
GIT COMMIT + GOVERNANCE 0094  
Then PUSH  
Then APPLICATION DEPLOYMENT  
Then POST-DEPLOYMENT COMMERCIAL OCCUPANCY SMOKE / CERTIFICATION  
Only after that: POS-READ-APIS-IMPLEMENTATION-1

FINAL  
COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1 — PASS. Production identity proven. Schema and 0094 match the certified application. Production mutation 0. No git. No push. No deploy. **STOP.**
