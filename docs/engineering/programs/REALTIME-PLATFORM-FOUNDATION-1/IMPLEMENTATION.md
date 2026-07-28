# IMPLEMENTATION — REALTIME-PLATFORM-FOUNDATION-1

**Date:** 2026-07-29  
**Type:** Platform Foundation Implementation  
**Mode:** Dark-launch foundation — **no feature migration**

## Packages

| Package | Path |
|---|---|
| Shared contracts | `shared/realtime-platform/` |
| Server platform | `server/realtime-platform/` |
| Client platform API | `client/src/lib/realtime-platform/` |

## HTTP / tRPC

| Surface | Path |
|---|---|
| SSE gateway | `GET /api/realtime/sse?ticket=…` |
| Health | `GET /api/realtime/health` |
| Mint / refresh / revoke | `trpc.realtime.*` |

## Enablement

- `REALTIME_PLATFORM_ENABLED=true` required in production  
- Non-production defaults to enabled for local verification  
- Optional `REALTIME_TICKET_SECRET` (falls back to derived JWT secret)

## Explicit non-goals (this program)

- No Orders / Kitchen / Expo / Customer / Dashboard wiring  
- No domain/outbox/projection changes  
- No browser WebSocket  
- No Redis yet — `RealtimePubSub` interface ready for multi-instance

## Connector boundary

Connector WebSocket (`/connector/ws`) remains the print/RLC plane. Browser realtime is SSE only.
