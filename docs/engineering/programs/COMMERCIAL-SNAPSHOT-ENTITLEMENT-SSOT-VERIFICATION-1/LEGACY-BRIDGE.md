# LEGACY-BRIDGE

**Program:** COMMERCIAL-SNAPSHOT-ENTITLEMENT-SSOT-VERIFICATION-1  

## Required rule

> Legacy Bridge executes **ONLY** when Commercial Snapshot does **not** exist.  
> Bridge must **not** execute for bound subscriptions.

## Observed Legacy Bridge components

| Component | Role |
|-----------|------|
| `user_subscriptions.planId` | Instance → legacy plan |
| `mapPlanIdToCatalogPlan` | 30001–30003 → BASIC/PRO/ENTERPRISE |
| `planFeatureMatrix` | Feature/limit evaluation tables |
| `subscription_plans` | Quota columns + display metadata |
| `resolveSubscriptionEntitlement` / `isSubscriptionActive` | Period entitlement |

## Unbound subscriptions (no binding / no snapshot payload)

| Resolver | Bridge-only? | Compliant as B? |
|----------|--------------|-----------------|
| R02–R04, R03 matrix | Yes | **Yes** |
| R12 quota | Yes | **Yes** (until Snapshot required) |
| R14 period | Yes | **Yes** (lifecycle) |

## Bound subscriptions (binding exists)

| Resolver | Bridge still executes? | Compliant? |
|----------|------------------------|------------|
| R01 | **Yes — always before overlay** | **No** |
| R12 | **Yes — exclusive Legacy** | **No** |
| R11 | **Yes — fallbacks** | **No** |
| R10 | **Yes — plan row join** | **No** |

## Verdict on bridge discipline

**FAIL.** Bridge is not gated behind “Snapshot missing”. Bound subscriptions still execute Legacy resolution.
