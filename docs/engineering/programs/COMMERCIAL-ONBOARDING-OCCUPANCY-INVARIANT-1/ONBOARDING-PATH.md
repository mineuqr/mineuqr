# ONBOARDING PATH

## API

`POST /api/auth/register` (`server/auth-local.ts`)

## Application service

`registerLocalOwner` / `registerOwnerTransactional` (`server/auth-local/registerOwner.ts`)

## Persistence

Drizzle `tx.insert(users)` then `tx.insert(restaurants)` then `tx.insert(userSubscriptions)` on the connection from `getDb()`.

## Plan resolution

Trial plan = Catalog Professional via `resolveTrialPolicyFromCatalog()` (same source as `buildTrialSubscriptionForUser` / `resolveTrialPlanId`).

## Occupancy definition

Restaurant occupancy for Commercial `restaurants` is **COUNT of restaurant rows for `userId`**. Inactive rows still occupy (audit G-10, unchanged). Onboarding creates a **new** user, so occupancy is **0** before the insert and **1** after commit.

## Bootstrap sequence

1. Capacity decision from the trial plan (this program).  
2. One transaction: user + first restaurant + trial subscription.  
3. After commit: optional live-plan bind (already best-effort; failure does not delete the restaurant).

## Not this path

Internal staff (`createInternalUser`) does not create a restaurant. Admin restaurant create already uses occupancy.
