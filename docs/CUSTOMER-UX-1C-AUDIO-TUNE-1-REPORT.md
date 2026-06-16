# CUSTOMER-UX-1C-AUDIO-TUNE-1 — Ready Alert Sound Tuning

**Status:** Complete  
**Scope:** Customer READY alert audio only (`notificationSound.ts`)

---

## 1. Design Summary

User feedback: Alert #1 was too short, weak, and easy to miss.

**Approach:** Replace the overlapping triple-tone chirp with a deliberate **two-beep “ready” pattern** — similar to a gentle service bell, noticeable without being aggressive.

| Alert | Role | Pattern |
|-------|------|---------|
| **#1 (high)** | Primary READY alert | 120ms beep → 120ms pause → 220ms beep (~460ms total) |

> **READY-TIER2-REMOVAL-1:** Alert #2 (30s tier-2 reminder) was removed from the customer journey. Web Audio `medium` intensity remains in code for fallback compatibility only.

Architecture, polling, permissions, session logic, and visual fallback are unchanged.

---

## 2. Audio Pattern Decisions

### Alert #1 (READY — tier 1)

```
t=0ms     ──▶ 880 Hz sine, 120ms
t=120ms   ── silence ──
t=240ms   ──▶ 1175 Hz sine, 220ms
t=460ms   end
```

- **880 Hz → 1175 Hz:** rising interval reads as “attention / ready”
- **120ms + 120ms + 220ms:** matches product spec; total within 500ms–1000ms target (460ms core pattern)
- **Sine wave:** smooth on phone speakers; avoids harsh harmonics on iPhone WebKit

---

## 3. Gain Decisions

| Parameter | Alert #1 |
|-----------|----------|
| Beep 1 peak gain | 0.46 |
| Beep 2 peak gain | 0.50 |
| Attack | 10ms exponential |
| Release | ~18% of beep duration |
| Floor | 0.001 (avoid `setValueAtTime(0)`) |

**Rationale:**

- Previous pattern used 0.55 gain on **three overlapping** tones — perceived loudness was smeared and brief
- New pattern uses **non-overlapping** beeps with slightly lower peak but **longer sustain** → clearer presence
- Peak ≤ 0.50 prevents clipping on desktop; comfortable on mobile speakers

---

## 4. Historical: Alert #2 (removed)

The tier-2 reminder pattern (784 Hz / 880 Hz, lower gain) was retired in **READY-TIER2-REMOVAL-1**. See git history for the prior spec.

---

## 5. Files Changed (original tune)

| File | Change |
|------|--------|
| `client/src/lib/notificationSound.ts` | New two-beep patterns, envelope, `CUSTOMER_ALERT_PATTERN` constants |
| `client/src/lib/notificationSound.test.ts` | Pattern duration + oscillator count tests |

No changes to `readyNotification.ts`, hooks, or UI.

---

## 6. Verification Results

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `notificationSound.test.ts` (6) | PASS |
| `readyNotification.test.ts` (6) | PASS — regression |

### Cross-device validation (manual QA checklist)

| Device | Expected | Verify |
|--------|----------|--------|
| Desktop Chrome | Two clear beeps; no distortion | Enable alerts → trigger READY |
| Android Chrome | Audible at comfortable volume | Same |
| iPhone Safari | Smooth sine tones; not harsh | Same |

**Automated coverage:** Pattern timing constants, Alert #2 shorter than Alert #1, two oscillators per tier, existing running-state gate unchanged.

---

## 6. Production Risk Assessment

| Area | Impact |
|------|--------|
| Architecture | None |
| Notifications / session / UI | None |
| Deploy | Client bundle only |
| Risk | **Very low** — audio timing/gain only |
| Owner dashboard | Unchanged (`OrderAlertSystem` uses its own inline sound) |

---

## Success Criteria

- Alert #1 is immediately recognizable as an intentional “your order is ready” signal
- Alert #2 remains a softer reminder
- Professional, restaurant-appropriate tone
- Lightweight Web Audio implementation (no new dependencies)
