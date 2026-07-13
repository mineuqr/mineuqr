# KITCHEN-AUDIO-PRIMING-ALIGNMENT-1 — Kitchen / Dashboard Audio Priming Alignment
## Phase C — Certification Report

**Program:** KITCHEN-AUDIO-PRIMING-ALIGNMENT-1  
**Type:** Runtime Consistency  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-AUDIO-PRIMING-ALIGNMENT-1 resolves **RC-2** from KITCHEN-ARRIVAL-SOUND-FORENSICS-1 by aligning Kitchen Runtime audio priming with the validated Dashboard implementation. Kitchen now calls `primeOwnerDashboardAudioFromGesture()` on first user gesture — the same shared pathway that unlocks `AudioContext` and primes the owner alert HTML asset. No arrival detection, notification policy, or runtime projection changes were made.

---

## 2. Root Cause (RC-2)

| Runtime | Priming on gesture | AudioContext unlock |
|---------|-------------------|---------------------|
| Dashboard | `primeOwnerDashboardAudioFromGesture()` | `ensureNotificationAudioReady()` + HTML prime |
| Kitchen (before) | `primeOwnerAlertAudioAsset()` only | **Missing** |

When HTML `audio.play()` was blocked, Kitchen's Web Audio fallback failed because `sharedAudioContext` was never resumed.

---

## 3. Change

**Before:**
```typescript
void primeOwnerAlertAudioAsset();
```

**After:**
```typescript
void primeOwnerDashboardAudioFromGesture();
```

Gesture listeners (`pointerdown`, `keydown`, `{ once: true }`) unchanged — same pattern as `OrderAlertSystem`.

---

## 4. Audio Priming Flow (Aligned)

```
User gesture (pointerdown / keydown)
        ↓
primeOwnerDashboardAudioFromGesture()
        ├─ ensureNotificationAudioReady() → shared AudioContext running
        └─ primeOwnerAlertAudioAsset() → HTML Audio unlocked
        ↓
Later: playKitchenOrderArrivalSound()
        ├─ HTML Audio (preferred)
        └─ Web Audio fallback (when HTML blocked, context running)
```

---

## 5. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/kitchen/useKitchenArrivalNotifications.ts` | Dashboard priming pathway |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | KITCHEN-AUDIO-PRIMING-ALIGNMENT-1 guard |
| `docs/engineering/programs/KITCHEN-AUDIO-PRIMING-ALIGNMENT-1/IMPLEMENTATION.md` | This report |

**Not modified:** `kitchenArrivalNotification.ts`, notification manager, arrival semantics, audio assets, `notificationSound.ts` playback logic.

---

## 6. Regression Protection

Architecture guard enforces:
- Kitchen hook uses `primeOwnerDashboardAudioFromGesture`
- Kitchen hook does **not** call `primeOwnerAlertAudioAsset` directly
- Dashboard continues using the same entry point (parity check)

---

## 7. Validation

| Check | Result |
|-------|--------|
| Kitchen uses same priming as Dashboard | ✓ |
| Arrival detection unchanged | ✓ |
| Duplicate protection unchanged | ✓ |
| Notification tests pass | ✓ |
| Architecture guards pass | ✓ |
| Build succeeds | ✓ |

---

## 8. Out of Scope (Unchanged)

**RC-1** (pending-only arrival detection) remains out of scope. Orders first visible in `preparing` may still not trigger arrival events until a separate program addresses detection semantics.

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Kitchen and Dashboard use same priming implementation | ✓ |
| Shared AudioContext unlocked after gesture | ✓ |
| No notification architecture changes | ✓ |
| No arrival semantics changes | ✓ |
| No runtime contract changes | ✓ |
| No scope creep | ✓ |

---

KITCHEN-AUDIO-PRIMING-ALIGNMENT-1 eliminates Kitchen/Dashboard audio priming divergence. Kitchen arrival sounds can now recover via Web Audio fallback when HTML playback is blocked, provided a user gesture has occurred and a genuine arrival event fires.
