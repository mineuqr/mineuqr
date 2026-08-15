# LEGACY-IDENTITY-CLEANUP

Integer `planId` / `legacyPlanId` / `LEGACY_PLAN_BRIDGE` remain **compatibility handles**.

They MUST NOT set price, capabilities, limits, or MRR.

| Handle | Owner | Why remaining | Removal condition |
|--------|-------|---------------|-------------------|
| `user_subscriptions.planId` | Subscription row | Checkout / webhook / admin APIs still pass integers | All APIs accept Live Plan UUID |
| `commercial_subscription_bindings.legacyPlanId` | Binding | Bind events still keyed from integer | Same |
| `LEGACY_PLAN_BRIDGE` 30001–30003 | Catalog adoption | Maps integer → Live Plan code | No integer callers |
| Pricing `planId={legacyPlanId}` | Public checkout input | Existing client contract | Client cutover |

No public API renamed. Bridge is not a third catalog.
