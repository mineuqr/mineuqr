# ENTITLEMENT-AUTHORITY-AUDIT.md

## Canonical hub

`getCommercialEntitlements(ownerId, now)` → `resolveOwnerEntitlements`.

```
IF canonical subscription missing
  → Legacy Bridge (planFeatureMatrix via context)
ELSE
  loadBoundLivePlan(subscriptionId)
  IF binding AND live plan readable
    → resolveEntitlementsFromLivePlan (current capabilities + limits + charged terms)
  IF binding AND live plan unreadable
    → denyEntitlementsFailClosed (NONE / 0 quotas)
  IF no binding
    → Legacy Bridge ONLY
```

There is **no** standard-plan path:

Subscription → Snapshot → Version → Published Version

## Bound / Live Plan path

Source: `commercial_subscription_bindings.planId` → `commercial_plans` + bundle features + limit profile.

Capabilities: current Live Plan keys (`expandFeatureKeysForRuntime` for legacy gate aliases only).

Production bindings today: **0**. No account currently takes this path.

Fail-closed if bound but plan missing: **yes**. Does not fall back to matrix. Does not query versions.

## Unbound path (`planFeatureMatrix`)

| Question | Answer |
|----------|--------|
| Is it legacy compatibility? | **Yes** |
| Is it production authority? | **Yes, for unbound accounts only** (all current production subscriptions) |
| Can it override Live Plan? | **No** — exclusive branch; never mixed |
| Can it affect a real account? | **Yes** — owner `600001` and other unbound rows |
| Safe to retain? | **Yes** until a separate bind program. Removing it would deny all unbound accounts |

Do **not** remove it in this cutover.

## Entry points

| Entry | Authority |
|-------|-----------|
| `getCommercialEntitlements` | Runtime hub above |
| `resolvePlanLimitsForUser` | Bound → live limits; unbound → `subscription_plans`; bound+unreadable → 0 |
| Capability / feature gates | Entitlements result |
| CRS / `CommercialReadService` | Hub + live_plan `commercialName` when present |
| Dashboard commercial state | CRS |
| Public Pricing | **Not** entitlement authority (`publishedCatalogParticipatesInEntitlement: false`) |
| Admin plan editor | Catalog CRUD, not entitlement resolution |

## Owner access (read-only)

Owner is unbound, period ended 2026-08-07, status still `active`. Unbound path still uses the same period-validity matrix logic as before (`isPeriodValid`). Live Plan fail-closed **does not apply** (no binding).

**No new owner-access regression.** Existing P0 remains `OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`.
