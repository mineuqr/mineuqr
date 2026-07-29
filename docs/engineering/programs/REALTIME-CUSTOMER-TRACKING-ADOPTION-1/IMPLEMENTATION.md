# IMPLEMENTATION — REALTIME-CUSTOMER-TRACKING-ADOPTION-1

**Date:** 2026-07-28  
**Type:** Platform Adoption (Customer Tracking only — public-facing)

## Server

- After durable P-11 (`PublicOrderStatusProjectionConsumer`) sync → `publishCustomerRealtimeHintAfterProjection` (channel `customer`)
- Public mint: `trpc.realtime.mintCustomerTicket({ trackingToken, slug })` — `customer_tracking` auth, channel `customer` only
- SSE delivery sanitizes via `toPublicCustomerRealtimeHint` (no restaurant/order/version/seq in data)
- `platform.ready` for customers omits `restaurantId`
- Customer SSE event ids use `customer:{trackingRef}:{seq}` (no order id)

## Client

- `useCustomerTrackingRealtime` — Realtime Platform API; no EventSource in page/hook
- Wired from `OrderStatusPage`
- Hint → invalidate `getPublicStatus` → refetch (write-model authority unchanged)
- Live poll **15s**; fallback **3s**
- Web Push / ready alerts unchanged (`useReadyStatusAlerts`)

## Privacy

Public hint fields only: `type`, `trackingRef`, `ts`, `correlationId`

## Capability registry

`customer-tracking.migrated = true`, `readFreshness: true`
