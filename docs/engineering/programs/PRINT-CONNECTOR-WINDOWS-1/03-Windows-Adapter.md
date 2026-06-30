# PRINT-CONNECTOR-WINDOWS-1 — Windows Adapter

**Date:** 2026-06-30

---

## Implementation Status

**Implemented and hardened** — `server/print-connector/platform/windows/`

| File | Role |
|------|------|
| `WindowsPlatformAdapter.ts` | Platform adapter class |
| `windowsPrinterDiscovery.ts` | PowerShell discovery script + JSON parsing |
| `windowsPrinterId.ts` | `win-{Name}` ID encoding/decoding |

---

## Discovery

- **Command:** `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass`
- **Script:** Multi-line `Get-Printer` + `Win32_Printer` default flag (`windowsPrinterDiscovery.ts`)
- **Important:** Script lines are **newline-separated** — semicolon-joined scripts break PowerShell `ForEach-Object` blocks
- **Output:** JSON → `PrinterInfo[]` with ids `win-{printerName}`
- **Failure:** empty list + console warning (no simulation)

---

## Print Delivery

1. Reject simulated printer IDs (`*-sim-*`).
2. Decode `win-{name}` → Windows printer name.
3. Write payload text to temp file (avoids PowerShell escaping issues).
4. `Get-Content -Raw | Out-Printer -Name '{printer}'`
5. Delete temp file.

---

## Printer Status Mapping

| `PrinterStatus` | Online |
|-----------------|--------|
| 7 (Offline) | false |
| 6 (Stopped printing) | false |
| Other | true |

---

## No Linux Commands

Windows adapter does **not** reference `lp`, `lpstat`, or CUPS.
