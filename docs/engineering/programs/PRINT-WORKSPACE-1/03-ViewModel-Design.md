# PRINT-WORKSPACE-1 — ViewModel Design

**Date:** 2026-06-29

---

## Server DTOs

`printWorkspaceQueryContracts.ts` — `PrintWorkspaceOrderDto`, list/detail results, pagination.

---

## Client View Models

`client/src/lib/print-workspace/viewModels.ts`

| Function | Output |
|----------|--------|
| `toPrintWorkspaceOrderCard` | Card model for list UI |
| `formatStatusLabel` | Localized status text |

Card fields: `orderNumber`, `statusLabel`, `tableLabel`, `customerLabel`, `itemCount`, `isAwaitingPrint`, `notesPreview`.

---

## Separation

View models transform read DTOs only — no printing logic, no write-model fields.
