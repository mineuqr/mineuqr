# PLATFORM_OWNER SEMANTICS

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Question

Does PLATFORM_OWNER bypass tenant Commercial quantity limits?

## Evidence

- No separate category/item create API for PLATFORM_OWNER.
- Caps come from `resolveOwnerEntitlements` → `checkLimit({ ownerId })`.
- Category/item occupancy uses `ownerUserId: restaurant.userId` (the restaurant owner), not the caller id.
- Admin restaurant create resolves a **target owner** and occupies that owner’s `restaurants` cap.
- FULL_PLATFORM / SIMULATED_PLAN are **entitlement modes**, not occupancy bypasses. FULL_PLATFORM may yield unlimited (`null`) cap; the helper still COUNT + decide.
- POS tests: PLATFORM_OWNER is not a cashier shortcut.

## Classification

**B — PLATFORM_OWNER operates under the target tenant’s Commercial limits.**

Not A (intentional unlimited bypass of tenant caps).  
Not C (a separate administrative quantity capability).

When PLATFORM_OWNER also has `users.role = admin` and edits a **customer** restaurant, G-09 now applies that restaurant owner’s category/item cap.

When PLATFORM_OWNER creates under **their own** FULL_PLATFORM restaurant, `checkLimit` may allow unlimited quantity. That is Live Plan / owner-access entitlement, still serialized by occupancy.

## Unchanged

Do not equate PLATFORM_OWNER with unlimited Commercial capacity in application code. Do not add `if (isPlatformOwner) return true` on quantity paths.
