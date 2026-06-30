# PRINT-CONNECTOR-DISCOVERY-1 — Routing

---

## Discover printers

```
printWorkspace.read.discoverPrinters
  → PrintWorkspaceDiscoveryReadService
  → ConnectorGatewayService.routeDiscoverPrinters
  → SessionConnectorExecutionPort.executeDiscoverPrinters
  → ConnectorCommandRouter.routeDiscoverPrinters
  → discover_printers command envelope
  → RLC RuntimeConnectorCommandHandler
  → LocalConnectorRuntimeFacade.discoverPrinters
  → PlatformAdapter.discoverPrinters()
```

## Printer status / capabilities

```
PrinterManagementService.getCurrentPrinter / getDiagnostics
  → GatewayRoutedPrintConnectorApi.getStatus / getPrinterCapabilities
  → ConnectorGatewayService.routeGetPrinterStatus
  → get_printer_status command envelope
  → RLC native status read
```

---

## Offline behavior

When connector is unregistered or offline, gateway returns `routed: false` with `failureReason`. Workspace DTO sets `unavailable: true` and empty printer list. UI gates discovery on connector health before calling API.
