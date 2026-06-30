# PRINT-CONNECTOR-WINDOWS-1 — Production Validation

**Date:** 2026-06-30

---

## Validation Matrix

| Scenario | Automated | Physical |
|----------|-----------|----------|
| Platform detection win32 → Windows | ✅ | — |
| No `lp` on Windows code path | ✅ | — |
| No simulated fallback in production discovery | ✅ | — |
| Installed Windows printers discovered | — | ⏳ Operator |
| Test print to real printer | — | ⏳ Operator |
| Order → Printing Service → Windows print | — | ⏳ Operator |
| Reprint same path | — | ⏳ Operator |

---

## Pre-Flight Checklist (Windows Operator)

1. Confirm `node -e "console.log(process.platform)"` → `win32`
2. Remove `PRINT_CONNECTOR_MODE=simulated`
3. Ensure `NODE_ENV` is `production` or `development` (not `test`)
4. Remove or unset conflicting `PRINT_CONNECTOR_PLATFORM=linux`
5. Open Printer Management → Add → verify **real** printer names (not "Simulated USB Printer")
6. Test Print → confirm paper output
7. Print order from Print Workspace → confirm receipt
8. Reprint → confirm second output

---

## WSL / Docker Note

If Node runs inside WSL or a Linux container on a Windows machine, `process.platform` is `linux` and the **Linux** adapter runs. Run the MineuQR server **natively on Windows** for Windows printer access, or use `local_desktop` deployment on the host OS.

---

## Validation Matrix

| Scenario | Automated | Live (2026-06-30) | Physical Thermal |
|----------|-----------|-------------------|------------------|
| Platform detection win32 → Windows | ✅ | ✅ | — |
| No `lp` on Windows code path | ✅ | ✅ | — |
| No simulated fallback in production discovery | ✅ | ✅ | — |
| Installed Windows printers discovered | ✅ | ✅ 3 printers | — |
| Test print to real thermal printer | — | — | ⏳ Operator |
| Order → Printing Service → Windows print | — | — | ⏳ Operator |
| Reprint same path | — | — | ⏳ Operator |

## Certification Status

**WINDOWS PLATFORM CERTIFICATION PENDING** — native discovery verified on Windows host; thermal receipt output not confirmed in certification session.
