# FINAL REPORT

**PROGRAM:** COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1  

**STATUS:** PASS — LOCALLY CERTIFIED  

**MODE:** AUDIT → IMPLEMENT → TEST → CERTIFY  

**PREDECESSOR:** COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1 (G-04)

---

## ROOT CAUSE

First-restaurant onboarding inserted a restaurant in the registration transaction without asserting that the trial/onboarding plan’s `restaurants` cap permits proposedTotal 1. The bootstrap was safe only while seed/Professional cap stayed ≥ 1. An operator can set that cap to 0.

## CURRENT ONBOARDING PATH

`POST /api/auth/register` → `registerOwnerTransactional` → user + restaurant + trial subscription in one transaction; then best-effort live-plan bind.

## CURRENT COMMERCIAL CONTRACT

Trial binds to Catalog Professional. Restaurant quantity is a Live Plan limit (`checkLimit` / occupancy for **later** creates). Onboarding was an undocumented bootstrap exception.

## RESTAURANT OCCUPANCY DEFINITION

`COUNT` of restaurant rows for the owner `userId`. New registration occupancy is 0 before insert.

## ONBOARDING INVARIANT

If effective trial `restaurants` cap ≥ 1 or unlimited (key present, value `null`): first restaurant may be created.  
If cap is 0, missing, invalid, or unresolvable: fail closed; do not create the restaurant.

## IMPLEMENTATION DECISION

**A** — `assertOnboardingFirstRestaurantPermitted()` in Commercial (`onboardingRestaurantCapacity.ts`), called before the onboarding transaction.

## WHY THIS DECISION

`withCommercialLimitOccupancy` cannot join the existing user+restaurant+trial transaction without a helper rewrite or a second connection. `checkLimit` needs a persisted owner subscription that does not exist until the same transaction. Option A encodes the plan contract that made the bootstrap safe, without a second limiter.

## TRANSACTION RESULT

Capacity assert **before** `db.transaction`. Denied/unresolvable → no domain writes. Onboarding atomicity of user+restaurant+trial unchanged.

## TENANT ISOLATION RESULT

No global restaurant count. Trial plan id must match. Basic cap 0 does not block Professional-trial onboarding. Later creates remain owner-scoped occupancy.

## FAIL-CLOSED RESULT

Cap 0 → `CommercialLimitExceededError` / HTTP 403 `limit_exceeded`.  
Missing/invalid → `limit_unavailable`.  
Unresolved catalog → `CommercialOccupancyUnavailableError` / HTTP 403 `commercial_capacity_unavailable`.  
Not 401, not duplicate 409, not generic 500, not “غير مصرح بالوصول”.

## CONCURRENCY RESULT

Same-email double submit still hits unique email/openId. That cannot produce occupancy > cap for a new tenant (0→1). No new idempotency table. Occupancy overflow on this path is the cap-0 case, now denied.

## TEST RESULT

Targeted 27 passed. Guards encode assert-before-insert and Commercial ownership.

## REGRESSION RESULT

62 files / 415 tests / 0 failed (predecessor combined 56 / 385 plus onboarding/register/trial files).

## BUILD

PASS (Vite + esbuild server bundles)

## CHECK

188 `error TS*` — baseline

## DATABASE MUTATION

None against application/Production databases. Catalog tests use in-memory durable catalog. Occupancy concurrency file uses isolated Docker MySQL 8 (unchanged predecessor infra).

## PRODUCTION MUTATION

**0**

## MIGRATION

**NONE** (0094 untouched, no 0095)

## COMMIT

**NONE**

## PUSH

**NONE**

## DEPLOY

**NONE**

## REMAINING RISKS

- Occupancy application code still undeployed (G-02).  
- Git commit / governance terminus 0094 still deferred (G-03).  
- Catalog change during the tiny window after assert and before commit could theoretically diverge; same class of catalog-read races as trial `planId` resolution already inside the transaction. Not a tenant occupancy race.  
- Existing tenants already over a newly lowered cap: G-11.  
- Admin category/item exceed: G-09.  
- POS cascade: G-05.  
- Error mapping elsewhere still collapses some limit vs auth (G-06). This path’s register HTTP mapping is distinct.

## POLICY GAPS

None required to close G-04. Allowing Live Plan `restaurants = 0` (disables signup) is retained as valid configuration, not forbidden.

## NEXT PROGRAM

Selected explicitly by the operator after this certification. **Not started:** G-05, G-03, POS-READ-APIS-IMPLEMENTATION-1.

## FINAL

**STOP.**
