# LIMIT-PERSISTENCE.md

## Pipeline

```
Edit
  ↓
Validate (limits + existing PlanSaveValidator)
  ↓
Atomic transaction
  ├── Plan
  ├── Prices
  ├── Capabilities
  └── Limits
  ↓
Cache invalidation
```

Public authority remains `planService.saveLive` / `commercialCatalog.saveLivePlan`.

There is no competing `saveLimits` domain API. `LimitProfileService.replaceValues` is an internal helper used only inside `saveLive`.

## In-memory

`saveLive` snapshots:

- plan row
- prices for that plan
- feature bundles + bundle features
- limit profiles + limit values

On any validation or persist failure it restores **all** of those maps. Partial plan / price / capability / limit state is not committed.

When `options.limits` is present:

1. `validateLivePlanLimitValues`
2. Create a limit profile if the plan has none
3. Else `replaceValues(profileId, normalized)` — delete existing profile rows, insert the three canonical keys

## Durable persist

`DbDurableLivePlanBackend.persistLivePlan` upserts the plan’s limit profile and, in the same transaction:

1. `DELETE FROM commercial_limit_values WHERE profileId = :plan.limitProfileId`
2. `INSERT` the current in-memory rows for that profile

In-memory durable backend replaces limit values by profile (no stale `mergeById` leftovers).

## Data safety

No migration. No catalog wipe. No seed rewrite of production values.

Bootstrap / production current values remain until an administrator saves a change:

| Plan | `restaurants` |
|------|----------------|
| Basic | `1` |
| Professional | `5` |
| Enterprise | `null` |
