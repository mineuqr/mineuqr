# PRINT-CONNECTOR-WINDOWS-1 — Discovery

---

## Native Interfaces

Windows printer discovery uses **PowerShell** with:

- `Get-Printer`
- `Get-CimInstance Win32_Printer` (default printer)

Script: `server/print-connector/platform/windows/windowsPrinterDiscovery.ts`

---

## Printer Record Fields

| Field | Source |
|-------|--------|
| `id` | Encoded Windows printer name (`win:...`) |
| `name` | Spooler display name |
| `isDefault` | Win32 default printer match |
| `isOnline` | `PrinterStatus` (offline/error excluded) |
| `transport` | Inferred from driver name |
| `platform` | `windows` |

---

## RLC Access

`LocalConnectorRuntimeFacade.discoverPrinters()` → `PrintConnectorRuntime` → `WindowsPlatformAdapter.discoverPrinters()`

Gateway command: `discover_printers`

---

## Production Validation

On Windows with `RLC_VALIDATE_WINDOWS=1`, Vitest confirms real printers discovered with **zero simulated IDs**.
