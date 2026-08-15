# TRIAL-RESIDUAL-CLEANUP

Trial **policy** (duration, Professional product) unchanged.

| Before | After |
|--------|-------|
| Catalog `legacyPlanId` | Unchanged (preferred) |
| Else `getSubscriptionPlans()` + sortOrder 2 | Else `LEGACY_PLAN_BRIDGE` professional **30002** |

No table read. Integer 30002 is identity compatibility only.
