# PRINT-CONNECTOR-DISCOVERY-1 — Retired Components

---

## Removed from production

| Component | Action |
|-----------|--------|
| `printConnector.discoverPrinters` tRPC procedure | Removed |
| Direct `printConnectorRuntime` in `PrinterManagementService` composition | Replaced with gateway adapter |
| `GatewayRoutedPrintConnectorApi` embedded runtime delegation | All ops now gateway-routed |
| `printConnectorRouter` production procedures | Router retired (`router({})`) |

---

## Not removed (intentional)

| Component | Reason |
|-----------|--------|
| `PrintConnectorRuntime.discoverPrinters` | RLC runtime API — invoked only on restaurant host via session |
| `printConnectorRouter` other procedures | Selection persistence and legacy admin paths — separate retirement |
| `SimulatedPlatformAdapter` | Test/simulation mode only; blocked from production UI |
