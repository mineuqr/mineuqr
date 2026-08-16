# FINAL REPORT

**PROGRAM:** COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1 (G-08)  
**STATUS:** PASS — DOMAIN OCCUPANCY INVARIANT HOLDS  
**MODE:** AUDIT → RACE ANALYSIS → TEST → HARDEN IF REQUIRED → CERTIFY  
**TIDB VERSION:** 8.0.11-TiDB-v8.5.3-serverless  
**BRANCH:** mineuqr-stagIn  
**DATABASE:** mineuqr  
**PRODUCTION MUTATION:** 0  

## RESOURCE INVENTORY

Quantity-governed: `restaurants`, `categories`, `items`, `posTerminals`.  
Not occupancy: `staffAccounts`, `branches`, `devices`.  
Onboarding: G-04 catalog assert; helper not wrapped.  
Admin category/item: skip occupancy (G-09).

## CREATE RACE RESULT

PASS. Last slot 1/1, COUNT=cap. Two OS processes COUNT=2.

## AT-CAP RESULT

PASS. 0 new rows. COUNT=cap.

## DELETE RACE RESULT

PASS. Create∥delete COUNT <= cap and equals domain rows. At-cap create∥delete never reached 3.

## REPLACE RACE RESULT

PASS. Two replaces → 1 provisioned. Replace∥hard-delete provisioned COUNT <= 1.

## POS RESULT

PASS. Provision, replace (`occupancyDelta=0`), deactivate∥provision all COUNT <= cap. No POS occupancy table.

## ONBOARDING RESULT

PASS. Distinct owners 1+1. Same email unique. Helper not forced into register tx.

## ADMIN RESULT

POLICY G-09. Admin category/item skip documented. Restaurant admin create still occupancy-enforced. Not changed.

## PLAN CHANGE RESULT

POLICY G-11. Create-time cap holds. Existing COUNT may exceed the **new** cap after downgrade (`occupancy=1`, `newCap=0`, extra create rejected).

## CASCADE RESULT

ARCHITECTURE GAP CONFIRMED. Category INSERT can commit after restaurant DELETE (no FK). Orphan COUNT=1. Live-tenant occupancy still <= cap. No POS-specific workaround.

## IDEMPOTENCY RESULT

PASS where present (POS code / test key replay; conflicting fingerprint fail-closed). Catalog keys do not exist (G-12).

## FAILURE INJECTION RESULT

PASS. Rollback COUNT=0 after insert throw and related-insert throw.

## CROSS-TENANT RESULT

PASS. A/B/C each occupancy 1. Lock identity tenant-scoped.

## TRANSACTION BOUNDARY RESULT

PASS for live quantity creates: lock → COUNT → decide → insert → commit.  
Onboarding remains a separate tx by design.  
`getRestaurantById` before occupancy is the cascade TOCTOU (not a COUNT-then-create split).

## REQUIRED NOW

None.

## POLICY DECISIONS

G-09 admin category/item skip. G-10 inactive rows occupy. G-11 downgrade does not freeze excess.

## SAFE TO DEFER

G-12 catalog idempotency. Vocabulary limits without COUNT paths. Parent-exists-in-occupancy-tx. G-02 deploy. G-03 git.

## SHOULD NEVER BE INTRODUCED

POS lock/counter, Redis, app locks, global locks, occupancy ledger, hiding orphans from COUNT, wrapping onboarding by splitting its tx.

## TARGETED TESTS

`commercialLimitOccupancy.tidb.domainRaces.test.ts` 18  
`commercialLimitOccupancy.domainRaces.guards.test.ts` 10  

## REGRESSION TESTS

Occupancy + onboarding + cascade guards 21; occupancy unit 9.

## BUILD

PASS

## CHECK

193 `error TS*` (G-08 added 0; +5 vs claimed 188 are G-07 helpers)

## DATABASE MUTATION

stagIn synthetic G-08 rows only. Production 0.

## MIGRATION

NONE

## COMMIT

NONE

## PUSH

NONE

## DEPLOY

NONE

## REMAINING RISKS

- Occupancy application still not deployed (G-02). Production create paths remain check-then-act until deploy.
- Cascade orphan after parent delete (documented; not cap overflow).
- Admin category/item can exceed cap by policy (G-09).
- StagIn schema is older than Drizzle (`taxEnabled` missing; `pos_terminals` absent). Domain restaurant COUNT still raced via raw INSERT.

## NEXT PROGRAM

**STOP.** Do not start G-03, G-02, G-09, G-10, G-11, Final Commercial Occupancy Audit, Commercial Production Certification, or POS-READ-APIS-IMPLEMENTATION-1 unless explicitly authorized after reviewing G-08.

## FINAL

G-08 DOMAIN RACE TESTS — PASS. Occupancy never exceeded cap on real TiDB domain workflows. Cascade TOCTOU documented. No hardening. No Production mutation. No git.
