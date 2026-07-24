# REGISTER-OPERATIONS-SIMPLIFICATION-1 — Final Certification

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-SIMPLIFICATION-1 |
| **Date** | 2026-07-25 |
| **Status** | **CERTIFIED** |

---

## 1. Executive Summary

Register Operations UI is now adaptive: **one catalog-active Register → simple layout**; **two or more → advanced selector**. Internal IDs are hidden. Operator/device cards use friendly session/browser language. Primary actions are state-adaptive (open / close / resume only). Domain, API, and database are unchanged.

## 2. Presentation Audit

See [PRESENTATION-AUDIT.md](./PRESENTATION-AUDIT.md).

## 3. Adaptive UI Specification

| Condition | Layout |
|-----------|--------|
| 0 registers | Empty create → Catalog |
| Registers exist, 0 active | Empty activate → Catalog |
| Exactly 1 active | Simple: no selector; read-only “الصندوق · {displayName}” |
| 2+ active | Advanced: searchable selector + suspend + history |

Helpers: `registerOperationsAdaptive.ts`.

## 4. Screen Comparison (Before / After)

| Before | After |
|--------|-------|
| Always show register list | List only in advanced mode |
| Operator / Device ID inputs | Removed; friendly cards |
| Open + Suspend + Resume + Close always | One primary action by duty state |
| Version / raw shift ids | Hidden from primary UI |
| Station mode toggle | Removed from simple ops surface |

## 5. Accessibility Results

| Check | Status |
|-------|--------|
| RTL `dir` | Met |
| Primary action labels | Met |
| Status cards labeled | Met |
| Empty CTAs explained when disabled | Met |
| Touch-friendly primary button (`station`) | Met |
| `data-layout-mode` for diagnostics | Met |

## 6. UX Improvements

- Arabic-first operational wording
- Current user name/role/avatar initials (no numeric IDs)
- “هذا الجهاز” + browser/platform
- Catalog activate guidance when not active
- Open uses session user id as API `operatorUserId` (presentation binding only)

## 7. Regression Results

| Area | Status |
|------|--------|
| Still `crmp.register.*` only for Duty | **PASS** (guards) |
| Catalog navigation preserved | **PASS** |
| No `@shared/crmp` in UI | **PASS** |
| Domain / API / DB | **Unchanged** |

## 8. Test Results

| Suite | Result |
|-------|--------|
| Adaptive helpers | **6/6** |
| View model (no IDs) | **4/4** |
| Error presentation | **3/3** |
| Architecture guards | **5/5** |
| **Total** | **18/18 PASS** |

## 9. Production Readiness

Presentation-ready. Operators with a single activated Register see a simplified duty screen. Multi-register restaurants retain an advanced layout automatically.

## 10. Final Certification

**REGISTER-OPERATIONS-SIMPLIFICATION-1 is CERTIFIED.**

STOP conditions: none triggered.
