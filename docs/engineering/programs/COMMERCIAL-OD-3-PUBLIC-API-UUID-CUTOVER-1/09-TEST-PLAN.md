# 09 — TEST PLAN

## New

- `od3PublicApiUuid.test.ts` — UUID accept, malformed/integer reject, unknown fail-closed, webhook dual-read
- `od3PublicApiUuid.guards.test.ts` — routers, PayPal type, trial, Pricing, CS, no leftover-table fallback, bridges retained

## Updated

Checkout/admin/trial/webhook/listPlans fixtures and assertions.

## Results (OD-3 related set)

16 files, **112 passed**, 0 failed.

`pnpm build`: **PASS**
