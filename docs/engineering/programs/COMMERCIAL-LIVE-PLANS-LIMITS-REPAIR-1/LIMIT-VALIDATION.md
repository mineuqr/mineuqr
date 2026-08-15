# LIMIT-VALIDATION.md

Shared contract: `shared/commercial-catalog/contracts/livePlanLimits.ts`.

## Canonical keys

`LIVE_PLAN_LIMIT_KEYS = ["restaurants", "categories", "items"]`

Unknown keys are rejected. Missing keys are rejected. The save payload must include all three.

## Numeric Limited

A Limited value must be:

- a finite number
- an integer
- `>= 0`

Invalid values are **not** coerced. Failure → no persist, in-memory restore.

## Unlimited

Unlimited is `null` only.

Forbidden fake unlimited sentinels: `999`, `9999`, `-1`, `Infinity`.

## Layers

| Layer | Behavior |
|-------|----------|
| Editor | `validateLivePlanLimitValues` before `saveLivePlan`; shows issues; does not mutate |
| Router | `value: z.number().int().nonnegative().nullable()` |
| `saveLive` | Re-validates; throws `publication_validation_failed` |
| `replaceValues` | Rejects unknown commercial limit filter keys |

Router Zod failure and service validation both prevent a partial write.
