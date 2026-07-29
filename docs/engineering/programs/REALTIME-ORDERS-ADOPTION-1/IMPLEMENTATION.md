# IMPLEMENTATION — REALTIME-ORDERS-ADOPTION-1

**Date:** 2026-07-29  
**Type:** Platform Adoption (Operational Orders only)

## Server

- After durable `ActiveOrdersProjectionConsumer` (P-02) sync → `publishOrdersRealtimeHintAfterProjection`
- Channel: `orders` only
- Hint types: `order.created` | `order.status_changed` | `order.cancelled` | `order.served`
- Metadata only (`seq` = envelope `sequenceNumber`)

## Client

- `useOrdersWorkspaceRealtime` — mint ticket + `getRealtimePlatform().connect({ channels: ["orders"] })`
- Hint / catch-up → debounced `listActive.invalidate` → refetch → Read Freshness merge
- BroadcastChannel remains; shares invalidation coordinator (no storm)
- When realtime `live`: poll **15s** recovery; otherwise **3s**

## Capability registry

`orders-workspace.migrated = true` (others remain false)

## Out of scope

Kitchen, Expo, Customer, Dashboard, Sessions, etc.
