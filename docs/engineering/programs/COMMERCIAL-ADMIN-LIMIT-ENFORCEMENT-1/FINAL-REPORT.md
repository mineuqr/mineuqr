# FINAL REPORT

**PROGRAM:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1 (G-09)  
**STATUS:** PASS — ADMIN QUANTITY CREATES RESPECT COMMERCIAL CAPS  
**COMMERCIAL POLICY:** Capacity belongs to the tenant resource. Caller role does not grant extra slots. Admin category/item skip was not an approved exemption (CE-05).  
**ADMIN PATHS AUDITED:** restaurant create (already enforced); category/item owner vs admin; POS terminals (no role skip); onboarding bootstrap; residual `db.create*`; no bulk/import jobs.  
**LIMIT KEYS:** `categories`, `items` (this fix); `restaurants`, `posTerminals` already occupied.  
**OCCUPANCY SOURCES:** `COUNT(domain rows)` inside `withCommercialLimitOccupancy`.  
**PLATFORM_OWNER RESULT:** **B** — target tenant’s Commercial limits via `checkLimit(restaurant.userId)`. FULL_PLATFORM unlimited is entitlement, not a role bypass.  
**OWNER/ADMIN RACE RESULT:** occupancy=2=cap; fulfilled=1; exceeded=1.  
**ADMIN/ADMIN RACE RESULT:** occupancy=2.  
**ADMIN/DELETE RESULT:** restaurant 0, categories 0.  
**CROSS-TENANT RESULT:** A=1 B=1; elapsedMs=1524.  
**ROLLBACK RESULT:** insert-then-throw occupancy 0.  
**G-07 REGRESSION:** P8 PASS (`finalOccupancy: 2`).  
**G-08 REGRESSION:** P12 PASS (`orphanCategories: 0`); TOCTOU category race PASS.  
**ERROR SEMANTICS:** exceeded FORBIDDEN; unavailable INTERNAL_SERVER_ERROR; not “unauthorized”.  

## TS BASELINE 188

188 (G-06 and occupancy implementation programs)

## TS CURRENT 193

Observed on G-08 / TOCTOU / G-09-before-fix working trees

## TS DELTA

+5

## TS ROOT CAUSE

G-07 harness files not matching `**/*.test.ts`: `occupancyTestTidb.ts` TS7016; `occupancyTidbWorker.ts` TS1378 × 4.

## TS REGRESSION STATUS

**NO** G-09 application regression. Check surface restored to **188** by wrapping the G-07 worker and excluding occupancy harness files from `tsconfig` (test infrastructure). See `TS-BASELINE-FORENSICS.md`.

## TARGETED TESTS

G-09 TiDB 10; G-09 guards 4; G-08 guards 10; router admin create 1.

## REGRESSION TESTS

G-07 P8; G-08 P12; TOCTOU category; occupancy unit 5; occupancy guards 6; G-06 7; POS architecture 7; row-lock guards 6.

## BUILD

PASS

## CHECK

188 `error TS*`

## DATABASE MUTATION

stagIn synthetic G-09 owners `981001001` / `981001002` only. Production **0**.

## MIGRATION

NONE

## COMMIT

NONE

## PUSH

NONE

## DEPLOY

NONE

## REMAINING RISKS

- Occupancy application still not deployed (G-02). Production owner/admin creates remain check-then-act until deploy.
- Onboarding first restaurant still bootstrap (G-04).
- Residual `db.createCategory` if a future caller skips the helper (guards cover known routers).
- G-10 / G-11 policy still open.

## REQUIRED NOW

Admin category/item occupancy (done).

## REQUIRED FOUNDATION FOR FUTURE

Single persist helper per quantity resource; no role fork around occupancy; bulk must occupy inside the same primitive.

## SAFE TO DEFER

G-10, G-11, G-12, G-02, G-03, non-quantity restaurant children.

## SHOULD NEVER BE INTRODUCED

Admin limit tables; role counters; hardcoded admin quotas; POS-specific Commercial; second Commercial system; bypass because admin/owner/PLATFORM_OWNER.

## NEXT PROGRAM

**STOP.** Do not start G-10, G-11, Final Commercial Occupancy Audit, Commercial Production Certification, or POS-READ-APIS-IMPLEMENTATION-1 until G-09 is certified and reviewed.

## FINAL

G-09 — ADMIN RESPECTS COMMERCIAL LIMITS — **PASS**. One Commercial truth for owner and admin quantity creates. No Production mutation. No git. No deploy.
