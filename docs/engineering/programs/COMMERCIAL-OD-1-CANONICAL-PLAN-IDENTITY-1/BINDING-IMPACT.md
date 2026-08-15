# BINDING-IMPACT

No binding schema was changed. `legacyPlanId` was not removed.

## Today

| Column | Stores | Role |
|--------|--------|------|
| `commercial_subscription_bindings.planId` | Live Plan UUID | **Already canonical catalog pointer** |
| `commercial_subscription_bindings.legacyPlanId` | int nullable | Compatibility copy of the integer handle |

Charged Terms (`chargedAmount`, `chargedCurrency`, `billingCycleCode`) live on the same row and are **not** identity.

## Future impact

After subscription/API cutover:

- `planId` remains the UUID (no new column, no new mapping table).
- `legacyPlanId` may stay nullable until a later retirement program proves no reader remains.
- Business logic that still keys off the integer (checkout offer lookup, trial write, webhook echo) must move to UUID **in those later programs**.

Do not introduce `legacyLivePlanId` or a second bridge table.
