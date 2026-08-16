# FINAL REPORT

**PROGRAM:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**STATUS:** PASS — PARENT-DELETE / CHILD-CREATE TOCTOU CLOSED  
**ROOT CAUSE:** Create validated the restaurant outside the persist transaction; delete did not lock the restaurant row; no FK. Occupancy serialization was intact. The child INSERT could commit after the parent was gone (G-08 P12: orphanCategories=1).  
**AFFECTED DOMAINS:** Restaurant lifecycle vs restaurant-owned child mutation (category, item, POS provision/replace, order, admin catalog insert). Commercial occupancy unchanged.  
**CHOSEN ARCHITECTURE:** Option A — restaurant-row `SELECT … FOR UPDATE` as the domain serialization point. FK (B) and extra locks (C) rejected.  
**LOCK ORDER:** Occupancy mutex → restaurant row on quantity creates. Restaurant row only on delete, admin catalog insert, and order insert. Delete never takes the occupancy mutex.

## CREATE/DELETE RACE RESULTS

Real TiDB, independent pools, `mineuqr-stagIn`, engine 8.0.11-TiDB-v8.5.3-serverless:

| Race | Outcome |
|------|---------|
| DELETE ∥ category CREATE | create rejected; restaurant 0; categories 0 |
| DELETE ∥ item CREATE | restaurant 0; items 0 |
| DELETE ∥ POS provision | restaurant 0; terminals 0 |
| DELETE ∥ POS replace | restaurant 0; terminals 0 |
| DELETE ∥ order CREATE | restaurant 0; orders 0 |
| DELETE ∥ DELETE | restaurant 0 |
| CREATE ∥ CREATE | restaurant 1; categories 2 = cap |
| CREATE ∥ DELETE ∥ CREATE | restaurant 0; categories 0 |
| G-08 P12 re-run | create rejected; orphanCategories 0; architectureGap false |

## ORPHAN RESULT

Covered races: **orphan_count = 0**.  
StagIn census (read-only): categories/menu_items/orders/offers/tables/holidays **0**; `pos_*` tables absent; G08-named category orphans **0**. No historical DELETE.

## CROSS-TENANT RESULT

PASS. Tenant A deleted; tenant B create succeeded (`elapsedMs=1549`); B restaurant 1 + category 1.

## ROLLBACK RESULT

PASS. Failure after lock+INSERT: categories 0, restaurant 1.

## FAILURE INJECTION RESULT

PASS (insert-then-throw). Other in-txn inject points share the same RC rollback.

## COMMERCIAL OCCUPANCY RESULT

PASS. Helper not modified. create∥create stayed at cap 2. Occupancy remains COUNT(*). 0094 unmodified.

## MIGRATION

NONE. 0094 not modified. No 0095. No FK added.

## PRODUCTION MUTATION

**0**

## TARGETED TESTS

TiDB TOCTOU 12; G-08 P12 1; restaurantRowLock unit 3; ownership guards 6; cascadeDeletes 10; POS orphan guards 2.

## REGRESSION TESTS

Occupancy guards 6 + domain-race guards 10 + occupancy unit 5. All passed.

## BUILD

PASS (`pnpm build`)

## CHECK

193 `error TS*` — unchanged vs G-08 helper baseline; this program added 0.

## COMMIT

NONE

## PUSH

NONE

## DEPLOY

NONE

## REMAINING RISKS

- Occupancy application still not deployed (G-02). Owner quantity creates take the parent lock only inside the occupancy txn (`tx` present).
- D-class inserts (offers, tables, holidays, POS grants, POS sale idempotency, CRMP/settlement) are not parent-locked in this program.
- StagIn schema is older than Drizzle (`taxEnabled` missing; `pos_terminals` absent). POS races used `occupancy_g07_terminals`.
- Admin category/item still skip occupancy (G-09 policy). They **do** take the parent lock.

## REQUIRED NOW

Parent-row serialization on delete and A-class creates; RC delete transactions; fail closed on missing parent.

## REQUIRED FOUNDATION FOR FUTURE

Same primitive on every restaurant-owned INSERT that must not outlive the parent; keep occupancy-then-restaurant lock order.

## SAFE TO DEFER

FK/0095; D-class domain programs; G-09/G-10/G-11; G-02 deploy; G-03 git.

## SHOULD NEVER BE INTRODUCED

POS-specific lifecycle locks; global locks; app-memory locks; Redis for local ownership; shadow orphan counters; Commercial-owned restaurant lifecycle; hiding orphans from COUNT(*); disabling deletes to avoid races.

## NEXT PROGRAM

**STOP.** Do not start G-09, G-10, G-11, Final Commercial Occupancy Audit, Commercial Production Certification, or POS-READ-APIS-IMPLEMENTATION-1 until this program is certified and reviewed.

## FINAL

COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1 — **PASS**. Root cause proven. Parent-row architecture prevents orphans on TiDB. Commercial occupancy and 0094 untouched. Production mutation 0. No git. No deploy.
