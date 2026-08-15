# 06 — WEBHOOK PROOF

No real provider APIs were called.

## New writers (deployed)

| Provider | Field | Identity |
|----------|-------|----------|
| PayPal | `custom_id.planId` | UUID (`CreateOrderParams.planId: string`; value from `livePlanUuidInput`) |
| Tap | `metadata.plan_id` | UUID (`input.planId.toString()` after UUID validation) |

New checkout therefore writes UUID metadata only.

## Legacy read (intentionally retained)

Both webhooks use `parseWebhookPlanRef` → `resolveCanonicalLivePlanId`.

| Payload | Behavior |
|---------|----------|
| UUID metadata | resolve directly to Live Plan UUID |
| leftover integer / digit-string | compatibility resolver → Live Plan UUID |
| unknown integer | fail closed (`unmapped_legacy_plan`) |
| unknown UUID | fail closed (`unknown_live_plan`) |
| malformed | `parseWebhookPlanRef` → null → fail closed |

No `getSubscriptionPlanById`. No price derived from metadata identity. Dedup / activation path is unchanged; this program did not execute a financial operation.

## Why the leftover read remains

In-flight integer metadata cannot be proven empty. OD-3 kept the read. **OD-4 owns retirement.**

## Tests

`server/trial-and-webhook.test.ts` covers:

- leftover integer `custom_id.planId` still activates via Live Plan UUID
- new UUID `custom_id.planId` resolves directly

`od3PublicApiUuid.test.ts` covers dual-read accept / unknown fail-closed.

## Decision

**WEBHOOK GATE: PASS**  
New = UUID. Legacy read = retained safely.
