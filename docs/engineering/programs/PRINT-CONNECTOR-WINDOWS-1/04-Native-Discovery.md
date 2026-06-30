# PRINT-CONNECTOR-WINDOWS-1 — Native Discovery

**Date:** 2026-06-30

---

## Flow

```
discoverPrinters()
  → powershell.exe Get-Printer
  → parseDiscoverStdout()
  → PrinterInfo[]
```

---

## APIs Used

| API | Purpose |
|-----|---------|
| `Get-Printer` | List installed printers |
| `Get-CimInstance Win32_Printer` | Resolve default printer |

---

## Production Rules

| Rule | Enforcement |
|------|-------------|
| No simulated printers in production | `catch` returns `[]`, not `SimulatedPlatformAdapter` |
| Simulation only in test/explicit mode | `shouldUseSimulatedConnector()` |
| Native APIs only on Windows | PowerShell print spooler |

---

## Live Validation (2026-06-30)

On native Windows host (`win32`):

| Result | Value |
|--------|-------|
| Printers discovered | 3 (real OS printers) |
| Simulated printers | 0 |
| Default printer | `POS-80C (copy 1)` |
| Sample IDs | `win-POS-80C (copy 1)`, `win-Microsoft Print to PDF` |

Run: `npx tsx docs/engineering/programs/PRINT-CONNECTOR-WINDOWS-1/_validate-windows-native.ts`

---

## Not Used on Windows

- `lp` / `lpstat`
- CUPS
- USB GATT / `navigator.usb` in server code
