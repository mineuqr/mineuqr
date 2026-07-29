# SNAPSHOT-AUTHORITY

When `commercial_subscription_bindings` row exists for the canonical subscription:

| Fact | Source |
|------|--------|
| Features | Snapshot `includedFeatures` only |
| Limits (entitlement + quota) | Snapshot `usageLimits` only |
| Plan version | Snapshot / binding `planVersionId` |
| Pricing | Snapshot `pricing` (meta) |
| Billing cycle | Snapshot `billingCycle` (meta) |
| Trial policy | Snapshot `trialPolicy` (meta) |
| Promotion | Snapshot `promotionApplied` (meta) |
| Regional | Snapshot `region` (meta) |
| Commercial name | Snapshot `commercialName` |
| Catalog plan code | Snapshot `catalogPlanCode` (captured at bind) |

**No** Legacy matrix, **no** live Catalog, **no** `subscription_plans` commercial facts after binding.

Fail-closed: binding without readable payload → denied (NONE), never Legacy.
