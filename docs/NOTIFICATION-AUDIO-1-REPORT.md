# NOTIFICATION-AUDIO-1 — Notification Sound Standardization

**Status:** Complete

---

## 1. Discovery Audit

### Notification-related files

| File | Purpose | Current sound (pre-change) | Trigger |
|------|---------|---------------------------|---------|
| `client/src/components/OrderAlertSystem.tsx` | Owner dashboard new-order alerts (poll) | Inline Web Audio triple-tone | `notificationType === "new_order"` |
| `client/src/pages/Dashboard.tsx` (Orders section) | Order list length change | **No-op stub** (`audioRef.play = () => {}`) | `orders.length` increase |
| `client/src/lib/readyNotification.ts` | Customer READY delivery | `playCustomerAlertSound()` | `pending/preparing → ready` transition |
| `client/src/hooks/useReadyStatusAlerts.ts` | READY alert orchestration | Via `deliverReadyAlertTier` | Status poll on tracking page |
| `client/src/pages/OrderStatusPage.tsx` | Customer tracking UI | Sound via hook (no direct audio) | READY transition |
| `client/src/pages/Notifications.tsx` | Notification history UI | None | N/A (display only) |
| `server/routers.ts` / `server/db.ts` | Server notification records | None (server-side) | Order/create events |

### Audio-related files

| File | Purpose | Sound | Trigger |
|------|---------|-------|---------|
| `client/src/lib/notificationSound.ts` | Central customer + owner playback | Web Audio synthesized tones | `playCustomerAlertSound`, `playOwnerNotificationSound` |
| `client/src/lib/readyNotificationDiagnostics.ts` | DEV logging only | None | Delivery events |
| `client/src/lib/audioAssets.ts` | **New** asset constants | N/A | N/A |

### Sound assets (pre-change)

| Asset | Location |
|-------|----------|
| None | No `.wav` / `.mp3` files in repo |

### Web Audio API usage

| Location | Usage |
|----------|--------|
| `notificationSound.ts` | Customer two-beep pattern + owner fallback triple-tone |
| `OrderAlertSystem.tsx` (removed) | Was inline triple-tone for new orders |

### HTML Audio (`Audio()`) usage

| Location | Usage |
|----------|--------|
| `Dashboard.tsx` | Stub only (no real playback) |
| `notificationSound.ts` | **New** primary playback for WAV assets |

### Notification trigger paths

```
Owner new order:
  notification.getUnread poll → OrderAlertSystem → playOwnerNotificationSound()

Customer READY:
  order.getPublicStatus poll → useReadyStatusAlerts → deliverReadyAlertTier
    → playCustomerAlertSound("high" | "medium")
```

**Not wired to sound today:** Received, Preparing, Delivered, service requests (future), call waiter (future).

---

## 2. Minimal Change Plan

| File | Action | Rationale |
|------|--------|-----------|
| `client/public/audio/*.wav` | **Add** | Host Mixkit assets |
| `client/src/lib/audioAssets.ts` | **Add** | Central `AUDIO_ASSETS` constant |
| `client/src/lib/notificationSound.ts` | **Modify** | HTML Audio primary + preserve Web Audio fallback |
| `client/src/components/OrderAlertSystem.tsx` | **Modify** | Use `playOwnerNotificationSound()` (remove duplicate inline Web Audio) |
| `client/src/lib/notificationSound.test.ts` | **Modify** | Asset + fallback tests |
| `client/src/lib/audioAssets.test.ts` | **Add** | Path constants |

**Did not change:** `readyNotification.ts`, hooks, session logic, visual fallback, routing, API, Dashboard noop audioRef (avoids duplicate playback with OrderAlertSystem).

**No central constant existed** before; `audioAssets.ts` added per approved structure.

---

## 3. Implementation Summary

### Assets

```
client/public/audio/mixkit-airport-announcement-ding-1569.wav   → OWNER_ALERT
client/public/audio/mixkit-clock-countdown-bleeps-916.wav     → CUSTOMER_READY
```

### Constants

```ts
export const AUDIO_ASSETS = {
  OWNER_ALERT: "/audio/mixkit-airport-announcement-ding-1569.wav",
  CUSTOMER_READY: "/audio/mixkit-clock-countdown-bleeps-916.wav",
};
```

### Playback strategy

1. Try `HTMLAudioElement` with cached asset
2. Fall back to existing Web Audio synthesized tones if `Audio` unavailable or throws

| Function | Primary asset | Fallback |
|----------|---------------|----------|
| `playOwnerNotificationSound()` | `OWNER_ALERT` | Owner triple-tone Web Audio |
| `playCustomerAlertSound("high")` | `CUSTOMER_READY` vol 1.0 | Customer two-beep pattern |
| `playCustomerAlertSound("medium")` | `CUSTOMER_READY` vol 0.65 | Softer two-beep pattern |

Customer READY only — no other statuses use `playCustomerAlertSound`.

---

## 4. Validation Results

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `audioAssets.test.ts` (1) | PASS |
| `notificationSound.test.ts` (7) | PASS |
| `readyNotification.test.ts` (6) | PASS |

| Requirement | Status |
|-------------|--------|
| Owner alerts → airport-announcement-ding | ✅ via `playOwnerNotificationSound` |
| READY → countdown-bleeps | ✅ via `playCustomerAlertSound` |
| No duplicate owner sound path | ✅ OrderAlertSystem inline Web Audio removed |
| Web Audio fallback preserved | ✅ |
| No architecture / API / routing changes | ✅ |

**Manual QA post-deploy:** New order on dashboard → ding sound; customer READY after activation → bleep sound.

---

## 5. Production Risk Assessment

| Area | Impact |
|------|--------|
| Risk | **Low** — sound source swap only |
| Bundle | +~1.7 MB static WAV assets |
| Regressions | Notification flow unchanged; fallback if assets fail to load |
