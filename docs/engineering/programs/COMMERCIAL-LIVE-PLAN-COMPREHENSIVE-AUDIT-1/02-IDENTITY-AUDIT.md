# 02 — IDENTITY AUDIT

## Canonical internal identity

`commercial_plans.id` = UUID varchar(36). Stored on:

- `user_subscriptions.planId` (0088 applied)
- `commercial_subscription_bindings.planId`
- `commercial_prices.planId`
- promotions `eligiblePlanIds` JSON

Public/admin/checkout ingress: `livePlanUuidInput` (Zod UUID). Resolver: `resolveLivePlanById` — fail closed on malformed / unknown UUID.

## Business key

`commercial_plans.code` unique, immutable in application (`saveLive` / `update` force `existing.code`). Used for:

- Bootstrap idempotency (reuse existing UUID by code)
- `catalogPlanKeyFromCode` → BASIC / PROFESSIONAL / ENTERPRISE
- `LEGACY_PLAN_BRIDGE` alignment
- 0088 integer → UUID mapping (historical)

Code is **not** the subscription FK.

## UUID generation and stability

| Question | Evidence |
|----------|----------|
| Mechanism | `randomUUID()` via `newCommercialId()` |
| Changes on update | **No** — `id: existing.id` |
| Code change possible in app | **No** |
| Code unique | UNIQUE index + create-time duplicate check |
| Duplicate plans | Create rejected; Production duplicate count 0 |
| Hidden plans | `isHidden`; remain resolvable by UUID |
| Deleted plans | **No delete API**; historical UUID remains if row exists |
| Recreate same code | Blocked while row exists; after SQL delete, new UUID would be issued (orphan risk) |
| Historical references | Resolvable iff plan row still present (no FK, no archive tombstone) |

## Identity ≠ other domains (verified)

| Claim | Proof |
|-------|-------|
| Identity ≠ Price | Amounts live in `commercial_prices`; checkout uses `currentPriceForPlan` |
| Identity ≠ Entitlement | Values in bundle/limit tables; runtime `resolveEntitlementsFromLivePlan` |
| Identity ≠ Subscription | Lifecycle on `user_subscriptions` (status, period, trial) |
| Identity ≠ Charged Terms | `chargedAmount` / currency / cycle on bindings |
| Identity ≠ Provider ID | PayPal order id / Tap charge id; `stripeSubscriptionId` on subscription |
| Identity ≠ Invoice ID | `invoices` has `subscriptionId`, not plan PK as financial SSOT |
| Identity ≠ Payment transaction | Capture/charge ids in webhook/ops logs |

## Compatibility ingress (not canonical identity)

Webhooks and admin `subscriptionAudit` still call `resolveCanonicalLivePlanId`, which may map leftover integers through `LEGACY_PLAN_BRIDGE`. Result is always persisted as UUID. See `10-LEGACY-DEPENDENCY-MATRIX.md` and COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1 (**BLOCKED**).
