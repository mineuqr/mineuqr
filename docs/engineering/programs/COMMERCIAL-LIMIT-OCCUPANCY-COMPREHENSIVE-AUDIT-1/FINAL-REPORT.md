# FINAL REPORT

PROGRAM: COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1

STATUS: PASS — AUDIT CERTIFIED

MODE: READ ONLY

## EXECUTIVE SUMMARY

The shared occupancy primitive (tenant lock row + `FOR UPDATE` + `checkLimit` + domain COUNT + domain create) is the correct platform architecture. It is implemented locally and 0094 exists on Production `mineuqr`. **The deployed application does not use it yet.**

Local code still has occupancy-increasing paths that can break `occupancy ≤ cap`: **admin category/item create** (no lock), and **concurrent POS provisioned replace** (no lock). The replace race is **REQUIRED NOW**. Admin menu exceed is **POLICY DECISION REQUIRED** (constitution vs support-exceed). Onboarding first restaurant is an **intentional bootstrap** for current trial caps ≥ 1.

This audit did not implement fixes, migrate, deploy, commit, or push.

## CURRENT COMMERCIAL ARCHITECTURE

Catalog → Live Plan limits → `resolveOwnerEntitlements` → `checkLimit` (cap) → `withCommercialLimitOccupancy` (serialize) → domain COUNT → domain create. Ownership split is preserved on adopted paths.

## LIMIT RESOURCE INVENTORY

Enforced quantity: `restaurants`, `categories`, `items`, `posTerminals`.  
Vocabulary / feature only: `staffAccounts`, `branches`, `devices` (feature), `ordersPerMonth`, `qrCodes`, `storage`, `images`. No other quantity occupancy consumers found.

## OCCUPANCY DEFINITIONS

Restaurants: all owner rows (including inactive). Categories/items: all restaurant rows. POS: `registered`+`active` only.

## ALL OCCUPANCY-INCREASING PATHS

See `CREATE-PATH-AUDIT.md`. Principal: owner restaurant/category/item (helper); admin restaurant (helper); admin category/item (**bypass**); onboarding restaurant (**bootstrap**); POS register/activate-from-deactivated/replace-unprovisioned (helper); POS provisioned replace (**no helper**). No import/clone/bulk/jobs found.

## ALL OCCUPANCY-DECREASING PATHS

Hard delete restaurant/category/item; POS deactivate / replace-to-replaced. Soft flags do not release restaurant/menu occupancy. Cascade omits `pos_terminals`.

## TRANSACTION BOUNDARY RESULT

Adopted helper paths: COUNT+INSERT on the same Drizzle `tx`. **PASS**. POS provisioned replace and admin menu create: **FAIL**. `checkLimit` uses another connection for cap only — not a COUNT/INSERT split.

## CONCURRENCY RESULT

Helper **PROVEN** on isolated MySQL 8. **NOT PROVEN** on TiDB. Production runtime **not** using the helper. POS replace race **NOT PROVEN** because it bypasses the helper.

## TENANT ISOLATION RESULT

Lock and COUNT are tenant-scoped. **PASS** for adopted paths. Cross-tenant helper proof: MySQL 8.

## LOCK DESIGN RESULT

`commercial_limit_occupancy_locks` PK `(scopeKind, scopeId, limitKey)`. Token only. Production table exists, 0 rows. **PASS** vs forbidden designs.

## PRIVILEGED PATH RESULT

Admin restaurant create honors owner cap. Admin category/item skip quantity. PLATFORM_OWNER uses entitlements, not a quantity shortcut. **POLICY** on menu exceed.

## ONBOARDING RESULT

**E** for current Professional trial 0→1. **B** to fail closed if restaurants cap is 0.

## PLAN/SUBSCRIPTION RESULT

Current cap; keep existing rows; block new when COUNT+1 > cap; **no freeze**. **C** for freeze-on-downgrade.

## IDEMPOTENCY RESULT

Menu/restaurant retries do not overflow **if** helper is live. POS same-code register is idempotent under the lock. POS provisioned replace is **not**.

## POS CONSUMPTION RESULT

Shared helper for slot-consuming paths. **No** POS-specific commercial lock. Provisioned replace gap: **G-01 REQUIRED NOW**.

## OTHER COMMERCIAL CONSUMERS RESULT

Owner restaurant/category/item use the helper. Residual `db.create*` and admin menu inserts do not.

## PRODUCTION ALIGNMENT RESULT

Schema 0094 **PASS**. Runtime occupancy **NOT LIVE**. Local code **ahead** of git and of deployed app.

## TEST QUALITY RESULT

Helper concurrency **PROVEN** (MySQL). Domain races, TiDB, admin exceed, replace race, onboarding cap 0: **NOT PROVEN**.

## SCALABILITY RESULT

Tenant-scoped locks remain the right model. No global lock introduced.

## OPERABILITY RESULT

Business vs infra vs auth **collapsed** on POS (and occupancy-unavailable on menu). **B** for error semantics.

## API ERROR RESULT

Owner quota Arabic FORBIDDEN vs POS generic FORBIDDEN. Fail-closed math **PASS**. Client distinguishability **GAP**.

## BACKWARD COMPATIBILITY RESULT

APIs unchanged. Deploy order: app after 0094 (already applied).

## ARCHITECTURAL VIOLATIONS

None of: POS occupancy table, second counter, global lock, locking `commercial_limit_values`. G-09 is policy/constitution tension, not F.

## COMMERCIAL INVARIANT VIOLATIONS

- G-01 POS concurrent provisioned replace (local code).  
- G-02 Production deployed app still check-then-act.  
- G-09 admin menu create can set COUNT > cap (if treated as forbidden by policy).

## POLICY GAPS

G-09 admin menu exceed · G-10 inactive occupancy · G-11 downgrade freeze.

## REQUIRED NOW

- G-01 POS slot-neutral replace must take occupancy lock (`occupancyDelta: 0`) in the same transaction as insert+replace.

## REQUIRED FOUNDATION FOR FUTURE

G-02 deploy occupancy app · G-03 commit + governance terminus 0094 · G-04 onboarding cap guard · G-05 POS cascade · G-06 error mapping · G-07/G-08 TiDB + domain race proofs.

## SAFE TO DEFER — WITH JUSTIFICATION

G-12 create idempotency keys (no overflow with helper) · G-13 unimplemented quantity keys (no create path) · G-14 unused assert helpers · G-15 metrics · G-16 NODE_ENV test unlock (Production is not `test`).

## INTENTIONAL BYPASSES

G-17 onboarding 0→1 · G-18 checkLimit on separate connection for cap.

## RECOMMENDED REMEDIATION PROGRAMS

See `RECOMMENDED-REMEDIATION-ORDER.md`. First: POS slot-neutral lock, then commit/push, then application deploy, then onboarding/cascade/errors/TiDB, then policy programs, **then** POS-READ-APIS-IMPLEMENTATION-1.

## DEPENDENCY ORDER

G-01 → commit/deploy (G-03, G-02) → G-04…G-08 → G-09…G-11 policy → POS-READ-APIS-IMPLEMENTATION-1.

## FINAL ARCHITECTURAL DECISION

**KEEP** the shared Commercial occupancy primitive. **DO NOT** invent POS-specific locks or occupancy counters. **DO NOT** treat 0094 + helper + POS register as “platform complete.” Close G-01 before relying on Production occupancy. **DO NOT** start POS-READ-APIS-IMPLEMENTATION-1 from this program.

FINAL: STOP
