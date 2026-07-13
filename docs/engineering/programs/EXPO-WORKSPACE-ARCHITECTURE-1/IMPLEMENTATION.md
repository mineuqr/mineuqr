# EXPO-WORKSPACE-ARCHITECTURE-1 — Expo Workspace Runtime Architecture
## Phase C — Certification Report

**Program:** EXPO-WORKSPACE-ARCHITECTURE-1  
**Type:** Architecture Formalization  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

EXPO-WORKSPACE-ARCHITECTURE-1 establishes Expo as the **Final Operational Coordination Workspace** — the exclusive operational-screen owner of the **Ready** (`mark-ready`) transition after Kitchen Runtime became execution-only (KITCHEN-LIFECYCLE-OWNERSHIP-1). This program documents ownership boundaries, validates capability and presentation contracts, and adds regression guards. No API, database, UI redesign, or runtime pipeline changes were made.

---

## 2. Architecture Goal

Expo coordinates completed kitchen work, validates operational completeness, and performs the final Ready transition. Expo does not prepare food, filter kitchen categories, or duplicate Kitchen execution responsibilities.

---

## 3. Runtime Flow

```
Order
  ↓
Order Read Model
  ↓
Runtime Projection
  ↓
Kitchen Runtime (execution — item filtering, arrival notifications)
  ↓
Kitchen Execution
  ↓
Expo Runtime (coordination workspace)
  ↓
Final Operational Review
  ↓
Mark Ready  ← exclusive Expo ownership on operational screen
  ↓
Pickup (serve-order on ready)
```

---

## 4. Capability Audit

| Role | `mark-ready` on operational screen | Notes |
|------|-----------------------------------|-------|
| `expo_display` | **YES** (preparing → ready) | Exclusive owner |
| `kitchen_display` | **NO** | Blocked by `KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS` |
| `pickup_display` | **NO** | Owns `serve-order` on ready only |
| `customer_display` | **NO** | Blocked role |
| `print_monitor` | **NO** | Blocked role |
| `self_ordering_kiosk` | **NO** | Blocked role |

**Server domain** (`deviceOrderExecution.ts`) retains historical role permissions for API compatibility. **Runtime UI** enforces ownership via `resolveOperationalScreenAction`.

---

## 5. Presentation Audit

| Layer | Ownership source | Finding |
|-------|------------------|---------|
| Operational screen cards | `resolveOperationalScreenAction(role, status)` | Authoritative — Expo gets `mark-ready` on preparing |
| `mapKitchenTicketPresentation` | Shared mapper for kitchen/expo queue | Does **not** advertise `mark-ready` — avoids presentation ambiguity |
| Kitchen panel | `KitchenScreenPanel` + runtime resolver | No hardcoded lifecycle actions |

Expo and Kitchen share `KitchenScreenPanel` presentation surface; **capability differentiation is runtime-resolved by role**, not duplicated presentation components.

---

## 6. Expo Runtime Responsibilities

**Owns:**
- Final operational review
- Order completion (Ready transition)
- Operational coordination
- Pickup handoff preparation (`serve-order` on ready)

**Does NOT own:**
- Kitchen execution / category filtering / arrival notifications
- Order acceptance (Orders Workspace)
- Authentication, pairing, runtime provisioning

---

## 7. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/expo/expoWorkspaceContract.ts` | Ownership contract |
| `client/src/lib/operational-screen/expo/__tests__/expoWorkspaceArchitecture.test.ts` | Capability + presentation tests |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | EXPO-WORKSPACE guard |
| `client/src/lib/operational-screen/roles/roleDefinitions.ts` | Expo role description |
| `docs/engineering/programs/EXPO-WORKSPACE-ARCHITECTURE-1/IMPLEMENTATION.md` | This report |

**Not modified:** Kitchen runtime, notifications, APIs, database, order lifecycle.

---

## 8. Regression Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `expoWorkspaceArchitecture.test.ts` | 6 | Pass |
| `architectureGuards.test.ts` | 42 | Pass |
| `deviceOrderExecutionCapabilities.test.ts` | 3 | Pass |
| `kitchenArrivalNotification.test.ts` | 12 | Pass |

---

## 9. Relationship to Prior Programs

| Program | Relationship |
|---------|--------------|
| KITCHEN-LIFECYCLE-OWNERSHIP-1 | Removed Kitchen `mark-ready`; Expo inherits completion |
| KITCHEN-ITEM-FILTERING-1 | Kitchen partial projection — why Kitchen cannot complete orders |
| KITCHEN-NOTIFICATION-ARCHITECTURE-1 | Kitchen-only; Expo has no arrival notifications |

---

## 10. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Expo established as Final Operational Coordination Workspace | ✓ |
| Order completion ownership only in Expo (operational screen) | ✓ |
| Kitchen remains execution-only | ✓ |
| Ownership boundaries explicit | ✓ |
| Presentation models reflect runtime ownership | ✓ |
| No runtime regressions | ✓ |
| No API changes | ✓ |
| No scope creep | ✓ |

---

EXPO-WORKSPACE-ARCHITECTURE-1 satisfies all success criteria. Expo is the certified owner of the Ready transition on the operational screen; Kitchen remains execution-only with explicit, guarded boundaries.
