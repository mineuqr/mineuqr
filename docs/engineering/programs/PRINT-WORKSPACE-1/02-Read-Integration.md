# PRINT-WORKSPACE-1 — Read Integration

**Date:** 2026-06-29

---

## Data Source Policy

**All workspace data from `order_read_*` only.** No `orders`, `order_items`, or aggregate repositories.

---

## tRPC API

| Procedure | Projection tables |
|-----------|-------------------|
| `printWorkspace.read.listOrders` | `order_read_orders`, `order_read_order_line_items` |
| `printWorkspace.read.getOrderDetail` | above + `order_read_order_timeline` |

Auth: `verifiedProcedure` + `assertRestaurantAccess`.

---

## Read Store

`DrizzlePrintWorkspaceReadStore` — Drizzle queries exclusively against projection schema (`drizzle/schema.ts` order_read_* tables).

---

## Relation to Q-30

RA-03 `printing.read.getQueue` targets future P-08 print **job** queue (PRINTING-1). This workspace uses **order read projections** for operational printable-order views until P-08 exists — constitution-compliant read-model consumption.
