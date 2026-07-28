# FINAL REPORT — ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1

**Date:** 2026-07-29  
**Type:** Production Observability Instrumentation  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Do not optimize / do not remediate latency in this program**

---

## 1. Executive Summary

MineuQR can now measure and correlate Order Lifecycle transition latency across client, network/server, domain command, event relay, projection dispatch, cache invalidate/refetch, and observer poll delay (Mode A). Instrumentation is opt-out, structured, and does not change operational behavior.

---

## 2. Instrumentation Architecture

- **Shared:** `shared/order-lifecycle-latency` (trace IDs, span/summary contracts, rolling aggregator)
- **Server:** AsyncLocalStorage context + `opsLog` (`order_lifecycle_latency_summary`)
- **Client:** per-transition marks + `[mineuqr:olt]` structured console summaries
- **Correlation:** client `lifecycleTraceId` → `x-correlation-id` → server `ctx.correlationId`

---

## 3. Trace Flow Diagram

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) §2.

---

## 4. Client Instrumentation Summary

Surfaces: Orders Workspace (`useOrderStatusActions`), Operational Device (`useOperationalDeviceOrderActions`).  
Marks: click → mutation_start/success/error → invalidate → refetch callback → visible_update.  
Transport: `trpcLinks` / `screenTrpcLinks` prefer `lifecycleTraceId` as correlation header.

---

## 5. Network Instrumentation Summary

Client phase `network_and_server_ms` = mutation_start → mutation_success (includes upload, server wait, download).  
Server totalMs from ALS covers API entry → exit. Fine-grained TTFB requires browser PerformanceResourceTiming (future dashboard).

---

## 6. API Instrumentation Summary

`order.updateStatus` and `executeDeviceOrderAction` wrap `withOrderLifecycleLatency`. Marks: `api_entry`, `authz`, `api_exit`.

---

## 7. Domain Instrumentation Summary

`runOrderCommand` records `domain_command_ms` when ALS active (load + rules + save + commit inside the existing command). Place-order callers unaffected (no ALS).

---

## 8. Database Instrumentation Summary

No separate Drizzle hooks (avoid behavior/risk). DB work is included in `domain_command_ms`. Slow-query attribution remains a future APM/DB program.

---

## 9. Event Instrumentation Summary

`event_relay_ms` + batch meta (`processed` / `published` / `failed`).  
`integration_dispatch_ms` via `CompositeEventDispatchDelegate`.  
Existing `order_consumer_executed` logs now attach lifecycle `correlationId` when ALS present.

---

## 10. Projection Instrumentation Summary

`projection_dispatch_ms` on composite dispatch.  
Existing `order_projection_consumer_executed` attaches lifecycle `correlationId` when ALS present.

---

## 11. Rendering Instrumentation Summary

`visible_update` mark after invalidate/refetch path (proxy for UI readiness). Full React Profiler commit timings not wired (would alter DevTools coupling); reserved in contracts as `render_commit`.

---

## 12. Metrics Catalog

| Metric | Source |
|---|---|
| Transition totalMs | client + server summaries |
| domain_command_ms | server |
| event_relay_ms | server |
| integration_dispatch_ms | server |
| projection_dispatch_ms | server |
| invalidate_ms | client |
| refetch_callback_ms | client |
| network_and_server_ms | client |
| observer delayMs | client Mode A sample |
| Aggregates p50/p90/p95/p99 | `getOrderLifecycleLatencyAggregate()` (in-process; last 200) |

Dashboard UI not implemented — aggregator ready for a future admin/ops surface.

---

## 13. Sample Production Trace

```json
{
  "program": "ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1",
  "traceId": "olt_…",
  "transition": "preparing->ready",
  "surface": "order.updateStatus",
  "result": "ok",
  "totalMs": 1842,
  "phases": {
    "domain_command_ms": 45,
    "event_relay_ms": 1610,
    "integration_dispatch_ms": 1400,
    "projection_dispatch_ms": 180
  },
  "realtimeEnabled": false,
  "pollIntervalMs": 10000
}
```

Client companion summary emits under `[mineuqr:olt] summary` with invalidate/refetch phases.

---

## 14. Validation Results

Architecture guards: `orderLifecycleLatencyInstrumentation.architecture.guards.test.ts`  
Asserts: contracts, taxonomy, wiring, poll unchanged, no WebSocket introduction, docs present.

---

## 15. Production Overhead Assessment

- One structured **info** summary log per status transition
- Optional **debug** spans when `*_DETAIL=1`
- ALS + a few `Date.now`/`performance.now` marks — microsecond class vs mutation work
- No extra DB queries, no extra network round-trips, no poll changes

---

## 16. Recommended Remediation Program (capability only)

After collecting production summaries, Architecture Authority may approve a **separate** remediation program. Instrumentation now distinguishes:

| Mode | Evidence field |
|---|---|
| A — observer poll wait | `[mineuqr:olt] observer` `delayMs` ≈ 0–10000 |
| B — sync relay/projections | server `event_relay_ms` / `integration_dispatch_ms` / `projection_dispatch_ms` |
| B — client refresh | client `invalidate_ms` + `refetch_callback_ms` |

Suggested follow-on name: `ORDER-LIFECYCLE-LATENCY-REMEDIATION-1` (scope TBD from measured p95s) — **not started here**.

---

## Artifacts

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- Forensics prerequisite: `docs/engineering/programs/ORDER-LIFECYCLE-LATENCY-FORENSICS-1/`

**Awaiting Architecture Authority approval.**
