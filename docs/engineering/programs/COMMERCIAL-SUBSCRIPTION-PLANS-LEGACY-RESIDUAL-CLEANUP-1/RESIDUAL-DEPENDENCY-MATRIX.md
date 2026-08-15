# RESIDUAL-DEPENDENCY-MATRIX

Classification: A obsolete · B move to Live Plan · C Charged Terms · D payment · E identity · F historical · G test · H script · I API · J unknown

| Dependency | Before | After | Class | Runtime table read? |
|------------|--------|-------|-------|---------------------|
| Checkout | Already Live Plan | Unchanged | — | No |
| MRR | Already Charged Terms | Unchanged | — | No |
| listPlans fallback | `getSubscriptionPlans` | `[]` if catalog missing | A | No |
| getCurrentSubscription.plan | Table row | `resolveSubscriptionPlanView` | B / I | No |
| getByRestaurant.plan | Table row | Same view | B / I | No |
| CRS planName | Table name | Live Plan / bridge | B | No |
| Trial plan id fallback | Table sortOrder | `LEGACY_PLAN_BRIDGE` 30002 | E | No |
| PayPal existence | Table row | `isKnownLegacyPlanId` | E | No |
| PayPal / Tap email name | Table `nameAr` | Live Plan display | B | No |
| PayPal email amount fallback | Table `priceMonthly` | Provider amount or “غير محدد” | D | No |
| Admin notification name | Table `nameAr` | Live Plan display | B | No |
| Admin invoice amount | Table price | Binding `chargedAmount` | C | No |
| computeAdminMrr | Table prices | **Removed** | A | No |
| getAdminStatistics.totalRevenue | computeAdminMrr | Canonical MRR | A | No |
| getRevenueByMonth | Table prices | Sunset `0` | A | No |
| subscriptionPlanLimits type | SelectSubscriptionPlan | Local type | B | No |
| `user_subscriptions.planId` | Integer handle | Retained | E | No |
| `legacyPlanId` / bridge | Identity map | Retained | E | No |
| ORM helpers + table | Schema | Retained until SAFE DELETE | E / H | Helper only |
| Seeds / reset / drizzle | Persist table | Retained | G / H | N/A |
| Test mocks | Table fixtures | Leftover mocks | G | No |
