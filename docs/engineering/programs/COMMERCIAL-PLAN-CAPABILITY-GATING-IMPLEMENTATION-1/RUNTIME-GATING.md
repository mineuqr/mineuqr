# RUNTIME GATING

Adapter: `requireRestaurantPlanFeature(restaurantId, key)`

1. Load restaurant
2. `requireFeature(restaurant.userId, key)`
3. `COMMERCIAL_ENTITLEMENT_DENIED` → TRPC `FORBIDDEN` (`غير مصرح بالوصول`)

Order on gated procedures:

Auth → verify → FROZEN denylist (existing `verifiedProcedure`) → restaurant/RBAC → `requireRestaurantPlanFeature` → quota/domain.

No `if (isOwner)` outside the hub. No plan-name conditionals. Admin role does not skip the gate.
