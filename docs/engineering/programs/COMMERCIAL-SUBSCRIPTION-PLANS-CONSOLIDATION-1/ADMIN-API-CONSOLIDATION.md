# ADMIN-API-CONSOLIDATION.md

## Plan management

Platform Ops Plan Editor uses `commercialCatalog.listPlans` / Live Plan save. **No admin writer to `subscription_plans`.** `createSubscriptionPlan` has no application caller.

Do not maintain two plan editors. None exists for the legacy table.

## APIs still reading the table

| API | After this program |
|-----|-------------------|
| `subscription.createCheckoutSession` / `createTapCheckout` | **Live Plan price** |
| `subscription.listPlans` | Catalog-first; legacy fallback if no `legacyPlanId` |
| `subscription.getCurrentSubscription` / `getByRestaurant` | Legacy plan DTO join |
| `admin.generateInvoicePDF` | Legacy prices |
| `admin.create/updateUserSubscriptionByAdmin` | `nameAr` for notifications; writes integer `planId` then binds Live Plan |
| `admin.getStatistics` / `getRevenueByMonth` | Deprecated; still read table |
| `analytics.getMRR` | Still legacy prices via CMS |

## `legacyPlanId`

Still exposed on public offerings and Checkout input.

**Classification:** LEGACY COMPATIBILITY IDENTIFIER.

**Removal path:** Checkout/admin mutations accept Live Plan UUID/`code`; drop fallback `listPlans`; stop joining `getSubscriptionPlanById` for DTOs. Do not treat the integer as catalog authority.
