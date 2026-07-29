# IMPLEMENTATION — REALTIME-PRODUCTION-ENABLEMENT-1

**Date:** 2026-07-29  
**Mode:** Production Configuration + UX Hardening

## Production configuration

- Vercel Production: `REALTIME_PLATFORM_ENABLED=true` (set via `vercel env add`)
- Requires redeploy for serverless runtime to pick up the variable

## Semantic changes

- `evaluateRealtimeAlerts`: disabled → info `platform_disabled`; gateway failure → critical `gateway_unavailable`
- Dashboard/router: stop equating `!enabled` with `gatewayUnavailable`
- Ops UI: `realtimePlatformPresentation.ts` maps Disabled ≠ Unavailable

## Non-changes

- No gateway/SSE/API/collector/business logic changes
- Health evaluator ownership unchanged (UI maps disabled presentation)
