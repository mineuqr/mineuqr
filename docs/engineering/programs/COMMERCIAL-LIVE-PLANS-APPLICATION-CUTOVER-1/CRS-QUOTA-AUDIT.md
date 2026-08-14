# CRS-QUOTA-AUDIT.md

## CRS (`CommercialReadService`)

Bound / `meta.commercialResolutionSource === "live_plan"`:

- `planName` uses `meta.commercialName` when set.
- `commercialName` is `chargedTerms.commercialName`, which is the **Live Plan name** at bind (`plan.name`).
- Not from version, snapshot table, or retired version.

If bound but `chargedTerms` is null (`chargedAmount` missing), `commercialName` is unset and CRS falls back to `subscription_plans` display name. **No Live Plan accounts exist today** (bindings = 0). Residual, not P0.

Unbound: `commercialResolutionSource: "legacy_bridge"` → `getSubscriptionPlanById` name. Documented compatibility.

`live_plan` is included in the CRS name branch (not only the old `"snapshot"` string).

## Quotas (`resolvePlanLimitsForUser`)

| Case | Limits source |
|------|----------------|
| Bound + live plan readable | Current Live Plan limit profile |
| Bound + unreadable | **0 / 0 / 0** (fail-closed; no snapshot/version/matrix override) |
| Unbound + entitled | `subscription_plans` row |
| Not entitled | Fallback Basic from `subscription_plans` |

No Snapshot fallback. No Version fallback. No Legacy override of a readable Live Plan.
