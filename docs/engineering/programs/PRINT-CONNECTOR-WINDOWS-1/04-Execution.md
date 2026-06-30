# PRINT-CONNECTOR-WINDOWS-1 — Execution

---

## Operations

| Operation | RLC API | Gateway command |
|-----------|---------|-----------------|
| Discover | `discoverPrinters()` | `discover_printers` |
| Select | `selectPrinter()` | `discover_printers` payload `{ action: "select" }` |
| Status | `getPrinterStatus()` | `get_printer_status` |
| Capabilities | `getPrinterCapabilities()` | included in status response |
| Print | `print()` | `execute_print` |
| Reprint | `reprint()` (same path) | `execute_print` |
| Test print | `testPrint()` (operator trigger) | local / future gateway |

---

## Native Print Pipeline

`WindowsPlatformAdapter.deliverTextToOsPrinter()`:

1. Serialize payload to text
2. Write temp file
3. `Get-Content | Out-Printer -Name '<printer>'`

No `lp`, CUPS, or Linux tools.

---

## Business Isolation

`PrintingService` and `PrintConnectorPort` unchanged. Windows execution is invisible to business layers.
