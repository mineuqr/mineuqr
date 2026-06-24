# THERMAL-PRINTING-13I.2E.2 — Printer Binding UX

**Status:** Implemented  
**Prior phase:** 13I.2E.1 Binding Foundation  
**Architecture:** PRINTING-ARCHITECTURE-NOTE-6

---

## UX Decision

**Selected: Option A — Interactive CLI**

| Option | Verdict |
|--------|---------|
| Interactive CLI | **Selected** — ships in agent artifact, reuses discovery code, no firewall/port issues |
| Local browser UI | Rejected — extra HTTP server, support complexity |
| PowerShell wizard | Rejected — duplicates discovery logic outside agent bundle |

**Operator entry points:**

```powershell
cd scripts
.\bind-printers.cmd
```

Or from agent folder:

```powershell
.\bind-printers.cmd --config ..\config\mineuqr-agent-config.json
.\bind-printers.cmd --config ..\config\mineuqr-agent-config.json --status
```

---

## Discovery Architecture

**Method:** PowerShell `Get-Printer` via `PowerShellWindowsPrinterDiscoveryClient`

```powershell
Get-Printer | Select-Object Name, PortName | ConvertTo-Json
```

**Output type:** `PrinterDiscoveryResult[]`

```json
[
  { "printerName": "EPSON TM-T20III", "portName": "USB001" },
  { "printerName": "XP-80C", "portName": "USB002" }
]
```

No hardcoded printer names or ports. Discovery runs at bind time and at agent startup (diagnostics).

---

## Binding Storage Design

**File:** `config/printer-bindings.json` (alongside `mineuqr-agent-config.json`)

```json
{
  "version": "13I.2E.2",
  "updatedAt": "2026-06-24T12:00:00.000Z",
  "bindings": [
    {
      "profileId": "r720002-printer-abcd",
      "logicalPrinterName": "Kitchen Printer",
      "windowsPrinterName": "EPSON TM-T20III",
      "portName": "USB001",
      "bindingStatus": "bound"
    }
  ]
}
```

**Persistence guarantees:**

- Survives reboot (file on disk)
- Survives agent restart
- Survives service mode (same config directory)
- Survives agent upgrades (bindings file independent of `agent.mjs`)

**Runtime merge:** `loadDeploymentConfig()` loads dashboard config, then merges `printer-bindings.json` into `usbTransportEndpoints` and bound `physicalBindings`.

---

## Binding Workflow

```
Download mineuqr-agent-config.json
↓
Run bind-printers.cmd
↓
For each logical printer:
  numbered list of Windows printers
↓
Operator selects (no typing)
↓
printer-bindings.json saved
↓
Start / restart agent
↓
Dashboard Test Print
```

---

## Startup Validation

**Statuses:** `BOUND` | `UNBOUND` | `MISSING_PRINTER` | `INVALID_BINDING`

Evaluated at agent startup and via `bind-printers --status`.

**Diagnostics file:** `config/binding-diagnostics.json`

**Example log:**

```text
[PrintAgent] Kitchen Printer → EPSON TM-T20III → USB001 [BOUND]
```

Agent still starts when bindings are `UNBOUND` (profiles report to Print Host). Physical print requires `BOUND`.

---

## Test Print Integration

1. Complete `bind-printers.cmd`
2. Restart agent or Windows service
3. Dashboard → **Refresh Connection Status**
4. Dashboard → **Test Print**

Test print uses merged `usbTransportEndpoints` from `printer-bindings.json`.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| No printers listed | Install Windows thermal printer driver first |
| `UNBOUND` | Run `bind-printers.cmd` |
| `MISSING_PRINTER` | Reconnect USB printer, verify Devices and Printers |
| `INVALID_BINDING` | Re-run bind-printers and reselect queue |
| Test print still fails | Check `config/binding-diagnostics.json` and agent logs |

---

## Operator Flow Summary

```text
Agent Online (logical profiles)
↓
Windows Printers Discovered (bind-printers)
↓
Binding Created (printer-bindings.json)
↓
Test Print (dashboard)
↓
Ready For Production
```

---

## Related

- [THERMAL-PRINTING-13I.2E.1-BINDING-FOUNDATION.md](./THERMAL-PRINTING-13I.2E.1-BINDING-FOUNDATION.md)
- [THERMAL-PRINTING-13I.2C-2-DISTRIBUTION-PACKAGE.md](./THERMAL-PRINTING-13I.2C-2-DISTRIBUTION-PACKAGE.md)
