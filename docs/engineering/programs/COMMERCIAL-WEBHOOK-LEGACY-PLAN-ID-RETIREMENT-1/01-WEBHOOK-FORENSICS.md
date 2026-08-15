# 01 — WEBHOOK FORENSICS

No runtime changes. Matrix is from repository inspection of HEAD `e254099c` (also the current Production SHA).

## Endpoints

| Provider | HTTP | Handler | Body source |
|----------|------|---------|-------------|
| Tap | `POST /api/tap/webhook` | `handleTapWebhook` | Route-local `express.json()` |
| PayPal | `POST /api/paypal/webhook` | `handlePayPalWebhook` | App-level `express.json()` after Tap route |

Registered in `server/_core/createApiApp.ts`. No other PayPal/Tap webhook routes exist.

## Plan identity fields

| Provider | Write (checkout, OD-3+) | Read (webhook) |
|----------|-------------------------|----------------|
| PayPal | `purchase_units[].custom_id` JSON `{ userId, planId }` where `planId` is Live Plan UUID (`livePlanUuidInput` → `createPayPalOrder`) | Same `custom_id.planId` from **webhook event body** |
| Tap | `metadata.plan_id` UUID string (`createTapCheckout`) | `metadata.plan_id` from **`retrieveTapCharge(chargeId)`**, not from the inbound POST body |

PayPal also stores provider order id on activation as `user_subscriptions.stripeSubscriptionId`. Tap uses charge id as `providerEventId` in ops logs only.

## Parsers and branches

```
parseWebhookPlanRef(raw)
  integer / digit-string → number          ← LEGACY
  RFC-like Live Plan UUID → string         ← CANONICAL
  else → null (fail closed)

resolveCanonicalLivePlanId(planRef)
  UUID → resolveLivePlanById               ← CANONICAL
  integer → resolvePlanIdFromLegacyPlanId
            → LEGACY_PLAN_BRIDGE
            → commercial_plans.id          ← LEGACY
  else → throw invalid_plan_ref
```

`resolveLivePlanById` is UUID-only and fail-closed. Webhooks do **not** call it directly; they call the dual-read helper.

## Integer fallback (runtime)

| Location | Fallback |
|----------|----------|
| `server/paypal-webhook.ts` | `parseWebhookPlanRef` → `resolveCanonicalLivePlanId` |
| `server/tap-webhook.ts` activation | same |
| `server/tap-webhook.ts` owner-email display | `parseWebhookPlanRef` → `resolveLivePlanDisplayByPlanRef` (also integer-capable) |

Both handlers import `resolveLegacyPlanIdFromPlan` but **do not call it** (dead import after OD-4 bind-by-UUID). Bind is `ensureLivePlanBoundForSubscription({ planId: livePlanId })`.

## UUID path (runtime)

New checkout:

- PayPal `custom_id.planId` = UUID
- Tap `metadata.plan_id` = UUID

Webhook success path persists `livePlanId` (UUID) onto `user_subscriptions.planId` and bindings.

## `resolveCanonicalLivePlanId` callers (full)

| Caller | In this program's scope? |
|--------|--------------------------|
| `server/paypal-webhook.ts` | **Yes** |
| `server/tap-webhook.ts` | **Yes** |
| `server/subscriptionAudit.ts` (admin create/update) | **No** — not a webhook path |
| Tests listed below | Test-only |

Retiring the webhook integer READ does **not** require deleting `resolveCanonicalLivePlanId` or `LEGACY_PLAN_BRIDGE`. Admin still uses the dual-read helper.

## Retry / replay / stored payloads (in-app)

| Mechanism | Persistence | Blocks processing? | Stores planId / payload? |
|-----------|-------------|--------------------|--------------------------|
| `noteWebhookEvent` (`server/_core/webhookDedup.ts`) | **In-memory Map**, 6h last-seen window, max 5000 keys | **No** (visibility-only MON-1R.1) | **No** — provider + event id only |
| `opsLog` | Process stdout/stderr (optional JSON line) | No | `planId` may appear in log metadata; **not a database** |
| `audit_events` | Durable | N/A | Webhooks **do not** `emitAuditEvent` |
| `order_domain_outbox` | Durable | Order domain only | Order events, not PayPal/Tap |
| Provider capture | PayPal `capturePayPalOrder`; Tap `retrieveTapCharge` | Live provider GET/POST during handling | Plan identity lives on the **provider object**, not in MineuQR tables |

There is **no** webhook inbox, dead-letter, or reconciliation queue that can replay a stored PayPal/Tap body from MineuQR.

## Test fixtures using integer webhook metadata

| File | Integer webhook usage |
|------|------------------------|
| `server/trial-and-webhook.test.ts` | PayPal `custom_id.planId: 30002` **and** UUID path |
| `server/commercial-catalog/__tests__/od3PublicApiUuid.test.ts` | `parseWebhookPlanRef(30002)` dual-read still expected to succeed |
| `server/commercial-catalog/__tests__/resolveCanonicalLivePlanId.test.ts` | Integer `30002` maps via bridge |

**No Tap webhook handler tests exist.**

## Idempotency

Webhook dedup does not skip duplicates. Activation is `updateSubscriptionForActivation` / `updateSubscriptionById`. Provider transaction ids are unchanged by identity parsing. This program must not alter those semantics if/when integer READ is later retired.

## Dependency matrix (webhook identity only)

| Artifact | Webhook write | Webhook read | Other consumers | This program |
|----------|---------------|--------------|-----------------|--------------|
| `parseWebhookPlanRef` | — | PayPal + Tap | OD-3 tests | Retain until SAFE |
| `resolveCanonicalLivePlanId` integer branch | — | PayPal + Tap | Admin `subscriptionAudit` | **Do not delete helper** |
| `resolveLivePlanById` | — | Not used by webhooks today | Public/admin/checkout | Target reader if SAFE |
| `LEGACY_PLAN_BRIDGE` | — | Via integer branch | Catalog bootstrap, display, tests | **Do not delete** |
| `PLAN_ID_TO_CATALOG_PLAN` | — | Not on webhook path | `isCanonicalCurrentPlan` / tests | **Do not delete** |
| `bindings.legacyPlanId` | Not written by current webhook bind | Not read | Column remains | **Do not drop** |
| `subscription_plans` | Unused by webhooks | Unused | Leftover table | **Do not touch** |
