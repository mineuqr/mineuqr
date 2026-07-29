# IMPLEMENTATION — REALTIME-PUBLIC-TICKET-HARDENING-1

**Date:** 2026-07-28  
**Type:** Platform Security Hardening (public tickets only)

## Opaque tickets

- Format: `rt_live_` + 256-bit `base64url` random (no JWT, no embedded claims)
- Registry: `server/realtime-platform/tickets/RealtimeOpaqueTicketRegistry.ts`
- Authorize: `authorizeRealtimeCredential` (gateway) — registry for opaque; signed JWT for staff/device

## Mint / renew / revoke

- `mintCustomerTicket` → `issueOpaqueCustomerTicket` by default
- `renewCustomerTicket` → rotate opaque id
- `revokeCustomerTicket` → registry revoke
- Rollback: `REALTIME_OPAQUE_CUSTOMER_TICKETS=false` → legacy signed customer mint (API still omits claims JSON)

## Migration

- Legacy customer JWT still accepted while `REALTIME_LEGACY_CUSTOMER_JWT !== "false"`
- Cutover: set `REALTIME_LEGACY_CUSTOMER_JWT=false`
- Staff / device tickets unchanged (signed)

## Privacy deltas

- Mint API no longer returns `trackingRef`
- Customer `platform.ready` omits `restaurantId` and `trackingRef`
- Customer SSE event ids use connection id (not tracking hash)

## Unchanged

Transport, channels, hint model fields, Customer Tracking UX/hooks, projections, Read Freshness, business logic.
