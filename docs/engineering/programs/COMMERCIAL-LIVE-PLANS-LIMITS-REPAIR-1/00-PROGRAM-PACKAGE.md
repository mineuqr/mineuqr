# COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1

| Field | Value |
|-------|-------|
| **Type** | Implementation + validation |
| **Date** | 2026-08-15 |
| **Prior** | COMMERCIAL-LIVE-PLANS-LIMITS-FORENSICS-1 |
| **DB terminus** | **0086** Live Plan schema (already applied). **0087** owner-access. **Not** modified. |
| **Mode** | Application + UI repair. No migration. No production catalog writes. |
| **Verdict** | **READY FOR ARCHITECTURE AUTHORITY REVIEW** |

This program does **not** authorize commit, push, or production deployment.

## Problem

Restaurant limits already existed on Production Live Plans (`commercial_limit_values`, canonical key `restaurants`):

| Plan | Current persisted value |
|------|-------------------------|
| Basic | `1` |
| Professional | `5` |
| Enterprise | `null` (Unlimited) |

The Plan Editor did not expose those values. `saveLive` persisted `limitProfileId` only. Restaurant creation used a parallel quota path (`PLAN_LIMITS`, `subscription_plans.maxRestaurants`, Basic fallback) and skipped quota when `role === admin`.

## Architecture (unchanged)

```
Live Plan
  ├── Capabilities   "Is this capability available?"
  ├── Limits         "How much of this resource is allowed?"
  └── Prices
```

Restaurant count is a **limit**, not a capability. Canonical key: `restaurants`. Unlimited: `null`.

No second capability matrix. No hardcoded Basic=1 / Professional=5 / Enterprise=Unlimited as permanent code rules. Those are current production values only.

## Deliverables

| Document | Role |
|----------|------|
| [LIMIT-EDITOR.md](./LIMIT-EDITOR.md) | Live Plan Editor Limits surface |
| [LIMIT-PERSISTENCE.md](./LIMIT-PERSISTENCE.md) | Atomic `saveLive` + `commercial_limit_values` |
| [LIMIT-VALIDATION.md](./LIMIT-VALIDATION.md) | Integer / null validation |
| [LIMIT-RUNTIME-AUTHORITY.md](./LIMIT-RUNTIME-AUTHORITY.md) | Hub + Live Plan resolver |
| [RESTAURANT-QUOTA-ENFORCEMENT.md](./RESTAURANT-QUOTA-ENFORCEMENT.md) | Server-side create order |
| [LEGACY-QUOTA-ISOLATION.md](./LEGACY-QUOTA-ISOLATION.md) | PLAN_LIMITS / maxRestaurants isolation |
| [OWNER-LIMIT-BEHAVIOR.md](./OWNER-LIMIT-BEHAVIOR.md) | FULL_PLATFORM / SIMULATED_PLAN |
| [FROZEN-LIMIT-BEHAVIOR.md](./FROZEN-LIMIT-BEHAVIOR.md) | FROZEN denies create |
| [CACHE-INVALIDATION.md](./CACHE-INVALIDATION.md) | Catalog / public / entitlement |
| [LIMIT-TEST-MATRIX.md](./LIMIT-TEST-MATRIX.md) | Required cases 1–40 |
| [GOVERNANCE-COMPLIANCE.md](./GOVERNANCE-COMPLIANCE.md) | CE constitution + I-LIMIT + gap |
| [REGRESSION-VALIDATION.md](./REGRESSION-VALIDATION.md) | Prices, checkout, owner, Frozen, QR |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Authoritative decision |

**STOP after READY FOR ARCHITECTURE AUTHORITY REVIEW.** Await Architecture Authority review.
