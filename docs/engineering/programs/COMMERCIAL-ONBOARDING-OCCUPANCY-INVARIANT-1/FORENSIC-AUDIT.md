# FORENSIC AUDIT

Verified against current code, not only the comprehensive audit.

## Call chain

```
POST /api/auth/register
  → parseRegisterBody
  → registerLocalOwner
      → registerOwnerTransactional
          → unique email / openId
          → assertOnboardingFirstRestaurantPermitted   [this program]
          → db.transaction
              → insert users
              → insert restaurants          (first location)
              → buildTrialSubscriptionForUser + insert userSubscriptions
      → session cookie
      → bindSubscriptionToLivePlan (best-effort after commit)
```

No `PosAccessContext`. Actor is unauthenticated self-service. Owner identity is the inserted `users.id`. Tenant scope for later restaurant creates is that owner.

## Subsequent provisioning

Additional restaurants: `restaurant.create` → `createRestaurantWithCommercialLimit` → `withCommercialLimitOccupancy` (`occupancyDelta: 1`, owner scope). Unchanged.

## Current bypass (before this program)

`registerOwnerTransactional` inserted the first restaurant with **no** `withCommercialLimitOccupancy` and **no** `checkLimit`.

Chicken-and-egg: `checkLimit` → `resolveOwnerEntitlements` needs a subscription. The trial row is created **after** the restaurant, in the same transaction.

## Why the occupancy helper cannot wrap this path

`withCommercialLimitOccupancy` always opens `db.transaction()` itself. It does not accept an outer `tx`. Using it here would be:

Commercial transaction → lock → restaurant insert on connection A  
while user + trial remain on onboarding connection B  

That is the prohibited split. Rewriting the helper to join an outer transaction is out of scope (do not rewrite the occupancy primitive).

## Current tests (before)

`server/auth-local.register.test.ts` — payload validation and duplicate-email message only. No restaurant-limit invariant.
