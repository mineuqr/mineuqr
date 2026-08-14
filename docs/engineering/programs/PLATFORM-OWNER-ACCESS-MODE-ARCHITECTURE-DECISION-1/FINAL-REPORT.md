# FINAL-REPORT.md — PLATFORM-OWNER-ACCESS-MODE-ARCHITECTURE-DECISION-1

**Date:** 2026-08-15  
**Recommendation:** **A. APPROVE PLATFORM OWNER ACCESS MODES**

No implementation. No migration. No data change. Await Architecture Authority authorization.

---

## Why A (evidence)

OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1 proved:

- The owner is `ENV.ownerOpenId`, not a normal subscriber.
- `600001` is a lapsed Professional period; entitlements correctly go to NONE.
- Binding or renewing that row would not match the product decision (owner must not be commercially bound).
- Checkout is the wrong recovery path for a platform-control account.

The required product behavior (Full Platform **or** live simulation of Basic / Professional / Enterprise, then immediate return) cannot be done with **B. permanent Full Access only** (no customer-faithful test) and does not need a third architecture if cache keys, fail-closed simulation, and a dedicated mode table are part of the ADR.

## Approved model

```
PLATFORM_OWNER (ENV.ownerOpenId)
    ↓
Access Mode (account-persistent)
    ├── FULL_PLATFORM → all current commercial capabilities
    └── SIMULATED_PLAN → current Live Plan by catalog code
```

Customer chain unchanged. `600001` left historical. No fake invoice, payment, binding, or renewal.

## Schema (recommend only)

Dedicated `platform_owner_access_mode` (`userId`, `mode`, `simulatedPlanCode`). Do not contaminate subscription or binding tables. **Do not write the migration in this program.**

## Risks (accepted with controls)

| Risk | Control |
|------|---------|
| Privilege escalation | Server `isPlatformAccountUser` only |
| Cache contamination | Mode in cache key; owner-only invalidation |
| Frontend-only auth | Hub ignores client-declared mode |
| Billing from simulation | No writes; UX marked simulation |
| Plan mutation | Simulation is read-only consume |
| Customer entitlement change | Separate authority + cache kind |
| Future plan lifecycle | Simulate **current** Live Plan only |
| Session confusion | Account-persistent; banner required |
| Multi-device conflict | One row; same mode everywhere |
| Accidental Full Access fallback | Fail closed on bad simulation |

## Implementation is out of scope

A later program may: add the table, extend `resolveOwnerEntitlements`, add owner-only tRPC + UI, audit event, tests in TEST-STRATEGY.

**STOP.**
