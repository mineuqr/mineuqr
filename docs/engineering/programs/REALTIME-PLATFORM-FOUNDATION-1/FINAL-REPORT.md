# FINAL REPORT — REALTIME-PLATFORM-FOUNDATION-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Constraints:** No feature migration · No commit · No push · No deploy

**Prerequisites:** Latency + state-propagation programs · REALTIME-PLATFORM-ARCHITECTURE-1 (Hybrid SSE)

---

## 1. Executive Summary

MineuQR now has a **feature-independent Realtime Platform Foundation**: shared protocol/channel/capability registries, HMAC realtime tickets, in-memory (multi-instance-ready) pub/sub, metadata-only hint publisher, SSE gateway with tenant/channel ACL, and a client runtime that encapsulates `EventSource` / BroadcastChannel behind `RealtimePlatform` APIs.

**No Orders, Kitchen, Customer, or other surfaces were migrated.** All surface capabilities remain `migrated: false`. Polling and existing feature BroadcastChannel usage are unchanged.

---

## 2. Foundation Architecture

```
Features (future)
  → RealtimePlatform client API / HintPublisher
  → Ticket mint (tRPC) + SSE (/api/realtime/sse)
  → Gateway ACL + PubSub bus
  → Hint → invalidate/refetch → Read Freshness Governance
```

Realtime never owns state. Outbox / projections / domain remain authoritative.

---

## 3. Gateway Architecture

`RealtimeSseGateway`:

- Ticket verify + revocation check  
- Channel intersection ACL  
- Per-connection bus subscriptions  
- Heartbeat events  
- `platform.ready` / `platform.catch_up`  
- Hard restaurantId isolation on deliver  
- Customer `orderId` aggregate scope  
- Graceful `shutdown()`  

Browser WebSocket: **not** implemented (architecture decision).

---

## 4. Client Runtime Architecture

`RealtimePlatformClient`:

- Connection / reconnect / backoff  
- Seq tracker → duplicate suppression + gap → `onCatchUp`  
- Visibility resume  
- `poll_only` fallback activation  
- `RealtimeBroadcastBridge` for future BC consolidation  

Features must not import `EventSource` directly.

---

## 5. Hint Publisher Design

`RealtimeHintPublisher`:

- Validates channel + metadata-only envelope  
- Publishes to `RealtimePubSub`  
- Metrics + opsLog  
- **No DB, no domain, no aggregates**

---

## 6. Channel Registry

Canonical channels in `REALTIME_CHANNEL_REGISTRY`:  
`orders`, `kitchen`, `expo`, `waiter`, `sessions`, `checks`, `devices`, `notifications`, `dashboard`, `customer`, `reporting`, `print`

Each defines owner, auth modes, delivery class, ordering, retention.

---

## 7. Capability Registry

`REALTIME_SURFACE_CAPABILITY_REGISTRY` lists future surfaces with `migrated: false`. SSOT for adoption programs.

---

## 8. Protocol Specification

- Protocol **v1** (`REALTIME_PROTOCOL_VERSION = 1`)  
- Hint envelope: `v, type, channel, restaurantId, aggregateId?, seq, version?, ts, correlationId?`  
- SSE events named by hint type + platform control events  

---

## 9. Protocol Versioning

- `REALTIME_PROTOCOL_MIN_VERSION` / `REALTIME_PROTOCOL_VERSION`  
- Negotiation rejects unsupported client versions  
- Forward-compatible field discipline (metadata only)

---

## 10. Feature Negotiation

`negotiateRealtimeCapabilities()` intersects client offers with server defaults (heartbeat, reconnect, poll fallback, broadcast bridge, last-event-id, compression).

Returned on ticket mint.

---

## 11. Authentication Model

- Short-lived HMAC tickets (`mintRealtimeTicket`)  
- Claims: jti, restaurantId, authMode, channels, sub, exp, capabilities  
- Refresh rotates jti (revoke old)  
- Revocation set (process-local; shared store later)  
- Production enablement gate: `REALTIME_PLATFORM_ENABLED`

---

## 12. Authorization Model

- Staff mint requires `assertRestaurantAccess`  
- Channel ACL via `authModes` per channel  
- Gateway re-checks channel membership + tenant on every deliver  
- Customer mode aggregate scoping when `orderId` bound  

---

## 13. Delivery Guarantees

| Guarantee | Implementation |
|---|---|
| At-least-once hints | Pub/sub fan-out |
| Exactly-once transport | **Not** implemented |
| Seq / dup / gap | `RealtimeSequenceTracker` |
| Catch-up | `platform.catch_up` + client `onCatchUp` |
| Cache writes | **Forbidden** — hints signal only |

---

## 14. Failure Recovery

- Reconnect with exponential backoff  
- Max attempts → `poll_only` + `onFallback`  
- Ticket expiry → HTTP 401; client remints via tRPC  
- Gateway shutdown drains connections  
- Multi-instance: swap `InMemoryRealtimePubSub` for Redis adapter (interface ready)

---

## 15. Observability Report

Ops events: `realtime_connection_*`, `realtime_hint_*`, `realtime_auth_failed`, `realtime_gap_detected`, `realtime_fallback_activated`.

Counters: connections, subscriptions, publishes, deliveries, dropped, reconnects, gaps, fallbackActivations, authFailures, heartbeats.

Exposed via `trpc.realtime.status`.

---

## 16. Security Review

| Threat | Control |
|---|---|
| Cross-tenant deliver | restaurantId check |
| Channel escalation | ticket channel allow-list |
| Ticket forgery | HMAC + timing-safe compare |
| Ticket replay after revoke | jti revocation |
| Protocol downgrade | version negotiation |
| Capability spoof | server intersection |
| Fat payload injection | `assertHintIsMetadataOnly` |
| Connector confusion | Separate WS plane unchanged |

---

## 17. Performance Assessment

| Item | Foundation posture |
|---|---|
| Hint size | Metadata-only (small) |
| Fan-out | In-process O(subscribers) |
| SSE idle cost | Heartbeat 15s |
| Poll load | Unchanged (no migration) |
| Horizontal scale | Requires Redis/cloud bus before multi-gateway |

---

## 18. Test Results

Run from repo root:

- `server/realtime-platform/__tests__/realtimePlatform.foundation.test.ts`  
- `server/realtime-platform/__tests__/realtimePlatform.architecture.guards.test.ts`  

---

## 19. Production Readiness Report

| Criterion | Status |
|---|---|
| Feature-independent platform | ✓ |
| No screen uses EventSource directly (features) | ✓ (platform-only) |
| No business logic in realtime | ✓ |
| Read Freshness / Outbox / Domain preserved | ✓ |
| Tenant isolation enforced | ✓ |
| Protocol + capability negotiation | ✓ |
| Channel registry | ✓ |
| Gateway usable | ✓ (enable flag) |
| Feature migration | **None** (by design) |
| Deploy | **Not done** |

Production cutover requires: explicit `REALTIME_PLATFORM_ENABLED=true`, ticket secret ops, and a follow-on multi-instance bus before multi-node SSE.

---

## 20. Migration Readiness Assessment

Foundation is ready for phased adoption programs:

1. `REALTIME-ORDERS-ADOPTION-1`  
2. `REALTIME-KITCHEN-ADOPTION-1`  
3. …per architecture migration roadmap  

Each adoption program must: mint tickets, subscribe via `RealtimePlatformClient`, publish hints after projections, keep poll fallback, leave `migrated: true` only when certified.

**Recommended next program:** `REALTIME-ORDERS-ADOPTION-1` (or bus hardening `REALTIME-BUS-REDIS-1` if multi-instance is prerequisite for the target deploy topology).

---

## Artifacts

- `shared/realtime-platform/**`  
- `server/realtime-platform/**`  
- `client/src/lib/realtime-platform/**`  
- `docs/engineering/programs/REALTIME-PLATFORM-FOUNDATION-1/*`  

**No commit / push / deploy performed.**

**READY FOR ARCHITECTURE AUTHORITY REVIEW**
