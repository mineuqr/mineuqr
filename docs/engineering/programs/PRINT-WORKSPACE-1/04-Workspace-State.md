# PRINT-WORKSPACE-1 — Workspace State

**Date:** 2026-06-29

---

## UI State Hook

`usePrintWorkspaceState()` — `client/src/lib/print-workspace/usePrintWorkspaceState.ts`

| State | Purpose |
|-------|---------|
| `view` | awaiting / completed / all |
| `search` | Order # or customer filter |
| `statusFilter` | Optional status narrow |
| `selectedOrderId` | Detail panel selection |

---

## Separation

| Layer | Owns |
|-------|------|
| UI state hook | Filters, selection, navigation |
| tRPC queries | Read data from server |
| Action contracts | Future operator commands (disabled) |

No mixing of printing/rendering/connector logic into state.
