# COMMERCIAL-TRUTH-MATRIX.md

| Concept | Canonical Source | Persistence | Runtime Source | UI Source | Billing Source | MRR Source | Legacy Source | Status |
|---------|------------------|-------------|----------------|-----------|----------------|------------|---------------|--------|
| Plan identity | `commercial_plans.code` | `commercial_plans` | Binding `planId` | Catalog / Pricing name | `user_subscriptions.planId` | same int | `LEGACY_PLAN_BRIDGE` | Dual ID by design |
| Commercial name | Live Plan `name` | `commercial_plans` | Live plan | Editor / Pricing | Legacy nameEn | — | `subscription_plans` | Catalog wins display |
| Capability | Projection ID on bundle | `commercial_bundle_features` | Hub | Editor / Pricing presentation | — | — | `planFeatureMatrix` unbound | Most flags_only |
| Limit | `restaurants` etc. | `commercial_limit_values` | `checkLimit` | Editor; Pricing omits | — | — | `PLAN_LIMITS` / maxRestaurants | Isolated |
| Price (list) | `commercial_prices` | same | Public offerings | Pricing / Editor | — | **not used** | — | Catalog display SSOT |
| Price (charge) | None declared | `subscription_plans` | Checkout mutations | Confirm may show catalog | PayPal/Tap | `subscription_plans` | same | LEGACY_COMPATIBILITY |
| Subscription | `user_subscriptions` | same | pickUserLevelSubscription | SubscriptionManagement | same | owner states | — | Instance SSOT |
| Charged amount | Binding at event | `commercial_subscription_bindings` | `resolveLivePlanCapabilities` | Incomplete UI | Payment capture may differ | **ignored** | — | Preserved on edit |
| Trial | Trial policy + lifecycle | policy + sub row | commercial plan TRIAL | Pricing highlight | Excluded | `countsInMrr: false` | 14-day docs | CANONICAL 14 days |
| Account state | `deriveCommercialAccountState` | derived | Hub meta | Frozen banner / redirect | Renewal allowed | FROZEN excluded | — | CANONICAL |
| MRR | **GOVERNANCE GAP** | — | CanonicalMetricsService | Admin KPIs | — | `subscription_plans` | `computeAdminMrr` | Dual impl, wrong book vs terms |
| Checkout | Legacy plan row | `subscription_plans` | routers | Pricing CTA | Provider | — | 19/39/99 | LEGACY_COMPATIBILITY |
| Owner mode | `platform_owner_access_mode` | same | Owner entitlements | Owner UI | No charge | Excluded | — | CANONICAL |
| Frozen state | Account state | derived | Hub + verifiedProcedure | Redirect / QR frozen | Renewal | Excluded | — | CANONICAL |
