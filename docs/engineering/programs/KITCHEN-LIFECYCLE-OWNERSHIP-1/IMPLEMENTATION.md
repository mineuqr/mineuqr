# KITCHEN-LIFECYCLE-OWNERSHIP-1 — Kitchen Runtime Lifecycle Ownership Correction
## Phase C — Certification Report

> **SUPERSEDED IN PART by KITCHEN-READY-ACTION-UNIFICATION-1 (2026-09-06).**
> Kitchen Screen may now mark displayed orders Ready (`preparing → ready`).
> It does **not** gain serve-order or other lifecycle mutations.
> This document remains the historical certification of the observation-only rule.

**Program:** KITCHEN-LIFECYCLE-OWNERSHIP-1  
**Type:** Architecture Ownership Correction  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED** (Ready exclusion superseded)

---

## 1. Executive Summary

KITCHEN-LIFECYCLE-OWNERSHIP-1 removes the **Ready** (`mark-ready`) action from Kitchen Screens. After KITCHEN-ITEM-FILTERING-1, a kitchen station sees only a subset of order line items and cannot truthfully determine that the complete order is ready. The Ready capability is removed from the Kitchen Runtime UI — not hidden or disabled, but excluded at the runtime execution boundary. Expo and other roles retain unchanged lifecycle ownership. No API, database, order lifecycle, projection, filtering, or notification changes were made.

---

## 2. Problem Statement

Kitchen Screens originally displayed complete orders; marking an order Ready implied full execution ownership. Item-level category projection breaks that assumption: multiple kitchen stations may each see partial items from the same order. Allowing any station to transition the entire order to Ready would incorrectly transfer Order Lifecycle ownership to a partial execution workspace.

---

## 3. Architecture Decision

**Decision:** Exclude `mark-ready` from Kitchen Runtime action resolution via `KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS` in `deviceOrderExecutionCapabilities.ts`. Remove `mark-ready` from `mapKitchenTicketPresentation` available actions.

**Rationale:**
- Kitchen Runtime remains an **execution workspace**, not an order completion owner
- Mirrors existing pattern for `accept-order` exclusion (`OPERATIONAL_SCREEN_EXCLUDED_ACTIONS`)
- Server domain permissions unchanged (out of scope) — correction is at Kitchen Runtime UI boundary
- Expo retains `mark-ready` for assembly/handoff coordination

---

## 4. Architecture Impact

```
Before (preparing ticket on Kitchen Screen):
  resolveOperationalScreenAction("kitchen_display", "preparing") → mark-ready

After:
  resolveOperationalScreenAction("kitchen_display", "preparing") → null
  KitchenExecutionCard → no action button
```

**Unchanged:**
- Order Read Model and kitchen queue display (pending / preparing / ready columns)
- Item-level category filtering
- Runtime arrival notifications
- Expo `mark-ready` and Pickup `serve-order`
- Server `deviceOrderExecution` domain (API contract preserved)

---

## 5. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/interaction/deviceOrderExecutionCapabilities.ts` | Exclude `mark-ready` for `kitchen_display` |
| `client/src/lib/order-presentation/mapOrderPresentation.ts` | Remove `mark-ready` from kitchen ticket actions |
| `client/src/lib/operational-screen/interaction/__tests__/deviceOrderExecutionCapabilities.test.ts` | Updated expectations |
| `client/src/lib/order-presentation/__tests__/orderPresentationArchitecture.guards.test.ts` | Kitchen preparing has no mark-ready |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | KITCHEN-LIFECYCLE-OWNERSHIP-1 guard |
| `docs/engineering/programs/KITCHEN-LIFECYCLE-OWNERSHIP-1/IMPLEMENTATION.md` | This report |

**Not modified:** Server APIs, `deviceOrderExecution.ts`, order lifecycle, `KitchenScreenPanel` structure (continues using `resolveOperationalScreenAction`).

---

## 6. Validation Results

| Check | Result |
|-------|--------|
| Ready action absent from Kitchen Screen | ✓ `preparing` → null |
| No orphan kitchen UI references to mark-ready | ✓ |
| Filtered queue display unchanged | ✓ |
| Runtime notifications unchanged | ✓ |
| Expo mark-ready unchanged | ✓ |

---

## 7. Test Results

| Suite | Result |
|-------|--------|
| `deviceOrderExecutionCapabilities.test.ts` | Pass |
| `orderPresentationArchitecture.guards.test.ts` | Pass |
| `architectureGuards.test.ts` | Pass |
| `kitchenCategoryFilterPipeline.test.ts` | Pass |
| `kitchenArrivalNotification.test.ts` | Pass |

---

## 8. Build Results

```
npm run build — SUCCESS
```

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Kitchen Screen contains no Ready action | ✓ |
| Kitchen Runtime no longer owns order completion | ✓ |
| Runtime Projection unchanged | ✓ |
| Item Filtering unchanged | ✓ |
| Notifications unchanged | ✓ |
| No API regressions | ✓ |
| No scope creep | ✓ |

---

KITCHEN-LIFECYCLE-OWNERSHIP-1 satisfies all success criteria. Kitchen Screens remain execution workspaces that display filtered orders without claiming ownership of order completion.
