# CUSTOMER-UX-1C-IMPL — Ready Notification Implementation

**Status:** Complete  
**Scope:** Client-side ready alerts on `OrderStatusPage` (polling-only)

---

## Architecture Summary

```text
OrderStatusPage poll (8s)
  → useReadyStatusAlerts
       → isReadyTransition(prev, ready)
       → deliverReadyAlertTier(1) — sound + vibrate + Notification
       → schedule 30s → deliverReadyAlertTier(2) unless acknowledged
       → sessionStorage per trackingToken (alert1Sent, alert2Sent, acknowledged)
```

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
| pending → preparing → ready | Alert 1, +30s Alert 2 | `isReadyTransition` + scheduler |
| pending → ready | Alert 1, +30s Alert 2 | Same |
| ready → refresh | No duplicate | `initializedRef` + `alert1Sent` |
| ready → user tap | Cancel Alert 2 | `acknowledgeReadyAlerts` |
| ready → served | No new alerts | terminal timer clear |

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
