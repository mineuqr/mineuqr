# PRINT-CONNECTOR-WINDOWS-1 — Production Validation

---

## Environment

| Requirement | Value |
|-------------|-------|
| OS | Windows (`win32`) |
| Flag | `RLC_VALIDATE_WINDOWS=1` |
| RLC mode | `RLC_RUNTIME=1` |

---

## Automated Validation

```bash
RLC_VALIDATE_WINDOWS=1 npx vitest run server/connector-local/__tests__/windowsProductionValidation.test.ts
```

**Result (dev machine):** Real Windows printers discovered; **0 simulated printer IDs**.

---

## Manual Checklist (Restaurant)

| Step | Verified |
|------|----------|
| Printer discovery (Get-Printer) | Automated ✓ |
| Printer selection | Via `discover_printers` select action |
| Test print | `LocalConnectorRuntimeFacade.testPrint()` |
| Order print | Gateway `execute_print` → RLC |
| Reprint | Same `execute_print` path |
| Offline printer | Returns `printer_offline` |
| Paper out | Mapped when OS reports (future enhancement) |
| No simulated printers | Automated ✓ |

---

## Thermal Printer Note

Full thermal/ESC/POS certification deferred to dedicated hardware validation program. Native spooler delivery validated on Windows host.
