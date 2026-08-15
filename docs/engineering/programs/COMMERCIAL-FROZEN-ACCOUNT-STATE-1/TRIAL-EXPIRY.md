# TRIAL-EXPIRY.md

## Trial duration authority

Do **not** hardcode `14` in Frozen code.

Canonical sources:

1. Catalog trial policy `durationDays` via `resolveTrialPolicyFromCatalog()` / `resolveTrialDurationDays()`
2. Fallback only: `TRIAL_DAYS = 14` in `server/create-trial-subscription.ts`

Frozen derivation uses `syncCommercialLifecycle` (`trialEndsAt` vs `now`). It does not invent a second trial timer.

## Lifecycle

```
Trial ACTIVE  →  trialEndsAt in the future  →  entitlementsEnabled  →  ACTIVE
Trial expired →  trialEndsAt reached, no grace, no paid row winning  →  FROZEN
```

## Edge cases

| Case | State |
|------|-------|
| Trial active | ACTIVE |
| Trial expired | FROZEN |
| Trial expired + active paid subscription | ACTIVE (canonical pick + entitlements enabled) |
| Trial conversion to paid | ACTIVE |
| Trial expiry then renewal | FROZEN → ACTIVE |
| Days later, then renew | Data still present; state becomes ACTIVE |
