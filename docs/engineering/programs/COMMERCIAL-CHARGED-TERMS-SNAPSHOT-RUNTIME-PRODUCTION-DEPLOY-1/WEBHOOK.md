# WEBHOOK

Providers were not invoked.

## UUID metadata

`resolveCanonicalLivePlanId` / `resolveLivePlanById` maps directly to `commercial_plans.id`.

## Integer legacy metadata

`resolveCanonicalLivePlanId` still accepts a bridged leftover integer. OD-4 is not started. Integer compatibility is unchanged.

## Snapshot behavior

First bind may create Snapshot #1 from `currentPriceForPlan`.

If a snapshot already exists, `insertImmutableChargedTermsSnapshot` with `source=webhook_bind` returns the existing row. Retry must not create Snapshot #2 from a later catalog price.

Binding `onDuplicateKeyUpdate` sets `planId`, `legacyPlanId`, `updatedAt` only — not charged fields.
