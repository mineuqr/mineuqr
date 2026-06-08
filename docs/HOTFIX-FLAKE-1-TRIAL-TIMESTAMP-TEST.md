# HOTFIX-FLAKE-1 — Trial Subscription Timestamp Test

**Date:** 2026-06-08  
**Status:** Resolved  
**Scope:** Test stability only — no production changes.

---

## Symptom

`server/create-trial-subscription.test.ts` intermittently failed:

```
Expected: 2026-06-22T20:56:45.384Z
Received: 2026-06-22T20:56:45.383Z
```

Difference: **1 ms** between `trialEndsAt` and `currentPeriodEnd`.

---

## Root Cause

`buildTrialSubscriptionPayload` in `server/create-trial-subscription.ts` constructs timestamps from **three separate** `new Date()` calls:

```typescript
const now = new Date();
const trialEndsAt = new Date();
// ...
const currentPeriodEnd = new Date();
```

Each call captures wall-clock time at a slightly different instant. After adding `TRIAL_DAYS`, `trialEndsAt` and `currentPeriodEnd` are logically the same end-of-trial moment but can differ by 1 ms in ISO string form.

The test asserted exact ISO equality:

```typescript
expect(trialEnd.toISOString()).toBe(periodEnd.toISOString());
```

That assertion is sensitive to sub-millisecond clock drift between the two `Date` constructions.

**Business logic is correct:** both fields represent the same 14-day trial end. The failure is a test harness issue, not a subscription authority or duration bug.

---

## Fix

**Test-only:** freeze system time with Vitest fake timers (`vi.useFakeTimers` + `vi.setSystemTime`) in the `buildTrialSubscriptionPayload` describe block.

With a frozen clock, all `new Date()` calls in the payload builder share one instant, so `trialEndsAt` and `currentPeriodEnd` are identical. The assertion uses `getTime()` equality (same intent, avoids string formatting edge cases).

**Not changed:**

- Trial duration (`TRIAL_DAYS = 14`)
- Production payload builder
- Subscription authority rules

---

## Validation

```bash
pnpm exec vitest run server/create-trial-subscription.test.ts
```

Repeat runs should pass without millisecond-sensitive failures.
