# IMPLEMENTATION — ORDER-LIFECYCLE-LATENCY-REMEDIATION-1

**Date:** 2026-07-29  
**Type:** Production Performance Remediation  
**Status:** Implemented — awaiting Architecture Authority review  
**Driven by:** FORENSICS-1 Mode A/B + INSTRUMENTATION-1 spans

---

## Changes (by phase)

### Phase 1 — Critical path
- `runOrderCommand({ awaitRelay: false })` for **status transitions only**
- Outbox relay scheduled via `setImmediate` / `setTimeout(0)` after HTTP return
- Place-order and other callers keep **awaited** relay (default)

### Phase 2 — Client response
- Optimistic `order.read.listActive` patch on mutate (`onMutate` / rollback on error)
- Mutation success no longer awaits invalidate before resolving

### Phase 3 — Invalidation governance
- Removed awaited `order.list` + `printWorkspace` invalidates from status path
- Removed Orders Workspace double `refetch()` after invalidate
- Kept `listActive` + kitchen queue invalidate (non-blocking)

### Phase 4 — Event pipeline
- Relay/projection/integration remain ordered inside deferred batch
- Event ordering / idempotency unchanged; consistency becomes near-immediate for initiator via optimistic UI

### Phase 5 — Realtime strategy
- **Adopted:** same-origin `BroadcastChannel` fan-out (`mineuqr:order-lifecycle`)
- **Fallback:** operational poll **3s** (was 10s) for active lists / kitchen / waiter table
- Dashboard reporting polls remain **10s**
- Full WebSocket/SSE **not** introduced (remaining debt)

### Phase 6 — Rendering
- Removed redundant refetch waterfalls; optimistic patch reduces waiting renders
- No speculative memoization sweep

---

## Validation

```bash
npx vitest run server/order/observability/__tests__/orderLifecycleLatencyRemediation.architecture.guards.test.ts server/order/observability/__tests__/orderLifecycleLatencyInstrumentation.architecture.guards.test.ts
```
