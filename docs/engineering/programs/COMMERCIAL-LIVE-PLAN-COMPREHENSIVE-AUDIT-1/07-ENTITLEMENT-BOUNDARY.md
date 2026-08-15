# 07 — ENTITLEMENT BOUNDARY

## Intended chain

```
Live Plan composition (bundle + limits)
  → Subscription Runtime (getCommercialEntitlements)
  → requireFeature / checkLimit
```

UI `hasFeature` is presentation only. RBAC / owner **role** does not grant commercial capabilities. Platform owner uses `FULL_PLATFORM` / `SIMULATED_PLAN` via owner-access entitlements (constitution).

## Bound / unbound

| Subscription state | Authority |
|--------------------|-----------|
| Binding + readable plan | Live Plan features/limits + Charged Terms from binding |
| Binding unreadable | Fail closed deny |
| Unbound + UUID `planId` | `resolveLivePlanCapabilitiesByPlanId` — Live Plan, `chargedTerms: null` |
| Unbound + integer | Fail closed |
| **No subscription row** | `legacy_bridge`: `getCommercialEntitlementsFromContext` → `resolveCommercialEntitlements` → **`planFeatureMatrix`** |

`subscription_plans` does **not** participate in entitlement resolution.

## Trial

`resolveTrialPolicyFromCatalog` → professional Live Plan UUID + catalog `durationDays`. Lifecycle `trial` maps commercial plan label TRIAL; **features still from Live Plan keys**.

## Tenant

Entitlements resolve per **owner** (user-level canonical subscription). Live Plans are platform-global. Restaurant is not a plan catalog dimension.

## Classification of leftover entitlement sources

| Artifact | Class |
|----------|-------|
| Live Plan bundle/limits | **A. Canonical** for subscribed UUID rows |
| `planFeatureMatrix` | **H. Incorrect architecture** as a second catalog for no-subscription users (static, not `commercial_plans`) |
| Platform owner FULL_PLATFORM | **E. Operational** exception, not a customer catalog |
| `subscription_plans.max*` / features text | **G. Dead** at runtime |

Production implication: 4 unbound UUID subscriptions still resolve Live Plan capabilities (unbound path), not `subscription_plans`.
