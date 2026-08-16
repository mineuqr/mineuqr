# PLATFORM_OWNER AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

G-09 **B** preserved.

- `resolveOwnerEntitlements` evaluates platform owner **before** customer subscription.
- FULL_PLATFORM / SIMULATED_PLAN resolve through owner-access entitlements, not `if (isOwner) return true` on occupancy.
- Quantity creates pass `checkLimit({ ownerId: restaurant.userId })` — target tenant cap.
- Role does not grant extra slots.

Hub test mock was missing `isLivePlanUuid` / unbound catalog exports (customer integer `planId` path). Completed the mock so the existing fail-closed unbound path can run. Not an occupancy redesign.

Customer resolution is not rewritten to platform_owner.
