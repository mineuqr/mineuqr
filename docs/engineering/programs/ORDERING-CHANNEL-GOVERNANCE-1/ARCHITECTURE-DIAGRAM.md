# ORDERING-CHANNEL-GOVERNANCE-1 — Architecture Diagram

```mermaid
flowchart TB
  subgraph registry [Ordering Channel Registry]
    R[ORDERING_CHANNEL_REGISTRY]
  end

  subgraph place [Order creation]
    QR[order.create → qr]
    W[placeAsWaiter / device → waiter_tablet]
    K[placeWithIdentity → client channel]
    T[PlaceOrder stamp table_session]
    QR --> P[PlaceOrderService.assertOrderingChannelId]
    W --> P
    K --> P
    T --> P
  end

  R --> P
  P --> O[(orders.ordering_channel)]
  O --> OR[(order_read_orders.ordering_channel)]
  OR --> S[SalesChannelAnalyticsService]
  R --> S
  S --> DTO[SalesChannelAnalyticsDto]
```

## Boundary

Business Identity `identityScope` (TABLE / WAITER / KIOSK) remains **display-sequence partitioning only** — not channel provenance.
