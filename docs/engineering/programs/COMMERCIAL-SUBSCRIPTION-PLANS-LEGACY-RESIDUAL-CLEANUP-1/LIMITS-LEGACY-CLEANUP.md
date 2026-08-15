# LIMITS-LEGACY-CLEANUP

`subscriptionPlanLimits.ts` already enforced via `resolveOwnerEntitlements` / `checkLimit`.

Removed the `Pick<SelectSubscriptionPlan, …>` type coupling. Local `PlanLimits` type only.

No second limits system. No Inventory/POS expansion.
