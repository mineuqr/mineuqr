# IMPLEMENTATION-DESIGN.md

## Reused architecture

| Concern | Existing SSOT | Integration |
|---------|---------------|-------------|
| Owner identity | `ENV.ownerOpenId` + `isPlatformAccountUser` | `isPlatformOwner` fail-closed |
| Entitlements | `getCommercialEntitlements` → `resolveOwnerEntitlements` | Owner path first |
| Live Plans | `planService.getByCode` / `list()` | Simulation by catalog **code** |
| Limits | `resolvePlanLimitsForUser` | Consumes hub for owner |
| Cache | `server/subscription-runtime/cache.ts` | Scope includes kind + mode + plan |
| Audit | `opsLog` + `OPS_EVENT` | `owner_access_mode_changed` |
| Admin APIs | tRPC `protectedProcedure` | `assertPlatformOwner` |

## Smallest integration points

1. Dedicated table `platform_owner_access_mode` (0087).
2. Owner branch at the start of `resolveOwnerEntitlements`.
3. Owner-only router `ownerAccess.*`.
4. Owner-only UI on Dashboard + Pricing note.
5. Cache key scope.

No second entitlement matrix. No subscription, binding, invoice, payment, snapshot, version, or publication.

## Authority precedence

1. PLATFORM_OWNER + FULL_PLATFORM
2. PLATFORM_OWNER + SIMULATED_PLAN
3. CUSTOMER + Subscription → Live Plan
4. Existing unbound Legacy Bridge
5. NONE
