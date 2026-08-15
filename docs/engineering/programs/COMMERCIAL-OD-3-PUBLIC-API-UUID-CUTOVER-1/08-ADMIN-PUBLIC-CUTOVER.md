# 08 — ADMIN / PUBLIC CUTOVER

## listPlans

No live client consumer (`subscription.listPlans` unused by Pricing/CS).

`id` is now Live Plan UUID. `planCode` added. `catalogPlanId` remains the same UUID.

Offerings are listed from Live Plans; leftover integer filter removed.

## Admin

Create/update accept UUID only. Persist via `resolveCanonicalLivePlanId`. Bind reverse-maps leftover integer.

Notifications use `resolveLivePlanDisplayByPlanRef` (name, not UUID).

## Customer Success

Plan picker uses `offering.planId` (UUID). Submit sends the string. Display remains plan name.

## Public catalog DTO

`offering.planId` already UUID. `legacyPlanId` retained as classified compatibility (no remaining Pricing/CS checkout consumer). Not removed for cleanliness.
