# 06 — WEBHOOK CUTOVER

## Write (new checkout)

- PayPal `custom_id.planId` = Live Plan UUID
- Tap `metadata.plan_id` = Live Plan UUID string

Provider transaction IDs unchanged (`resource.id`, Tap charge id).

## Read (transition)

`parseWebhookPlanRef` accepts:

- UUID
- leftover integer / digit-string

Then `resolveCanonicalLivePlanId` → persist UUID.

Unknown / malformed: fail closed (`Plan not found`).

Bind uses `resolveLegacyPlanIdFromPlan(uuid)` — existing compatibility write, not a new writer.

## Why leftover read remains

In-flight PayPal/Tap checkouts created before deploy may still carry integer metadata. No proof that the in-flight set is empty. Dual-read is mandatory until AA confirms expiry.

Financial amount is not derived from the integer. Activation period math is unchanged.
