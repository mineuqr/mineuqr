# FINAL REPORT — COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1

## 1. STATUS

**BLOCKED — LEGACY WEBHOOK IDENTITY NOT PROVEN SAFE TO RETIRE**

Phase 4 classification: **B. NOT PROVEN SAFE**  
Legacy integer webhook traffic: **UNKNOWN**  
Implementation (UUID-only webhook READ): **NOT PERFORMED**  
Commit / push / deploy: **NOT PERFORMED**

## 2. Current webhook identity architecture

Canonical identity: `commercial_plans.id` = UUID. Business key: `commercial_plans.code`. Leftover integer is not canonical.

```
NEW checkout write (OD-3+, deployed):
  PayPal custom_id.planId = UUID
  Tap metadata.plan_id    = UUID

CURRENT webhook read (still required):
  PayPal event custom_id.planId  ─┐
  Tap retrieveTapCharge.plan_id  ─┴─ parseWebhookPlanRef
                                      ├ UUID  → resolveLivePlanById
                                      └ integer / digit-string
                                            → LEGACY_PLAN_BRIDGE
                                            → Live Plan UUID
                                      persist UUID; bind by UUID
```

Malformed → fail closed. Unknown UUID / unmapped integer → fail closed. Financial amount is not derived from the identity field.

## 3. PayPal forensic findings

- Endpoint: `POST /api/paypal/webhook` → `handlePayPalWebhook`
- Activating event: `checkout.order.completed`
- Plan field: `resource.purchase_units[0].custom_id` JSON `{ userId, planId }`
- Writer: `createCheckoutSession` → `createPayPalOrder` with UUID `planId` since `c1d64cba`
- Reader: dual-read via `parseWebhookPlanRef` + `resolveCanonicalLivePlanId`
- Provider id: PayPal order id (`resource.id`); also used as `stripeSubscriptionId` on activation
- Capture: `capturePayPalOrder` unchanged
- Dedup: in-memory visibility only
- Tests: integer fixture `planId: 30002` still expected to succeed; UUID path also covered
- No stored PayPal order/payload table in MineuQR

## 4. Tap forensic findings

- Endpoint: `POST /api/tap/webhook` → `handleTapWebhook`
- Plan field: `charge.metadata.plan_id` after **live** `retrieveTapCharge(chargeId)`
- Writer: `createTapCheckout` → `createTapCharge` metadata UUID since `c1d64cba`
- Reader: same dual-read helper; display path also integer-capable
- Provider id: Tap charge id
- **No Tap webhook handler tests**
- A late capture of a pre-OD-3 charge would still present original (possibly integer) metadata
- No stored Tap charge/payload table in MineuQR

## 5. Production evidence

SELECT/INFORMATION_SCHEMA only at `2026-08-15T14:12:49.531Z`. Target: tidbcloud_prod / `mineuqr` / TLS / port 4000. Mutation: **NONE**. Provider APIs: **NONE**.

| Question | Result |
|----------|--------|
| Are webhook/event bodies retained? | **No** matching tables |
| Is PayPal/Tap metadata stored? | **No** |
| Pending/retry records with integer planId? | **No in-app queue exists** to inspect |
| Unprocessed webhook events in DB? | **None** (no store) |
| Order outbox replay of payment webhooks? | **No** — Order* events only; pending = 0 |
| Integer webhook metadata after OD-3? | **UNKNOWN** (no payload history) |
| `audit_events` webhook/plan metadata signals | **0** / 2227 |
| Subscription `planId` shape | UUID × 6 (storage identity, not webhook proof) |
| Provider txn id on subscriptions | 0 of 6 populated |

Full capture: `_QUERY-EVIDENCE.json`.

## 6. Replay / retention evidence

| Layer | Evidence |
|-------|----------|
| In-app durable webhook replay | **Does not exist** |
| In-app dedup window | 6 hours, memory-only, **does not block or replay** |
| Provider retention / retry | **UNKNOWN — not guessed; APIs not called** |
| Could a provider still deliver a pre-OD-3 object? | **Not disproven.** OD-3 writers are ~46 minutes old at evidence time. |

## 7. Legacy integer traffic classification

**UNKNOWN**

Do not treat “no payload store” as “zero integer webhooks”.

## 8. Decision

**B. NOT PROVEN SAFE** (not A, not C)

Never converted UNKNOWN into SAFE.

## 9. Exact runtime dependencies (webhook)

| Symbol | Webhook role | Action this program |
|----------------------|---------------------|
| `parseWebhookPlanRef` | Dual-read parser | **Retained** |
| `resolveCanonicalLivePlanId` | Dual-read resolver | **Retained** (also used by admin, out of scope) |
| `resolveLivePlanById` | UUID-only | Not yet the webhook reader |
| `resolvePlanIdFromLegacyPlanId` / `LEGACY_PLAN_BRIDGE` | Integer → UUID | **Retained** (not deleted) |
| `PLAN_ID_TO_CATALOG_PLAN` | Not on webhook path | **Untouched** |
| `bindings.legacyPlanId` | Not read/written by current webhook bind | **Untouched** |
| `ensureLivePlanBoundForSubscription` | UUID bind | **Untouched** |
| Provider order/charge ids | Unchanged | **Untouched** |

## 10. Changes made

Runtime: **none**.

Added program package under `docs/engineering/programs/COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1/` (forensics, evidence script, SELECT capture, decision, this report).

## 11. Tests

Not run. No behavioral change to test. Existing tests still encode the dual-read contract (integer webhook metadata **succeeds**).

## 12. Build

Not run. No implementation. Pre-existing `pnpm check` diagnostics are not attributed to this program.

## 13. Production certification

**Not applicable** (no implementation).

Current Production SHA `e254099c` (`2026-08-15T14:08:33Z`, success) still contains the integer webhook READ. No payment was created for testing. This program issued no Production mutation.

## 14. OD-4 impact

Unchanged. OD-4 remains **BLOCKED** on this webhook leftover READ (and on bind-column / bridge retirement items owned by OD-4). This program does **not** start OD-4.

## 15. SAFE DELETE impact

Unchanged. `subscription_plans` was not modified. SAFE DELETE is **not** started.

## 16. Git state

At program start (working tree clean):

```
## main...origin/main
e254099c refactor(commercial): prepare legacy plan identity retirement
```

After this program: documentation and the read-only proof script only. **Not committed. Not pushed.**

## 17. STOP / NEXT PROGRAM

**STOP.**

Do not retire the integer webhook READ. Do not start OD-4. Do not start SAFE DELETE.

Architecture Authority may later reopen this program when **all** of the following exist:

1. An explicit, sourced provider retry/retention window (not guessed), **or** a MineuQR-side inventory of in-flight PayPal orders / Tap charges that does not require manufacturing evidence via casual provider API use; and
2. Elapsed time since the last integer-capable writer (`a126a37e` / OD-3 cutover) exceeds that window; and
3. Production re-SELECT still shows no webhook payload store that would replay integers.

Until then the compatibility window stays open.
