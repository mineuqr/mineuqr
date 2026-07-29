# FINAL REPORT — REALTIME-ORDERS-ADOPTION-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Constraints:** Orders only · No commit · No push · No deploy

---

## 1. Executive Summary

Operational Orders now use the Realtime Platform as **primary cross-device discovery**. After P-02 projection sync, metadata-only `orders` hints fan out over SSE; Orders Workspace invalidates `listActive`, refetches, and applies Read Freshness Governance. Polling remains as automatic recovery (15s when live, 3s otherwise). BroadcastChannel coexists via a shared debounce coordinator. Domain, Outbox, Event Pipeline, projections, and aggregates are unchanged in behaviour.

---

## 2. Adoption Architecture

```
Command → Aggregate → Outbox → Relay → P-02 sync
  → Realtime Hint (orders)
  → SSE Gateway
  → Orders Workspace (RealtimePlatform API)
  → invalidate listActive
  → refetch
  → Read Freshness merge
  → render

Fallback: poll (3s / 15s) + BroadcastChannel (same-origin)
```

---

## 3. Orders Integration Design

| Side | Module |
|---|---|
| Publish | `server/order/read/realtime/publishOrdersRealtimeHintAfterProjection.ts` |
| Hook | `ActiveOrdersProjectionConsumer` after `syncOrderProjections` |
| Subscribe | `useOrdersWorkspaceRealtime` → `OrdersWorkspacePanel` |
| Invalidate | `ordersListActiveInvalidationCoordinator` |

No `EventSource` in Orders feature code.

---

## 4. Subscription Flow

1. Workspace enabled → `trpc.realtime.mintTicket({ channels: ["orders"] })`  
2. `buildRealtimeSseUrl` + `getRealtimePlatform().connect`  
3. On unmount → `disconnect`  
4. Failures → `poll_only` (3s poll)

---

## 5. Hint Flow

| Domain event | Hint type |
|---|---|
| OrderCreated | `order.created` |
| OrderStatusChanged / OrderReady / LifecycleStage | `order.status_changed` |
| OrderCompleted | `order.served` |
| OrderCancelled | `order.cancelled` |

Envelope fields used: `restaurantId`, `sequenceNumber`, `eventId` (version), `correlationId`, `orderId`.

---

## 6. Invalidation Strategy

Hints **never** write React Query cache.  
Path: hint → debounce (75ms) → `listActive.invalidate` → refetch → structuralSharing / confirmed-write merge.

---

## 7. Read Freshness Validation

`orderReadListQueryOptions` retains `activeOrderListStructuralSharing` and confirmed-write watermarks from ORDER-STATE-PROPAGATION-REMEDIATION-1. Unchanged.

---

## 8. Polling Fallback Validation

| Realtime state | Poll |
|---|---|
| `live` | 15s recovery |
| `poll_only` / disabled / reconnecting | 3s |

No user action required.

---

## 9. Broadcast Integration

Same-origin BC still publishes from status mutations.  
Subscribers use the **same** debounced invalidation coordinator as SSE → one invalidate per window.

---

## 10. Reconnect Validation

Handled by `RealtimePlatformClient` (backoff, catch-up event, visibility resume). Ticket remint on full hook remount; expiry drives poll_only until remount/navigation.

---

## 11. Performance Benchmark

| Path | Target | Status |
|---|---|---|
| Projection → hint → invalidate → refetch → render (cross-device) | p95 &lt; 1s | Architecture-ready; measure post-deploy with OLT + realtime metrics |
| Poll fallback | ≤ prior 3s SLA | Retained when not live |

Live p50–p99 not fabricated here.

---

## 12. Observability Report

Reuse: `realtime_hint_published` / `realtime_hint_delivered` / connection metrics + existing OLT client marks on invalidate.

---

## 13. Security Review

| Control | Status |
|---|---|
| Tenant isolation | Ticket + gateway restaurantId check |
| Channel ACL | `orders` only for this surface |
| No DTO payloads | Metadata-only publisher |
| Kitchen/customer not subscribed | Guarded |

---

## 14. Test Results

- `server/order/read/__tests__/realtimeOrdersAdoption.architecture.guards.test.ts`  
- `client/src/lib/orders-workspace/__tests__/ordersListActiveInvalidationCoordinator.test.ts`  
- Updated realtime foundation/architecture guards  

---

## 15. Regression Analysis

| Risk | Mitigation |
|---|---|
| Hint before projection | Publish only after P-02 sync |
| Invalidate storm | Debounce coordinator |
| Stale overwrite | Read Freshness unchanged |
| Platform disabled | Automatic poll_only |
| Other modules | Not wired |

---

## 16. Production Readiness Report

| Criterion | Status |
|---|---|
| Orders primary discovery via realtime | ✓ (when platform enabled) |
| Polling fallback | ✓ |
| No EventSource in Orders | ✓ |
| Platform API only | ✓ |
| Read Freshness / Domain / Outbox preserved | ✓ |
| Kitchen/Customer not migrated | ✓ |
| `orders-workspace.migrated` | ✓ true |
| Deploy | Not done |

Production requires `REALTIME_PLATFORM_ENABLED=true` (and multi-instance bus before multi-node SSE fan-out).

**Recommended next:** `REALTIME-KITCHEN-ADOPTION-1` or `REALTIME-BUS-REDIS-1`.

---

**No commit / push / deploy.**

**READY FOR ARCHITECTURE AUTHORITY REVIEW**
