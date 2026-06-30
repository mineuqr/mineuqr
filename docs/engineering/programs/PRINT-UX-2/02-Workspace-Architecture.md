# PRINT-UX-2 — Workspace Architecture

**Authority:** ADR-ARCH-016 v1.2

---

## Layout

```
PrintWorkspacePanel
├── Section 1: LocalConnectorCard
├── Section 2: ConnectorSessionCard
├── Section 3: CurrentPrinterCard
├── Section 4: WorkspaceDiagnosticsSection
└── Orders (operational workflow — unchanged)
```

---

## Presentation Layer

```
Client (print-workspace/)
  useDistributedPrintingInfrastructure
  useCurrentPrinter
        ↓ tRPC
printWorkspaceRouter.read
  PrintWorkspacePresenceReadService  → ConnectorDirectory (read-only)
  PrinterManagementService.getCurrentPrinter (unchanged)
```

---

## Print Gating

Print and reprint require:

1. Connector **connected** (RLC online)
2. Printer **configured**
3. Printer **ready**

---

## Visual Principles

- Infrastructure dashboard aesthetic
- Consistent health badges: Healthy, Connected, Warning, Degraded, Offline, Disconnected
- No developer console on main screen
