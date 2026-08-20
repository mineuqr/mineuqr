# DOWNSTREAM-TIMING-REPORT

## Source (MEASURED in repo)

After HTTP, server schedules `void completeCashierOperationalSettlementAfterCollectionFact`.

That function: OPEN Check → `finalizeOpenCheckById` (PAID+ST+OS+SR). PAID Check → fill missing ST/OS/SR only.

## Production worker

**MEASURED in source:** `startCashierDownstreamSettlementRecoveryWorker()` runs inside `startServer().listen`, and `startServer` runs only when `!process.env.VERCEL`.

Production API is `scripts/vercel-handler.ts` / `api/index.ts`. **The sweep worker is not started on Vercel.**

**MEASURED in source:** `scripts/vercel-handler.ts` has **no `waitUntil`**. There is no platform hook keeping the isolate alive after HTTP returns.

**INFERRED:** `void completeCashier…` is in-request background work. After the serverless handler returns, the isolate may freeze; ST/OS/SR may never complete until a later request that re-enters Check finalize (POS idempotency replay does `scheduleCashierDownstreamSettlementRecovery` without awaiting).

Whether ST/OS/SR complete immediately, seconds later, only after sweep, or never: **UNKNOWN** without production row timestamps.

## Do not claim “recovery works in production”

Unit tests passed for the worker. Production Vercel boot path does not construct that worker. That is a **gap**, not a measured success.
