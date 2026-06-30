# PRINT-UX-2A — Legacy Audit

**Date:** 2026-06-30

---

## Removed or Migrated

| Legacy item | Action |
|-------------|--------|
| Infrastructure-first connector card (IDs, heartbeat, platform) | Replaced with operator `LocalConnectorCard` |
| Technical printer grid (driver, platform, capabilities) | Replaced with operational state + guidance |
| Generic "No printers found" provisioning | State-driven `PrinterSelectionDialog` |
| `disabledPrintWorkspaceActionPort` stub | Removed from `actionContracts.ts` |
| `useDistributedPrintingInfrastructure` | Replaced by `useOperationalPrintStatus` |
| Simulated printer in operator view | Filtered via `isSimulatedPrinterId` |
| "Restaurant Local Connector" operator copy | Renamed to "MineuQR Connector" |
| Distributed printing subtitle | Replaced with operational copy |

---

## Retained (Justified)

| Item | Justification |
|------|---------------|
| `printConnector.discoverPrinters` in provisioning | Server routes discovery; UI gates on connector online first |
| `printerManagement.commands.provisionPrinter` | Catalog SSOT unchanged per ADR |
| Order view models (`toPrintWorkspaceOrderCard`) | Order read model — not printing architecture |

---

## No Dual UX

Single workflow: System Ready → Connector → Printer → Printing → Session (compact) → Diagnostics (optional).
