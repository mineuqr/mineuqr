# IMPLEMENTATION

## Order executed

1. Audited Projection, presentation, Plan Editor, `requireFeature`, session/table/menu/design APIs.
2. Promoted the four presentation IDs into `COMMERCIAL_PROJECTION_IDS`.
3. Added catalog-promoted packaging origin (CAP-05/06/07 remain documentation; Discovery ELIGIBLE stays 17).
4. Unlocked Plan Editor cards; display no longer injects the four IDs.
5. Added idempotent local seed (Always-On preservation).
6. Wired `requireRestaurantPlanFeature(restaurantId, key)` → `requireFeature(ownerUserId, key)` on contracted procedures.
7. Replaced Menu Design `isSubscriptionActive` + admin-role grant.
8. UI `hasFeature` on sidebar / dashboard tabs.
9. Negative + matrix + guard tests.
10. `pnpm build` PASS. `pnpm check` still has pre-existing TS2802 / unrelated errors.

## Files (primary)

- `shared/commercial-projection/schema.ts`, `packaging.ts`, `index.ts`
- `shared/commercial-catalog-presentation/registry.ts`
- `shared/commercial-capability/registry.ts`
- `src/lib/commercial/planFeatureMatrix.ts`
- `server/subscription-runtime/requireRestaurantPlanFeature.ts`
- `server/services/commercial-catalog/seedCatalogPromotedCapabilities.ts`
- `server/routers.ts`
- `client/.../RestaurantDashboardSidebar.tsx`, `Dashboard.tsx`, `featureVisibility.ts`

No drizzle file. No Charged Terms / price / MRR / ARR change.
