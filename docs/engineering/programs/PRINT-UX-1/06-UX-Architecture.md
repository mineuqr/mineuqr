# PRINT-UX-1 — UX Architecture

**Date:** 2026-06-30

---

## Operational Workspace Pattern

MineuQR adopts **Operational Workspace** vs **Management Workspace** separation:

| Workspace | Audience | Complexity |
|-----------|----------|------------|
| Print Workspace | Daily operators | Minimal |
| Printer Management | Administrators | Full lifecycle |

---

## Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT UI                              │
├─────────────────────────┬────────────────────────────────────┤
│  PrintWorkspacePanel    │  PrinterManagementPanel            │
│  (operational)          │  (administrative)                  │
└───────────┬─────────────┴──────────────┬─────────────────────┘
            │ tRPC                        │ tRPC
            ▼                             ▼
┌───────────────────────┐     ┌───────────────────────────────┐
│ printWorkspaceRouter  │     │ printerManagementRouter       │
│  read: orders         │     │  CRUD + diagnostics + test    │
│  commands: print/     │     └───────────────┬───────────────┘
│    reprint (Printing) │                     │
│  read: currentPrinter │◄────────────────────┘
│  commands: testPrint  │     PrinterManagementService
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐     ┌───────────────────────────────┐
│ Printing Service      │     │ PrintConnectorApi (runtime) │
│ (UNCHANGED)           │     │ (UNCHANGED)                   │
└───────────────────────┘     └───────────────────────────────┘
```

---

## Constraints (Honored)

| Rule | Status |
|------|--------|
| No connector logic in UI | ✓ |
| No business logic in UI | ✓ View models + hooks only |
| No OS-specific code in UI | ✓ Guard tests |
| Workspace depends on contracts | ✓ tRPC only |
| Printing Service unchanged | ✓ |
| PrintConnectorPort / runtime unchanged | ✓ |
| Deployment runtime unchanged | ✓ |

---

## New Module Boundary

`server/printer-management/` is a **UX orchestration** layer:

- Owns restaurant printer catalog (`restaurant_printers`)
- Delegates device I/O to `PrintConnectorApi`
- Does not participate in print job lifecycle (except test print with `printJobId: 0`)

---

## Shared Components

`PrinterSelectionDialog` is shared between workspaces but remains a presentation component — all I/O via tRPC contracts.

---

## Future UX Extensions (Prepared)

- Multiple printers per restaurant (data model ready)
- Department printer assignment UI (management list pattern)
- Workspace printer switcher (picker reuse, no redesign)
