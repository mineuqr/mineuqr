# COMPATIBILITY-DEPENDENCY-ELIMINATION-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-020 Financial Settlement Platform  
**Prior:** COMPATIBILITY-READINESS-VALIDATION-1 → **NO-GO**  
**Code policy:** Dependencies removed; compatibility layers **retained** (unused by production)

---

## Architecture Notes

This program does **not** perform Compatibility Cleanup. It makes production financially correct **without requiring** dual-write, Session money façades, or Session-scan discovery under default flags.

| Mechanism | Role after this program |
|-----------|-------------------------|
| Authoritative `enrollOrderInCheck` / `enrollOrderForSessionCheck` / `syncSessionOrdersToCheck` / `deactivateMembershipsOnCheckVoid` | **Production membership ownership** |
| Dual-write helpers (`dualWrite*`) | Compatibility mirrors — flag-gated; **not called by production** |
| `CHECK_MEMBERSHIP_DUAL_WRITE` | Remains default ON; production no longer depends on it |
| Session-scan money | Isolated as `loadOrdersSubtotalCompatibilitySessionScan` — only if authoritative flag OFF |
| Session `voidCheck` façade | Retained; **no production caller** (lifecycle uses `voidCheckById`) |
| `ops.getSettlement*` | Soft-sunset APIs retained; **no production UI/runtime consumer** |
| Session Aggregate / Session APIs | Unchanged operational context (ADR-020) |

---

## 1. Dependencies removed (production no longer requires)

| # | Dependency | Replacement |
|---|------------|-------------|
| 1 | `dualWriteEnrollOrderForSession` on Session order create | `enrollOrderForSessionCheck` (not dual-write gated) |
| 2 | `dualWriteSyncSessionOrdersToCheck` on Check create/ensure | `syncSessionOrdersToCheck` (authoritative) |
| 3 | `dualWriteDeactivateMembershipsOnVoid` on void finalize | `deactivateMembershipsOnCheckVoid` (authoritative) |
| 4 | Production dependence on Session-scan money under default flags | Membership discovery; Session scan isolated + flag-gated OFF path only |
| 5 | `voidOperationalSessionCheck` → Session `voidCheck` façade | `voidCheckById` via `activeCheckId` / ensure |
| 6 | Soft-sunset `ops.getSettlement*` as reporting path | Already zero production callers; guards reaffirm Check Revenue |

Dual-write flag was **not** globally disabled. Compatibility dual-write code was **not** deleted.

---

## 2. Runtime paths migrated

| Channel / path | Before | After |
|----------------|--------|-------|
| Waiter / QR table OrderCreated → aggregates | `dualWriteEnrollOrderForSession` | `enrollOrderForSessionCheck` |
| Table Check create / ensure | `dualWriteSyncSessionOrdersToCheck` | `syncSessionOrdersToCheck` |
| Check void finalize | `dualWriteDeactivateMembershipsOnVoid` | `deactivateMembershipsOnCheckVoid` |
| Counter / sessionless place | Already `ensureCheckForOrder` (M5) | Unchanged (authoritative) |
| OrderSessionConsumer sessionless | Already `ensureCheckForOrder` (M5) | Unchanged |
| Dashboard settle | Already `*ById` (M5) | Unchanged |
| Operational Session void | `voidCheck(sessionId)` | `voidCheckById(checkId)` |
| Check money discovery (default) | Membership (M3) | Membership; Session scan renamed/isolated |
| Kitchen / Expo / Pickup / Printing | Operational only | Unchanged |
| Canonical Reporting | Check Revenue | Unchanged |
| Admin backfill CLIs | Migration tooling | Unchanged (not production runtime) |

---

## 3. Remaining compatibility code (intentionally kept)

| Component | Status |
|-----------|--------|
| `dualWriteEnrollOrderForSession` / `dualWriteSyncSessionOrdersToCheck` / `dualWriteDeactivateMembershipsOnVoid` | Present; flag-gated; **unused by production callers** |
| `CHECK_MEMBERSHIP_DUAL_WRITE` env (default ON) | Present; production correctness independent of it |
| `settleCheckPaid` / `settleCheckComplimentary` / `voidCheck` Session façades | Present; settle façades unused by Dashboard; void façade unused by lifecycle |
| `loadOrdersSubtotalCompatibilitySessionScan` | Present; entered only when authoritative read flag is OFF |
| `ops.getSettlement*` procedures | Present; soft-sunset; no Dashboard/Waiter/reporting-platform consumers |
| Session Aggregate + public `session.*` APIs | Operational (not compatibility cleanup targets) |
| `TABLE_SESSION_DUAL_WRITE` | Session Platform attach flag — out of Membership dual-write scope; still operational Session attach |

---

## 4. Proof production does not require remaining compatibility

| Proof | Evidence |
|-------|----------|
| Table enroll without dual-write | `enrollOrderForSessionCheck` / `syncSessionOrdersToCheck` have no `dualWriteEnabled()` gate; unit test enrolls with `dualWriteEnabled=false` |
| Production callers do not import dual-write helpers | Architecture guard: CheckService / sessionAggregateWriters contain authoritative APIs and **not** `dualWrite*` |
| Void without Session façade | `operationalSessionLifecycle` uses `voidCheckById` only; unit tests cover activeCheckId + ensure paths |
| Default money path ignores Session scan | Default `CHECK_MEMBERSHIP_AUTHORITATIVE_READ !== "false"` → Membership; Session scan only in isolated helper when flag OFF |
| Soft-sunset settlement unused by product UI | Dashboard/Waiter/Reports forbid `ops.getSettlement*`; BusinessMetricsService has no settlementMetrics import |
| Dual-write remains available | Helpers + flag still exist (cleanup not performed) |

**Thought experiment:** If `CHECK_MEMBERSHIP_DUAL_WRITE=false` tomorrow without further code changes, table Membership enrollment, Check sync, and void deactivate continue via authoritative APIs.

---

## 5. Recommendation

**Re-run `COMPATIBILITY-READINESS-VALIDATION-1`.**

Expected outcome shift: prior blockers B1 (dual-write enrollment), B3 (void façade), B4 (ops settlement consumers), and B5 (Check create sync) should clear as **production dependencies**. Remaining validation should focus on:

- Whether Compatibility Cleanup may **delete** unused dual-write / façades / soft-sunset APIs (separate GO decision).  
- Whether `TABLE_SESSION_DUAL_WRITE` and Session operational APIs are incorrectly classified as Membership compatibility (they are not).  
- Soak evidence that dual-write OFF is safe in production telemetry.

Do **not** begin Compatibility Cleanup until that re-validation returns **GO**.

---

## Validation (tests)

| Suite | Result |
|-------|--------|
| `checkMembershipService.test.ts` | Authoritative enroll/sync with dual-write OFF |
| `CheckService.m3/m4/m5` | Sync/deactivate authoritative |
| `operationalSessionLifecycle.voidById.test.ts` | Void ById |
| `sessionAggregateWriters.test.ts` | Writers with authoritative enroll mocked |
| `compatibilityDependencyElimination.architecture.guards.test.ts` | Production independence guards |
| M1/M3/M5 architecture guards | Updated |

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| Every production runtime path operates without depending on compatibility mechanisms | **Yes** (under default flags) |
| Compatibility code may still exist | **Yes** |
| Dual-write not globally disabled | **Yes** |
| Session Aggregate / APIs not removed | **Yes** |
| No Compatibility Cleanup performed | **Yes** |
| Recommend re-run readiness validation | **Yes** (§5) |
