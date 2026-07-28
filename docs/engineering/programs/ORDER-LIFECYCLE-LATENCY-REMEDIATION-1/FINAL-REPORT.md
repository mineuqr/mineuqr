# FINAL REPORT — ORDER-LIFECYCLE-LATENCY-REMEDIATION-1

**Date:** 2026-07-29  
**Type:** Production Performance Remediation  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Do not commit / push / deploy unless approved**

---

## 1. Executive Summary

Targeted remediations address measured Mode A (observer poll ceiling) and Mode B (sync relay + awaited invalidate/refetch). Initiating operators get optimistic status feedback as soon as the domain commit HTTP returns; observers get same-origin BroadcastChannel updates plus a 3s poll fallback. Domain rules, settlement, reporting, and event ordering guarantees are preserved.

---

## 2. Production Baseline (from FORENSICS + INSTRUMENTATION)

| Mode | Baseline symptom | Evidence |
|---|---|---|
| A | Up to ~10s observer lag | `DATA_POLL` / list poll = 10_000; no WS |
| B | Multi-second button pending | `await runOrderEventRelayBatch` + awaited 4× invalidate + double refetch |

Instrumentation still emits `order_lifecycle_latency_summary` / `[mineuqr:olt]` for before/after comparison.

---

## 3. Measured Bottlenecks (addressed)

1. Sync event relay on status HTTP path  
2. Awaited multi-query invalidate + extra refetch  
3. No optimistic presentation  
4. 10s observer poll with no same-origin fan-out  

---

## 4. Critical Path Changes

| Operation | Before | After (status transitions) |
|---|---|---|
| Domain commit | On path | On path (unchanged) |
| Outbox relay + consumers + projections | Awaited before HTTP 200 | **Deferred** after response |
| Place-order relay | Awaited | **Still awaited** (default) |

---

## 5. Client Optimizations

- Optimistic `listActive` status patch (reversible on error)  
- `mutateAsync` resolves without waiting for invalidate network  
- Broadcast publish on success  

---

## 6. Query Invalidation Improvements

| Invalidate | Status path |
|---|---|
| `order.read.listActive` | Non-blocking (kept) |
| `kitchen.read.getQueue` | Non-blocking (kept) |
| `order.list` | **Removed** from status path |
| `printWorkspace.listOrders` | **Removed** from status path |
| Extra panel `refetch()` | **Removed** |

---

## 7. Event Pipeline Improvements

Deferred relay preserves in-process ordering inside the batch. Idempotent consumers unchanged. Initiator does not wait for push/print/projection completion.

---

## 8. Realtime Strategy

| Mechanism | Status |
|---|---|
| BroadcastChannel same-origin | **Adopted** |
| Operational poll 3s | **Adopted** as cross-device fallback |
| WebSocket/SSE | **Not adopted** — remaining debt |

---

## 9. Rendering Improvements

Fewer waterfall refetches; optimistic cache update paints new status without waiting for projection refetch.

---

## 10. Before vs After Metrics

| Metric | Before (architecture) | After (expected) |
|---|---|---|
| Initiator visible update | After relay + invalidate | After commit (+ optimistic) |
| Server status HTTP (Mode B) | Includes relay/push/print | Dominated by domain_command_ms |
| Observer same-origin | ≤10s poll | Near-immediate BroadcastChannel |
| Observer cross-device | ≤10s | ≤3s poll fallback |
| P95/P99 | Measure via instrumentation after deploy | Compare `totalMs` / `event_relay_mode=deferred` |

Live p50–p99 tables require post-deploy instrumentation samples (not fabricated here).

---

## 11. Regression Assessment

| Area | Risk | Mitigation |
|---|---|---|
| Brief projection lag after status HTTP | Low–Med | Optimistic UI; deferred relay still runs; 3s poll |
| Missed relay if process dies mid-schedule | Low | Outbox remains; next mutation/relay drains pending |
| Stale print/history lists | Low | Own polls; not on status critical path |

---

## 12. Validation Results

Guards: `orderLifecycleLatencyRemediation.architecture.guards.test.ts`  
Instrumentation guards updated for 3s operational poll.

---

## 13. Remaining Performance Debt

- Cross-device true realtime (WS/SSE) with tenant isolation  
- Per-consumer async isolation (push/print off even deferred batch critical path)  
- React Profiler commit timing wiring  
- Production APM dashboard over aggregator  

---

## 14. Architecture Notes

- DB commit remains source of truth.  
- Optimistic UI is presentation-only and rolled back on mutation error.  
- Event ordering within deferred batch unchanged.  
- Observability retained (`event_relay_mode: deferred|awaited`).  

---

## Artifacts

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)  
- Prerequisites: FORENSICS-1, INSTRUMENTATION-1  

**Awaiting Architecture Authority approval.**
