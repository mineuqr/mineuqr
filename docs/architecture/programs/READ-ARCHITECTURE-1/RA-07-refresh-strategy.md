# RA-07 — Refresh Strategy

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Refresh Principles

1. **Primary:** Event-driven projection updates via certified outbox pipeline (ADR-ARCH-014).
2. **Secondary:** Client query invalidation on successful commands (read-your-writes UX).
3. **Transitional:** Interval polling until push/subscribe is introduced per surface.
4. **Forbidden:** Full-table polling of write model (`order.list` on `orders` table).

**Traceability:** Blueprint §11 Update strategy; ORDERS-READ-MODEL-1 RM-08; Constitution principle 8.

---

## Event-Driven Refresh (Primary)

### Pipeline

```
Aggregate commit
  → Outbox record
  → Relay batch (post runOrderCommand)
  → Publisher
  → Registry parallel dispatch
  → Projection Consumer
  → Projection Repository upsert
```

### Per-Projection Behavior

| Projection | On event | Store operation |
|------------|----------|-----------------|
| P-02 Active | OrderCreated | INSERT active row |
| P-02 Active | OrderCompleted / Cancelled | DELETE or mark inactive |
| P-02 Active | OrderStatusChanged | UPDATE status index |
| P-06 KPI | Any status event | Increment/decrement counters |
| P-10 Analytics | OrderCompleted | Upsert daily revenue fact |
| P-11 Public | All subscribed events | Upsert guest row |

### Idempotency

Same as integration consumers: `(consumerName, eventId)` in `order_domain_consumer_processed`. Projection consumer names are distinct (e.g. `OwnerOrdersProjectionConsumer`).

### Failure Handling

| Failure | Effect on read |
|---------|----------------|
| Projection consumer fails | Integration consumers may still succeed; projection lags; relay retries |
| Outbox relay failed | No projection update until retry |
| Duplicate event | Skipped via idempotency — no double count in KPIs |

---

## Command-Triggered Refresh (Secondary)

| Command | Client action | Server action |
|---------|---------------|---------------|
| `order.updateStatus` | Invalidate `order.read.listActive`, `order.read.getOperationalKpis` | Optional: return `OrderStatusChangeReadDto` in mutation response |
| `order.create` (guest) | N/A owner UI | Owner: invalidate notifications + active list on next poll |
| Session settlement | Invalidate ops settlement queries | Session projection update via session command path |

**Read-your-writes:** Mutation response may include minimal status DTO so UI updates before projection consumer completes (Blueprint §13 sequence note).

---

## Transitional Polling (Approved Interim)

Until subscription infrastructure exists, polling targets **projection queries only** — never legacy `order.list`.

| Surface | Query | Interval | Terminal condition |
|---------|-------|----------|-------------------|
| Owner active orders | Q-01 `order.read.listActive` | 10s | Tab inactive |
| Dashboard ops | Q-10 `ops.getRestaurantOverview` | 10s | Tab inactive |
| Guest tracking | Q-08 `order.getPublicStatus` | 8s | status ∈ {served, cancelled} |
| Notifications | `notification.getUnread` | 10s | Unchanged — separate context |
| Home snapshot | Q-05 + Q-10 | 120s staleTime or on visit | Reduce load (existing H-03 intent) |
| Settlement reports | Q-13–15 | 10s on reports tab | Acceptable — bounded payload |

**Migration requirement:** Replace `order.list` polls with Q-01/Q-05 before deprecating legacy endpoint.

**Classification:** Polling is **transitional** — documented in ORDERS-READ-MODEL-1 RM-08 as workaround, not target architecture.

---

## Future: Push / Subscribe (Out of READ-ARCHITECTURE-1 scope)

Target state for kitchen and high-churn ops surfaces:
- Server-sent events or WebSocket channel per `restaurantId`
- Invalidates React Query cache keys for Q-01, Q-20
- **Not designed here** — noted as KITCHEN-DISPLAY-1 enhancement

---

## Cache Strategy

| Layer | Policy |
|-------|--------|
| **Server** | No application-level cache in v1; `generatedAt` on every DTO; projection store is the cache |
| **Client (React Query)** | Key = procedure + input; `staleTime` per surface; invalidation on mutation |
| **CDN** | Not used for authenticated owner queries |
| **Invalidation triggers** | Mutation success, manual retry, poll interval |

### Recommended staleTime (client — implementation guidance)

| Query | staleTime | refetchInterval |
|-------|-----------|-----------------|
| Q-01 listActive | 0 | 10s when tab active |
| Q-05 KPIs | 30s | 10s on home when visible |
| Q-08 public status | 0 | 8s until terminal |
| Q-06 analytics | 60s | 10s on reports tab |

---

## Eventual Consistency Expectations

| Scenario | Expected lag | User-visible behavior |
|----------|--------------|----------------------|
| Owner advances status | 0–500ms in-process | Mutation refetch shows update; projection may lag 1 relay cycle |
| Guest places order | 0–10s | Alert poll picks up notification |
| KPI counters | 1 relay cycle | Home KPIs may lag single poll behind list |
| Analytics facts | 1 relay cycle | Reports acceptable lag |
| Kitchen ticket | 1 relay cycle | KDS poll 3–5s recommended |

**SLA (architecture target):** 99% of projection updates visible within **2 seconds** of successful command in single-node in-process deployment.

---

## Refresh Triggers Summary

| Trigger | Applies to |
|---------|------------|
| Domain event | All P-01–P-11 projection consumers |
| Session event | P-05 session slice, P-09, P-12 |
| Command success cache invalidation | Owner order queries |
| Poll interval | Transitional UI surfaces |
| Manual refetch | Error retry buttons |
| Backfill job (migration) | One-time legacy → projection (RA-08) |

---

## References

- ADR-ARCH-014
- ORDERS-READ-MODEL-1 RM-08 Polling & Refresh Audit
- `queryRuntime.ts` existing intervals (to be retargeted)
