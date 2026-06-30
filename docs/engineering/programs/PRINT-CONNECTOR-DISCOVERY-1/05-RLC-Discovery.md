# PRINT-CONNECTOR-DISCOVERY-1 — RLC Discovery

---

## Command handling

`RuntimeConnectorCommandHandler` handles `discover_printers`:

- Default payload → native discovery via `LocalConnectorRuntimeFacade`
- Select payload → printer selection on RLC runtime (provisioning support)

Discovery execution never leaves the restaurant host. The cloud API host does not call `PlatformAdapter` directly in production.

---

## Native discovery

Windows: `WindowsPlatformAdapter.discoverPrinters()` via PowerShell `Get-Printer` when not in simulation mode.

Future platforms (macOS, Linux, Android) follow the same RLC command contract.
