# PRINT-CONNECTOR-DISCOVERY-1 — Final Executive Summary

**Date:** 2026-06-30  
**Program:** Canonical Remote Discovery  
**Authority:** ADR-ARCH-016 v1.2

---

## Legacy discovery components removed

- Embedded `printConnector.discoverPrinters` production API
- Embedded `selectPrinter`, `getSelectedPrinter`, `print`, `cancel` via `printConnectorRouter`
- Direct `printConnectorRuntime` in printer management composition
- `GatewayRoutedPrintConnectorApi` embedded runtime dependency

---

## Canonical connector operations (all via gateway → session → RLC)

| Operation | Cloud path | RLC command |
|-----------|------------|-------------|
| discoverPrinters | `routeDiscoverPrinters` | `discover_printers` |
| getStatus / getPrinterCapabilities | `routeGetPrinterStatus` | `get_printer_status` |
| selectPrinter | `routeSelectPrinter` + cloud `PrinterSelectionRepository` | `discover_printers` (action=select) |
| getSelectedPrinter | Cloud `PrinterSelectionRepository` only | — |
| print / testPrint | `routeExecutePrint` | `execute_print` |
| cancel | `routeCancelPrint` | `cancel_print` |

---

## New canonical discovery flow

```
Browser → printWorkspace.read.discoverPrinters
       → ConnectorGateway.routeDiscoverPrinters
       → ConnectorSession (discover_printers)
       → RLC → PlatformAdapter → native OS discovery
```

Status and capabilities follow the same path via `routeGetPrinterStatus`.

---

## Architecture compliance

- Restaurant Local Connector is the only production discovery authority
- Connector Gateway performs routing only
- Connector Session performs transport only
- Platform Adapters perform native discovery only
- ADR-ARCH-016 fully satisfied for discovery

---

## Retired production paths

- Browser → Cloud API → `printConnector.discoverPrinters()` → embedded runtime on API host

---

## Remaining roadmap

| Item | Program |
|------|---------|
| Route operator test print through gateway | Future print execution program |
| Retire remaining `printConnectorRouter` admin endpoints | Future connector API consolidation |
| End-to-end production certification | PRINT-PRODUCTION-VALIDATION-2 |

---

PRINT-CONNECTOR-DISCOVERY-1 COMPLETE
