# EXPIRED-AND-FROZEN-GOVERNANCE.md

## Approved product model (CE-16…21, 24–25)

```
Paid expiry or Trial expiry
  → Commercial Account State = FROZEN
  → data preserved
  → QR identity preserved
  → commercial management denied
  → authenticate allowed
  → redirect to Plans / Subscription
  → renewal → same identity ACTIVE
```

FROZEN ≠ Unauthorized. FROZEN ≠ data deletion. FROZEN ≠ QR regeneration.

## Current runtime (do not pretend it is FROZEN)

Today, expired / cancelled / suspended customer entitlements resolve to plan `NONE` and deny features. That fail-closed entitlement result is necessary but **not** the approved FROZEN account experience (post-auth redirect, distinct account state, frozen public QR page).

## Follow-on (not this program)

**COMMERCIAL-FROZEN-ACCOUNT-STATE-1** — implement FROZEN commercial account state, route redirect, and frozen public/QR policy without deleting data or changing Live Plans / Owner Access / billing records.

This governance program does **not** implement that lifecycle.
