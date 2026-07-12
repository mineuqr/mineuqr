# KITCHEN-NOTIFICATION-ARCHITECTURE-1 — Kitchen Runtime Notification Architecture
## Phase C — Certification Report

**Program:** KITCHEN-NOTIFICATION-ARCHITECTURE-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-NOTIFICATION-ARCHITECTURE-1 introduces **one operational notification**: a single alert sound when a **new pending order** first becomes visible on a Kitchen Screen after Order Read Model projection and Kitchen Item Filtering. Notification decisions live in the runtime layer (`KitchenArrivalNotificationManager`), not in presentation components. Duplicate protection suppresses alerts on page refresh, reconnect, configuration reload, heartbeat, polling refresh, and status changes. No notification framework, settings, browser notifications, or API changes were introduced.

---

## 2. Problem Statement

Kitchen screens remain open for long periods. Staff may not constantly watch the display. A newly arriving order requires one attention signal — but only for genuine first arrivals, never for routine runtime maintenance events.

---

## 3. Architecture Decision

**Decision:** Add a runtime arrival notification manager wired from `useKitchenRuntimeStream` (after filtered queue is available). The UI consumes the filtered stream only; it does not decide or trigger notifications.

**Single notification type:** New Kitchen Order Arrival (pending column, first visibility on filtered projection).

**Audio:** One sound (`playKitchenOrderArrivalSound` → existing owner alert asset, volume 1). No settings.

---

## 4. Notification Flow

```
getKitchenQueue
        │
        ▼
normalizeKitchenReadModel
        │
        ▼
applyKitchenCategoryFilter (item projection)
        │
        ▼
buildKitchenRuntimeStream → filtered queue
        │
        ▼
resolveKitchenArrivalProcessMode
   ├─ skip (loading, stale, error, reconnecting)
   ├─ baseline (initial load, reconnect, config reload)
   └─ observe (normal poll)
        │
        ▼
processKitchenOrderArrivals (pending orderId diff)
        │
        ▼
playKitchenOrderArrivalSound (once per new orderId)
```

---

## 5. Duplicate Protection

| Event | Behavior |
|-------|----------|
| Page refresh | Baseline seeds existing pending orders — no sound |
| Reconnect | Baseline token includes `reconnectCount` — re-baseline, no sound |
| Configuration reload | Baseline token includes `configurationVersion` + `filterVersion` — re-baseline |
| Heartbeat / poll refresh | Same orderIds already announced — no sound |
| Status change (preparing/ready) | Order leaves pending; ID remains announced — no sound |
| Stale data | Processing skipped entirely — no sound |

---

## 6. Never Notify For

Heartbeat, reconnect, configuration reload, status changes (accept/preparing/ready/completed), ticket refresh, polling refresh, React re-renders, runtime restart (unless genuinely new pending tickets appear after baseline).

---

## 7. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/kitchen/kitchenArrivalNotification.ts` | Pure arrival diff + manager |
| `client/src/lib/operational-screen/kitchen/useKitchenArrivalNotifications.ts` | Runtime effect bridge |
| `client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts` | Wire arrival notifications |
| `client/src/lib/notificationSound.ts` | `playKitchenOrderArrivalSound()` |
| `client/src/lib/operational-screen/kitchen/__tests__/kitchenArrivalNotification.test.ts` | Regression tests |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | KITCHEN-NOTIFICATION guard |
| `docs/engineering/programs/KITCHEN-NOTIFICATION-ARCHITECTURE-1/IMPLEMENTATION.md` | This report |

**Not modified:** `KitchenScreenPanel.tsx`, server APIs, database schema, order lifecycle, expo/pickup/customer notifications.

---

## 8. Regression Test Summary

| Suite | Tests | Result |
|-------|-------|--------|
| `kitchenArrivalNotification.test.ts` | 10 | Pass |
| `architectureGuards.test.ts` (incl. KITCHEN-NOTIFICATION) | 38 | Pass |
| `kitchenCategoryFilterPipeline.test.ts` | 7 | Pass (unchanged) |

**Coverage:**
- Baseline seeds without arrivals
- Observe detects new pending orderId only
- No duplicate on polling refresh
- No notify on pending → preparing transition
- Skip during stale/reconnect/loading
- Baseline after reconnect and config reload
- Manager plays sound once for genuine arrival

---

## 9. Build Results

```
npm run build — SUCCESS
```

---

## 10. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Exactly one operational notification exists | ✓ |
| Plays only for newly arriving kitchen orders | ✓ |
| Duplicate notifications impossible | ✓ |
| Runtime owns notification decisions | ✓ |
| UI contains no notification business logic | ✓ |
| Kitchen Item Filtering continues working | ✓ |
| Runtime contracts unchanged | ✓ |
| No scope creep | ✓ |

---

KITCHEN-NOTIFICATION-ARCHITECTURE-1 Phase C satisfies all success criteria. Kitchen screens now emit one runtime attention event for genuine new order arrivals without introducing a notification framework or moving decision logic to the UI.
