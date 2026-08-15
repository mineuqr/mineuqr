# DECISION

## Question

Should `commercial_plans.id` UUID be formally adopted as the ONE canonical internal Commercial Plan identity?

## Answer

**APPROVE**

## Why

1. The UUID is unique (primary key), system-generated (`randomUUID()`), and immutable on normal catalog edits (`saveLive` pins `id`).
2. It is independent of name, description, price, capabilities, limits, billing cycle, currency, country, customer contract, provider, and MRR.
3. Commercial bindings and catalog prices already store this UUID. Public offering already exposes it as `planId`. Charged Terms already carry it as the catalog template pointer.
4. `code` is a unique, currently immutable business key used for bootstrap idempotency and human/API labels. It is not the row identity. Replacing UUID with code is unnecessary and would diverge from the existing commercial graph.
5. Integer identity (`user_subscriptions.planId`, `legacyPlanId`, `LEGACY_PLAN_BRIDGE`, `PLAN_ID_TO_CATALOG_PLAN`) is compatibility only. It does not determine commercial law.
6. `subscription_plans.id` has no remaining claim as catalog authority.
7. No provider requires the integer as a permanent *internal* MineuQR plan identity.
8. Catalog wipe regenerating UUIDs is a new catalog instance (valid lifecycle), not concurrent duplicate identity. Code unique index forbids two Live Plans with the same code at once.
9. Subscription can eventually store this UUID deterministically for bridged integers (30001–30003), fail-closed otherwise. That is a future cutover, not a reason to reject the identity type.

## What APPROVE does not authorize

- ALTER of `user_subscriptions.planId`
- Public API integer removal
- Bridge deletion
- DROP of `subscription_plans`
- Any pricing, MRR, Charged Terms, checkout amount, webhook payload, trial policy, entitlement, or limits change
