# ONBOARDING RACES

## G-04 invariant (unchanged)

First-restaurant onboarding asserts trial `restaurants` capacity **before** `registerOwnerTransactional`. It does **not** call `withCommercialLimitOccupancy` because:

1. The helper always opens its own transaction.
2. `checkLimit` needs a persisted owner subscription that does not exist yet.
3. User + restaurant + trial subscription must commit together.

G-08 did not force the helper into onboarding.

## TiDB races

Distinct synthetic owners (two emails) each created one restaurant at cap 1: both succeeded. Tenant occupancy is per owner, so this cannot stack two restaurants onto one cap.

Same email unique insert: 1 fulfilled, 1 rejected. Product onboarding uses `users.email` / `openId` uniqueness the same way.

## Concurrent first restaurant for one new owner

Not a product path: registration always inserts a **new** user. Two browsers with two emails are two owners.

## Verdict

**A. PASS** for the G-04 invariant and unique-email race. Helper wrap remains deferred by transaction-boundary design, not by neglect.
