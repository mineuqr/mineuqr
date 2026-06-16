# CUSTOMER-UX-1C-IMPL — Ready Notification Implementation

**Status:** Complete  
**Scope:** Client-side ready alerts on `OrderStatusPage` (polling-only)

---

## Architecture Summary

```text
OrderStatusPage poll (8s)
  → useReadyStatusAlerts
       → isReadyTransition(prev, ready)
       → deliverReadyAlertTier — sound + vibrate + Notification (tier-1 only)
       → sessionStorage per trackingToken (alert1Sent, alert1NotificationDelivered)
```

> **READY-TIER2-REMOVAL-1:** The 30s tier-2 follow-up reminder was removed. Customer journey is a single READY alert.

No server, WebSocket, or push infrastructure added.

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/lib/notificationSound.ts` | **New** — Web Audio high/medium |
| `client/src/lib/readyNotification.ts` | **New** — alerts, vibration, session state |
| `client/src/lib/readyNotification.test.ts` | **New** — unit tests |
| `client/src/hooks/useReadyStatusAlerts.ts` | **New** — transition + scheduling hook |
| `client/src/pages/OrderStatusPage.tsx` | Hook integration + UI hint |

---

## Browser Compatibility

| Channel | Android Chrome | Desktop Chrome | iPhone Safari |
|---------|----------------|----------------|---------------|
| Sound | ✅ (after gesture) | ✅ | ✅ (after gesture) |
| Vibration | ✅ 2s / 1s | ignored | N/A |
| System notification | ✅ | ✅ | best-effort |
| In-page hint | ✅ | ✅ | ✅ |

---

## Test Results

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `readyNotification.test.ts` (5) | PASS |
| `orderStatusDisplay.test.ts` (6) | PASS |
| `order-get-public-status.test.ts` (3) | PASS |

### Verification matrix (manual)

| Scenario | Expected | Implementation |
|----------|----------|------------------|
| pending → preparing → ready | Single READY alert | `isReadyTransition` + tier-1 delivery |
| pending → ready | Single READY alert | Same |
| ready → refresh | No duplicate | `initializedRef` + `alert1Sent` |
| ready → served | No new alerts | terminal status only |

---

## Production Impact

| Area | Impact |
|------|--------|
| Database | None |
| API | None |
| Deploy | Client-only |
| Risk | Low — additive UX on tracking page |

---

## Out of Scope (deferred)

`CUSTOMER-UX-1C-CARRY-1` — background notifications, service workers, PWA.
