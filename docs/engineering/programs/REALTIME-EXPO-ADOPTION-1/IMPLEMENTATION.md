# IMPLEMENTATION — REALTIME-EXPO-ADOPTION-1

**Date:** 2026-07-29  
**Type:** Platform Adoption (Expo only)

## Server

- After durable P-02 sync → `publishExpoRealtimeHintAfterProjection` (channel `expo`)
- Device ticket: `mintRealtimeTicket` — `expo_display` → `expo` channel (alongside kitchen_display → kitchen)

## Client

- `useExpoRuntimeRealtime` — Realtime Platform API; gated `role === "expo_display"`
- Wired from shared queue stream (`useKitchenRuntimeStream`) alongside kitchen hook
- Hint → shared debounced queue invalidate → refetch + Read Freshness
- Live poll **15s**; fallback **3s**
- Readiness / pickup workflows unchanged (domain + presentation)

## Capability registry

`expo-screen.migrated = true`
