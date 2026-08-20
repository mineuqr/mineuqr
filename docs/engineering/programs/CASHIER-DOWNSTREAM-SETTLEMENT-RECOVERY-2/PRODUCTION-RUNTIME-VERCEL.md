# PRODUCTION-RUNTIME-VERCEL

## What Production actually runs

- API: `api/index.ts` → `scripts/vercel-handler.ts` → `createApp()` (`createApiApp`)
- `startServer()` does **not** run when `process.env.VERCEL` is set
- In-process 15s worker is therefore **not** Production

## What this program added

1. Express route `GET|POST /api/internal/cashier-downstream-recovery/sweep` registered from `createApiApp` (reachable through `/api/:path*` rewrite)
2. `vercel.json` cron: every minute, that path
3. Auth: Vercel Cron `Authorization: Bearer $CRON_SECRET`

## Operator setup (required for Production correctness)

1. Set `CRON_SECRET` on the Vercel project (Vercel injects it on cron requests)
2. Deploy this revision so `vercel.json` crons are applied
3. Confirm Vercel plan allows `* * * * *` (Hobby may only allow daily — **UNKNOWN** for this project)

Until cron + secret are live in the project, durability after isolate freeze is **UNKNOWN**.

## waitUntil

`continueAfterCashierHttp` dynamically imports `@vercel/functions` when present. If missing, work is `void`ed (same as Recovery-1 fast path). **Not** the durable mechanism.
