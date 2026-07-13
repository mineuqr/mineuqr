# KITCHEN-ARRIVAL-SEMANTICS-1 — Kitchen Arrival Semantics Amendment
## Phase C — Certification Report

**Program:** KITCHEN-ARRIVAL-SEMANTICS-1  
**Type:** Architecture Amendment  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-ARRIVAL-SEMANTICS-1 amends the certified arrival definition from **first pending column appearance** to **first visibility in the filtered Kitchen Runtime projection**. Arrival detection now diffs order IDs across all pipeline columns (`pending`, `preparing`, `ready`) after item filtering. Duplicate protection, baseline/reconnect behavior, notification manager, audio priming, and runtime contracts are unchanged.

---

## 2. Architecture Amendment

| Before | After |
|--------|-------|
| Arrival = order enters `columns.pending` | Arrival = first time order appears anywhere in filtered runtime queue |
| `collectFilteredPendingOrderIds` | `collectFilteredVisibleOrderIds` |
| State: `announcedPendingOrderIds` | State: `announcedVisibleOrderIds` |

**Official definition:**

> The first time an Order becomes visible on a specific Kitchen Screen after Runtime Projection and Kitchen Item Filtering.

---

## 3. Runtime Execution Flow

```
getKitchenQueue
        ↓
normalizeKitchenReadModel
        ↓
applyKitchenCategoryFilter (item projection)
        ↓
collectFilteredVisibleOrderIds (pending + preparing + ready)
        ↓
resolveKitchenArrivalProcessMode
        ↓
processKitchenOrderArrivals (diff vs announcedVisibleOrderIds)
        ↓
playKitchenOrderArrivalSound (unchanged)
```

---

## 4. Duplicate Protection (Unchanged)

| Event | Behavior |
|-------|----------|
| Page refresh | Baseline seeds visible orders — no sound |
| Reconnect | Re-baseline via `reconnectCount` — no sound |
| Config / filter reload | Re-baseline via token — no sound |
| Heartbeat / poll refresh | Same orderId already announced — no sound |
| Column transition (pending → preparing → ready) | Same orderId — no re-notification |
| Previously announced order | No sound |

---

## 5. Production Flow Addressed (RC-1)

```
Order Created → Orders Workspace accepts → Preparing
        ↓
Kitchen poll sees order in preparing column (first visibility)
        ↓
Arrival event → notification (when observe mode + gesture primed)
```

---

## 6. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/kitchen/kitchenArrivalNotification.ts` | Visibility semantics |
| `client/src/lib/operational-screen/kitchen/__tests__/kitchenArrivalNotification.test.ts` | Regression tests |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | Semantics guard |
| `docs/engineering/programs/KITCHEN-ARRIVAL-SEMANTICS-1/IMPLEMENTATION.md` | This report |

**Not modified:** `useKitchenArrivalNotifications.ts`, `notificationSound.ts`, item filtering, notification manager policy, APIs, UI.

---

## 7. Regression Test Summary

| Test | Coverage |
|------|----------|
| `collectFilteredVisibleOrderIds` | All three columns |
| Pending first appearance | Notification fires |
| Preparing first appearance | Notification fires |
| Column transition | No re-notification |
| Polling refresh | No duplicate |
| Reconnect baseline | Suppresses sound |
| Config reload baseline | Suppresses sound |

**Results:** 12/12 pass in `kitchenArrivalNotification.test.ts`; architecture guards 41/41 pass.

---

## 8. Relationship to Prior Programs

| Program | Relationship |
|---------|--------------|
| KITCHEN-NOTIFICATION-ARCHITECTURE-1 | Amended § arrival definition only |
| KITCHEN-ARRIVAL-SOUND-FORENSICS-1 | RC-1 resolved by this amendment |
| KITCHEN-AUDIO-PRIMING-ALIGNMENT-1 | Unchanged (RC-2 already fixed) |
| KITCHEN-ITEM-FILTERING-1 | Visibility scoped to filtered projection |

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Arrival = first filtered runtime visibility | ✓ |
| Pending status not determining factor | ✓ |
| One notification per first appearance | ✓ |
| Duplicate protection intact | ✓ |
| No runtime redesign | ✓ |
| No notification redesign | ✓ |
| No scope creep | ✓ |

---

KITCHEN-ARRIVAL-SEMANTICS-1 satisfies all success criteria. Kitchen arrival notifications now align with post-filtering runtime visibility rather than pending lifecycle state.
