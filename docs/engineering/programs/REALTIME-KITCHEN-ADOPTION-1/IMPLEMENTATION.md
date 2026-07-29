# IMPLEMENTATION — REALTIME-KITCHEN-ADOPTION-1

**Date:** 2026-07-29  
**Type:** Platform Adoption (Kitchen only)

## Server

- After durable P-02 sync → `publishKitchenRealtimeHintAfterProjection` (channel `kitchen`)
- Device ticket: `operationalDevice.runtime.mintRealtimeTicket` — **kitchen_display only**, channel `kitchen` only

## Client

- `useKitchenRuntimeRealtime` — Realtime Platform API; gated `role === "kitchen_display"`
- Expo keeps poll + BroadcastChannel only (realtime disabled for `expo_display`)
- Hint → debounced queue invalidate/refetch → existing `useKitchenArrivalNotifications` (unchanged)
- Live poll **15s**; fallback **3s**

## Capability registry

`kitchen-screen.migrated = true` · `expo-screen.migrated = false`
