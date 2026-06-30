# PRINT-CONNECTOR-DISCOVERY-1 — Legacy Discovery Audit

---

## Retired production paths

| Legacy path | Status |
|-------------|--------|
| `printConnector.discoverPrinters` tRPC endpoint | Removed from router |
| `PrinterSelectionDialog` → embedded API | Migrated to `printWorkspace.read.discoverPrinters` |
| `PrinterManagementService` → `printConnectorRuntime.discoverPrinters` | Replaced by `GatewayRoutedPrintConnectorApi` |

---

## Remaining embedded runtime usage (non-discovery, documented)

| Usage | Justification |
|-------|---------------|
| `GatewayRoutedPrintConnectorApi` delegates `selectPrinter`, `getSelectedPrinter`, `print`, `cancel` to embedded runtime | Cloud-side selection persistence and operator test print — not native discovery |
| `PrintConnectorRuntime.discoverPrinters` on RLC host | Canonical native discovery authority when invoked via session command |

---

## Simulated discovery

Simulated printers remain gated to test/simulation mode only (`shouldUseSimulatedConnector`). Production UI filters simulated IDs via `filterProductionPrinters`.
