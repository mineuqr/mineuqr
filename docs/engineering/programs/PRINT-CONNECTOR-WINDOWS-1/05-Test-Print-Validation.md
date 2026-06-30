# PRINT-CONNECTOR-WINDOWS-1 — Test Print Validation

**Date:** 2026-06-30

---

## Path

```
Print Workspace / Printer Management
  → printWorkspace.commands.testPrint
  → PrinterManagementService.testPrint()
  → PrintConnectorApi.print() (printJobId: 0)
  → PrintConnectorRuntime
  → TransportAdapter
  → WindowsPlatformAdapter.deliverPrint()
  → Out-Printer
```

Test print **bypasses** Printing Service by design (PRINT-UX-1).

---

## Production Guards

| Guard | Behavior |
|-------|----------|
| Simulated printer ID | `unsupported_capability` failure |
| Invalid `win-` ID | `printer_offline` failure |
| OS errors | Canonical `PrintExecutionResult`, no raw `spawn lp` in message |

---

## Automated Tests

| Test | Coverage |
|------|----------|
| `WindowsPlatformAdapter.test.ts` | JSON parsing, simulated ID rejection |
| `windowsSimulation.guards.test.ts` | No `lp`, no simulated catch fallback |
| `resolveHostPlatform.test.ts` | win32 → Windows adapter, override ignored |

---

## Physical Validation

Requires operator on Windows host with:

1. Native Node (`process.platform === "win32"`)
2. Installed printer visible in Windows Settings
3. Provision printer via Printer Management
4. Run Test Print from Print Workspace

**Status:** Pending operator hardware run (see 06-Production-Validation.md).
