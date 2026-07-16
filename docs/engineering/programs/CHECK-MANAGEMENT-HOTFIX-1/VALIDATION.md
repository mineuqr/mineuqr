# CHECK-MANAGEMENT-HOTFIX-1 — Validation & Certification

**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## 1. Schema mapping verification

| Check | Result |
|-------|--------|
| Generated list SQL includes `` `taxMode` `` | **PASS** |
| Generated list SQL includes `` `tax_mode` `` | **Absent** (correct) |
| Generated tax update SQL includes `` `taxMode` `` | **PASS** |
| Generated tax update SQL includes `` `tax_mode` `` | **Absent** (correct) |

---

## 2. Runtime path verification (live DB, read-only)

| Gate | Result |
|------|--------|
| `restaurant.list` (Drizzle `getRestaurantsByUser` path) | **PASS** — userId=1 → **2** restaurants |
| Dashboard bootstrap tax fields on list rows | **PASS** — `taxEnabled`, `taxMode`, `taxPolicyJson` readable |
| Restaurant settings load (`select` by id) | **PASS** — id 720007 loads with tax defaults |
| Tax settings update SQL mapping | **PASS** — `UPDATE ... SET taxEnabled, taxMode, taxPolicyJson` |

Sample list payload (userId=1):

| id | nameAr | taxEnabled | taxMode |
|----|--------|------------|---------|
| 720007 | خالد | false | exclusive |
| 870001 | فندق خالد | false | exclusive |

---

## 3. Architecture guards / tests

```
operationalSession.architecture.guards.test.ts     5 passed
checkManagement.architecture.guards.test.ts        7 passed
checkMoney.test.ts                                 5 passed
freezePolicy.test.ts                               2 passed
migrationGovernance.test.ts                       10 passed
resolveOperationalSession.test.ts                  3 passed
sessionActions.test.ts                             6 passed
sessionService.test.ts                            14 passed

Test Files  8 passed
Tests       52 passed
```

| Gate | Result |
|------|--------|
| Architecture Guards | **PASS** |
| Check Unit Tests | **PASS** |
| Migration Governance | **PASS** |
| Dining Session (sessionService + sessionActions) | **PASS** |

---

## 4. Build + health

| Gate | Result |
|------|--------|
| `pnpm build` | **PASS** |
| App start | **PASS** — `Server running on http://localhost:3000/` |
| `system.health` | **PASS** — `{"ok":true}` |

---

## 5. Certification checklist

| Criterion | Status |
|-----------|--------|
| Drizzle mapping aligned to production `taxMode` | **PASS** |
| No new migration | **PASS** |
| No DB column rename | **PASS** |
| No Check / Session / Runtime / Dashboard redesign | **PASS** |
| `restaurant.list` operational | **PASS** |
| Restaurant settings + tax field mapping operational | **PASS** |
| Architecture guards | **PASS** |
| Production build | **PASS** |
| `system.health` = ok:true | **PASS** |

---

## 6. Final certification

**CHECK-MANAGEMENT-HOTFIX-1 — PRODUCTION CERTIFIED**

Surgical schema mapping fix only. Repository is ready for git commit when requested.
