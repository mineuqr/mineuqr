# IMPLEMENTATION — ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1

**Date:** 2026-07-29  
**Type:** Production Observability Instrumentation  
**Status:** Implemented — awaiting Architecture Authority review  
**Constraints:** Instrumentation only · No latency remediation · No commit / push / deploy of fixes

---

## 1. Architecture

| Piece | Path |
|---|---|
| Shared contracts + aggregator | `shared/order-lifecycle-latency/` |
| Server ALS + opsLog emitter | `server/order/observability/orderLifecycleLatency.ts` |
| Client marks + observer samples | `client/src/lib/order-lifecycle-latency/` |
| Ops taxonomy | `order_lifecycle_latency_summary` / `_span` / `_observer` |

**Trace ID:** `olt_<uuid>` generated on client click; sent as `x-correlation-id` for the mutation request; server ALS uses `ctx.correlationId`.

**Disable:** `ORDER_LIFECYCLE_LATENCY=0` (server), `VITE_ORDER_LIFECYCLE_LATENCY=0` (client).  
**Detail spans:** `ORDER_LIFECYCLE_LATENCY_DETAIL=1` / `VITE_ORDER_LIFECYCLE_LATENCY_DETAIL=1`.

---

## 2. Trace flow

```
Client click → beginTrace(olt_*)
  → mutation_start
  → HTTP (x-correlation-id: olt_*)
  → Server withOrderLifecycleLatency(traceId)
       → api_entry / authz
       → command_start → domain_command_ms → command_complete
       → relay_start → event_relay_ms (+ integration/projection phase ms)
       → api_exit → order_lifecycle_latency_summary (opsLog)
  → Client mutation_success
  → invalidate_* → refetch_* → visible_update
  → client summary console `[mineuqr:olt] summary`
Observer poll (Mode A) → `[mineuqr:olt] observer` delayMs
```

---

## 3. What was intentionally NOT changed

Polling intervals · realtime · projections · domain commands · optimistic UI · invalidate targets · APIs/DB schema.

---

## 4. Validation

```bash
npx vitest run server/order/observability/__tests__/orderLifecycleLatencyInstrumentation.architecture.guards.test.ts
```

Run from repo root.
