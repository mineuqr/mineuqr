# PRINT-UX-1 — Workspace Flow

**Date:** 2026-06-30

---

## Normal Operator Flow

```
Open Print Workspace
    ↓
Verify Current Printer (CurrentPrinterCard)
    ↓
Select order from list
    ↓
Print (printWorkspace.commands.printOrder)
    ↓
Reprint if needed (printWorkspace.commands.reprintOrder)
```

Operator should **not** need Printer Management during normal work.

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ Print Workspace (title + subtitle)                      │
├─────────────────────────────────────────────────────────┤
│ Current Printer Card                                    │
│   name · transport · platform · status · default        │
│   [Change] [Test print] [Management]                    │
├──────────────────────┬──────────────────────────────────┤
│ Order list           │ Order detail                     │
│ (awaiting/completed/ │ line items, totals               │
│  all + search)       │ [Print] [Reprint]                │
└──────────────────────┴──────────────────────────────────┘
```

---

## Print Gating

- Print / Reprint buttons respect `printerReady` (`getCurrentPrinter.configured`)
- Test print result surfaced as inline message on card section

---

## Management Escape Hatch

**Management** button navigates to `printer-management` section via `onOpenPrinterManagement` callback from `Dashboard.tsx`. Used for first-time setup or admin tasks, not daily printing.

---

## Change Printer Flow (Operational)

1. **Change printer** on card
2. `PrinterSelectionDialog` opens
3. Select discovered printer → provision as default
4. Card refreshes via `useCurrentPrinter` invalidation

---

## Removed from Operational Workspace (PRINT-UX-1)

- Inline printer discovery list
- Ticket preview panel
- Cancel print action in workspace UI
- Direct connector selection without provision step
