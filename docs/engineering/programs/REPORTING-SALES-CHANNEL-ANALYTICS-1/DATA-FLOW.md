# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Data Flow Diagram

```mermaid
flowchart TD
  subgraph write [Order write path]
    QR[order.create stamps qr]
    W[order.placeAsWaiter stamps waiter_tablet]
    K[order.placeWithIdentity stamps client channel]
    QR --> O[(orders.ordering_channel)]
    W --> O
    K --> O
  end

  subgraph read [Order Read]
    O --> P[Order Read projection]
    P --> OR[(order_read_orders)]
  end

  subgraph reporting [Reporting Platform]
    OR --> A[listServedOrdersForChannelReporting]
    A --> S[SalesChannelAnalyticsService]
    S --> DTO[SalesChannelAnalyticsDto]
    DTO --> API[reporting.getSalesChannelAnalytics]
  end

  subgraph presentation [Presentation - passive]
    API --> VM[salesSourceAnalysisPresentation]
    VM --> UI[SalesSourceAnalysisSection cards]
  end
```

## Boundary notes

- Check Revenue / Payment Analytics remain on Settlement Record paths (unchanged).
- Channel analytics never writes financial law or settlement snapshots.
