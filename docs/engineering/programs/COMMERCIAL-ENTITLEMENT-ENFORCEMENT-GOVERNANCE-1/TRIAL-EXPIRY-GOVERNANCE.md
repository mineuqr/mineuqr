# TRIAL-EXPIRY-GOVERNANCE.md

Current Trial duration: **14 days** (`TRIAL_DAYS = 14`, catalog default trial policy). Change only via Architecture/Product Decision.

```
Trial (14 days)
  → no active paid subscription at end
  → FROZEN (CE-22)
  → data retained
  → redirect to Plans
  → commercial service suspended
```

Platform Owner is exempt (CE-23).

Current runtime: trial expiry follows the same entitlement disablement as paid expiry (`NONE` / features denied). Product FROZEN UX is follow-on **COMMERCIAL-FROZEN-ACCOUNT-STATE-1**.
