# PRINT-UX-1 — Operational Workspace

**Date:** 2026-06-30

---

## Purpose

The Print Workspace is the **operational** surface for daily restaurant printing. Operators verify the current printer, print orders, and reprint — without provisioning, diagnostics, or connector configuration.

---

## Scope (Exposed)

| Capability | Surface |
|------------|---------|
| Current printer | `CurrentPrinterCard` |
| Printer status | Inline on card (ready / not ready) |
| Change printer | `PrinterSelectionDialog` |
| Test print | Card action → `printWorkspace.commands.testPrint` |
| Print | Order detail → `printWorkspace.commands.printOrder` |
| Reprint | Order detail → `printWorkspace.commands.reprintOrder` |
| Open management | Link to Printer Management tab (admin escape hatch) |

---

## Explicit Non-Goals (Honored)

- No printer discovery list embedded in workspace
- No diagnostics panel
- No rename / remove / set-default in workspace
- No connector or platform code in UI
- No changes to Printing Service lifecycle or Print Connector runtime

---

## Components

```
client/src/components/print-workspace/
  PrintWorkspacePanel.tsx      — operational shell (orders + print actions)
  CurrentPrinterCard.tsx       — current printer summary + actions
  PrinterSelectionDialog.tsx   — picker for change/add printer

client/src/lib/print-workspace/
  useCurrentPrinter.ts         — read hook for getCurrentPrinter
  usePrintWorkspaceActions.ts  — print / reprint command port
  usePrintWorkspaceState.ts    — list filters and selection
  viewModels.ts                — order card mapping
```

---

## API Contracts (Operational)

| Procedure | Layer |
|-----------|-------|
| `printWorkspace.read.listOrders` | Read model (order_read_*) |
| `printWorkspace.read.getOrderDetail` | Read model |
| `printWorkspace.read.getCurrentPrinter` | Printer Management (read facade) |
| `printWorkspace.commands.printOrder` | Printing Service (unchanged) |
| `printWorkspace.commands.reprintOrder` | Printing Service (unchanged) |
| `printWorkspace.commands.testPrint` | Printer Management (connector direct) |

---

## Navigation

| Entry | Path |
|-------|------|
| Dashboard tab | `?restaurant={id}&section=print` |
| Sidebar | Workspace → **Print Workspace** |

---

## Design Philosophy

Simple, fast, minimal, professional — inspired by operational printing software. One glance confirms printer readiness; one click prints.
