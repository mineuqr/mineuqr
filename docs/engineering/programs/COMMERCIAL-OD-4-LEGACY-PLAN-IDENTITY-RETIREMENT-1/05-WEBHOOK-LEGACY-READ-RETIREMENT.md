# 05 — WEBHOOK LEGACY READ RETIREMENT

## Decision

**BLOCKED. Leftover integer webhook read RETAINED.**

## Proof required (not obtained)

1. No active/in-flight checkout requires integer metadata — **NOT PROVEN**
2. No pending payment depends on integer plan identity — **NOT PROVEN**
3. No webhook retry requires leftover resolution — **NOT PROVEN**
4. No provider-side pending operation can send leftover integer metadata — **NOT PROVEN** (provider APIs were not called)
5. Reconciliation remains safe — **NOT RE-PROVEN**
6. Idempotency unchanged — code path retained

## Why we cannot guess

OD-3 Production deploy of UUID **writes** succeeded `2026-08-15T13:26:40Z` (commit `c1d64cba`, later docs `17d990dd`).

PayPal checkout orders typically remain completable for hours. Tap charge retries are not inventoried in-app.

This program must not call real provider APIs to list pending orders.

Therefore the compatibility window **cannot be closed**.

## Retained behavior

- New writes: UUID (`custom_id.planId`, `metadata.plan_id`)
- Incoming leftover integer: `parseWebhookPlanRef` → `resolveCanonicalLivePlanId` → UUID persist
- Unknown integer / unknown UUID: fail closed
- Provider transaction IDs unchanged
