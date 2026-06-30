# PRINT-WORKSPACE-1 — Operational Flows

**Date:** 2026-06-29

---

## Operator Flow

```
Open Dashboard → select restaurant → Print Workspace tab
    → listOrders (read projection, polled 10s)
    → filter by view / search / status
    → select order → getOrderDetail
    → review items, notes, timeline
    → (future) Print / Reprint / Preview — disabled
```

---

## Data Flow

```
PrintWorkspacePanel
  → trpc.printWorkspace.read.*
    → PrintWorkspaceReadService
      → DrizzlePrintWorkspaceReadStore
        → order_read_* tables
```

No path to Order aggregate or write tables.

---

## Polling

`printWorkspaceListQueryOptions` — 10s interval aligned with dashboard ops queries.
