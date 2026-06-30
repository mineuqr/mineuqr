# PRINT-WORKSPACE-1 — Workspace Architecture

**Date:** 2026-06-29

---

## Purpose

Operational Print Workspace — presentation and operator coordination only. Not a printing engine, printer manager, or connector.

---

## Layering

```
client/components/print-workspace/PrintWorkspacePanel.tsx   UI
client/lib/print-workspace/                                 View models, UI state, action contracts
server/print-workspace/printWorkspaceRouter.ts              tRPC read API
server/print-workspace/read/services/                       Read services
server/print-workspace/read/infrastructure/                 Drizzle → order_read_* only
```

---

## Routes & Navigation

| Entry | Path |
|-------|------|
| Dashboard tab | `?restaurant={id}&section=print` |
| Sidebar | Workspace → **Print Workspace** |

Integrated into existing `RestaurantOperationsShell` — no separate app shell.

---

## Views

| View | Filter | Data source |
|------|--------|-------------|
| Awaiting print | `view=awaiting` (`isActive`) | `order_read_orders` |
| Recently completed | `view=completed` (`served`) | `order_read_orders` |
| All orders | `view=all` | `order_read_orders` |
| Order detail | selected order | `order_read_orders` + `order_read_order_line_items` + `order_read_order_timeline` |

---

## Explicit Non-Goals (Honored)

No Print Host, Agent, ESC/POS, print jobs, rendering, connector, or OS printing.
