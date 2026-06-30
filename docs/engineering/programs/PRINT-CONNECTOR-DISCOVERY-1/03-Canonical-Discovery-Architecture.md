# PRINT-CONNECTOR-DISCOVERY-1 — Canonical Discovery Architecture

---

## Production authority

| Layer | Responsibility |
|-------|----------------|
| Print Workspace | Operator discovery read API |
| Connector Gateway | Route discovery commands; never discover |
| Connector Session | Transport `discover_printers` / `get_printer_status` |
| Restaurant Local Connector | Execute native discovery via `RuntimeConnectorCommandHandler` |
| Platform Adapter | OS-native printer enumeration |

---

## Key components

- `PrintWorkspaceDiscoveryReadService` — workspace read projection
- `ConnectorGatewayService.routeDiscoverPrinters` — routing entry
- `ConnectorGatewayService.routeGetPrinterStatus` — status/capabilities routing
- `SessionConnectorExecutionPort` — session transport
- `GatewayRoutedPrintConnectorApi` — printer management discovery adapter
