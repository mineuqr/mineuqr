# LIMIT-EDITOR.md

The existing Live Plan Editor (`PlanCreationWizard`) now presents Limits next to Capabilities and Prices. There is no separate Limits editor and no `saveLimits` public API.

## Surface

```
Capabilities
  CapabilityFilterPicker (unchanged)

Limits
  Restaurants   Limited [ n ]  |  Unlimited
  Categories    Limited [ n ]  |  Unlimited
  Items         Limited [ n ]  |  Unlimited

Prices
  Monthly / Yearly (unchanged)
```

Component: `client/src/components/admin/platform-ops/commercial-catalog/experience/LivePlanLimitsEditor.tsx`.

## Load

Values are loaded from the current Live Plan limit profile (`limitsQuery` → `selectedLimitProfile.values`).

`limitsFromProfileValues` maps the persisted inventory onto the canonical keys:

- `restaurants`
- `categories`
- `items`

The UI does **not** hardcode Basic=1, Professional=5, or Enterprise=Unlimited. Changing the persisted rows changes what the editor shows after reload.

## Edit

For each key the administrator can:

- inspect the current value
- change a Limited integer
- switch Limited → Unlimited (`null`)
- switch Unlimited → Limited (numeric draft)
- Save (`saveLivePlan` with `limits`)
- see validation errors (`validateLivePlanLimitValues` before mutate)
- Revert unsaved changes (`revertUnsaved`)

Unlimited is the canonical `null`. The editor never writes `999`, `-1`, or `Infinity`.

## Inventory

Only the existing Live Plan limit inventory is exposed. No new keys (`maxRestaurants`, `restaurantQuota`, `allowedRestaurants`) and no invented extra limits.
