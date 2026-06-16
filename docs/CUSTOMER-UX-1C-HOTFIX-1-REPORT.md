# CUSTOMER-UX-1C-HOTFIX-1 — Notification Delivery Reliability

**Status:** Complete  
**Scope:** Client-side hotfix on `OrderStatusPage` (polling architecture unchanged)

---

## 1. Executive Summary

Production testing showed **READY transition logic works**, but delivery channels behaved inconsistently:

| Platform | Sound | System notification | UI hint |
|----------|-------|---------------------|---------|
| Desktop Chrome | Often works | Often fails | Showed on sound alone (misleading) |
| Android Chrome | Unreliable | Unreliable | Showed falsely |
| iPhone Safari | Unreliable | Unsupported / best-effort | Showed falsely |

**Root cause (revised):** Audio and notification are **independent channels**. Desktop Chrome can play sound while `Notification.permission` remains `"default"` (permission requested from `useEffect` without user gesture) or while the browser suppresses OS toasts for a focused tab. The UI hint used `sound || notification || vibrate`, so sound-only success displayed “تم إرسال تنبيه لك” even when no system notification appeared.

**Hotfix delivers:**

- **1A** — Explicit “Enable alerts” banner; permission + audio unlock only on tap
- **1B** — Sound reports success only when `AudioContext.state === "running"`
- **1C** — Hint shows only when `delivery.notification === true`; session restores `alert1NotificationDelivered` not `alert1Sent`
- **1D** — READY visual attention banner + green ring (works without browser APIs)
- **1E** — Dev-only `console.info` per-channel diagnostics

---

## 2. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/notificationSound.ts` | `ensureNotificationAudioReady()`, running-state check, test reset |
| `client/src/lib/readyNotification.ts` | Gesture activation, per-channel session fields, gated delivery |
| `client/src/lib/readyNotificationDiagnostics.ts` | **New** — DEV-only logging |
| `client/src/lib/notificationSound.test.ts` | **New** — audio reliability tests |
| `client/src/lib/readyNotification.test.ts` | Updated session schema + skip-when-not-activated |
| `client/src/hooks/useReadyStatusAlerts.ts` | Removed auto-permission; activation + accurate hint |
| `client/src/components/customer/ReadyAlertActivationBanner.tsx` | **New** — activation UX |
| `client/src/components/customer/ReadyStatusAttention.tsx` | **New** — READY visual fallback |
| `client/src/pages/OrderStatusPage.tsx` | Wired banner, attention state, hint fix |

---

## 3. UX Decisions

### Activation banner (1A)

Shown while order is active (not served/cancelled) until user taps **“تفعيل التنبيهات”**:

- Single tap: unlocks Web Audio + requests notification permission (only if `"default"`)
- Never re-prompts if permission is `"denied"`
- After activation: compact green **“التنبيهات مفعّلة”** confirmation

### Hint accuracy (1C)

**“تم إرسال تنبيه لك”** appears only when a **system notification** was created (`delivery.notification === true`). Sound-only success no longer triggers this message.

### READY visual fallback (1D)

When status is `ready`:

- Pulsing green banner: **“طلبك جاهز — يمكنك استلامه الآن”**
- Green border + ring on status card

Ensures customers notice READY even when sound/notification fail (especially mobile / iOS).

---

## 4. Technical Decisions

### Channel separation (production finding)

```
deliverReadyAlertTier()
  ├─ sound:        playCustomerAlertSound()     → requires AudioContext "running"
  ├─ notification: showReadySystemNotification() → requires permission "granted"
  └─ vibrate:      vibrateForReady()            → Android only; gesture/context dependent
```

Each channel logged separately in DEV (`[mineuqr:ready-alert] delivery`).

### Session state (extended)

```ts
alertsActivated: boolean
alert1Sent: boolean              // attempt dedup
alert1NotificationDelivered: boolean  // hint restoration
```

> **READY-TIER2-REMOVAL-1:** `alert2Sent`, `alert2NotificationDelivered`, `acknowledged`, and follow-up timers were removed.

Delivery skipped entirely when `!alertsActivated` (no false channel attempts before activation).

### Removed anti-patterns

- `Notification.requestPermission()` from `useEffect`
- Passive `pointerdown` audio unlock
- `playCustomerAlertSound()` returning `true` on suspended context
- Hint restoration from `alert1Sent` alone

---

## 5. Verification Results

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `readyNotification.test.ts` (6) | PASS |
| `notificationSound.test.ts` (3) | PASS |
| `orderStatusDisplay.test.ts` (6) | PASS |

### Verification matrix (logic + unit coverage)

| Scenario | Expected | Status |
|----------|----------|--------|
| User taps “Enable alerts” | Permission prompt + audio unlock | Implemented (gesture handler) |
| READY before activation | Visual fallback only; no sound/notification | Gated by `alertsActivated` |
| READY after activation | Sound if running; notification if granted | Per-channel delivery |
| Sound only (Desktop) | No misleading hint | Hint requires `notification: true` |
| Refresh after delivery | Hint only if `alert1NotificationDelivered` | Session field |
| DEV diagnostics | Per-channel console log | `import.meta.env.DEV` gated |

**Manual browser QA** still recommended post-deploy for OS notification visibility (Chrome may suppress toasts when tab is focused).

---

## 6. Browser Compatibility Notes

| Feature | Desktop Chrome | Android Chrome | iPhone Safari |
|---------|----------------|----------------|---------------|
| Activation banner | ✅ | ✅ | ✅ |
| Sound (post-activation) | ✅ when context running | ✅ after tap | ✅ after tap |
| System notification | ✅ if granted; may hide when tab focused | ✅ if granted | Best-effort / limited in-tab |
| Vibration | N/A | ✅ when API available | N/A |
| READY visual fallback | ✅ | ✅ | ✅ |
| DEV diagnostics | ✅ console | ✅ console | ✅ console |

### Desktop Chrome notification note

If permission is `"granted"` and `new Notification()` returns without error but no OS toast appears, Chrome may be **suppressing notifications for the active tab**. This is browser/OS behavior, not a code exception. DEV logs will show `notification: true` in that case — distinguishing **created** vs **visible**.

---

## 7. Production Risk Assessment

| Area | Impact |
|------|--------|
| Database / API | None |
| Deploy | Client bundle only |
| Risk | **Low** — additive UX + stricter delivery gating |
| Behavior change | Users must tap “Enable alerts” once per tracking session |
| Regression | READY visual always visible; no false “sent alert” on sound-only |

---

## Out of Scope

`CUSTOMER-UX-1C-CARRY-1` — service workers, PWA push, background notifications.
