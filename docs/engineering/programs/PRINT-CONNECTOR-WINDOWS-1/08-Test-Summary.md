# PRINT-CONNECTOR-WINDOWS-1 — Test Summary

**Date:** 2026-06-30

---

## Commands

| Command | Result |
|---------|--------|
| `npm run check` | **PASS** |
| `npm test` (full suite) | **PASS** — 207 files, 1188 tests |
| Live native discovery (`_validate-windows-native.ts`) | **PASS** — 3 printers, 0 simulated |

---

## PRINT-CONNECTOR-WINDOWS-1 Tests

| File | Tests |
|------|-------|
| `resolveHostPlatform.test.ts` | Platform resolution, override policy, adapter selection |
| `windowsSimulation.guards.test.ts` | No simulated catch, no `lp` in Windows path |
| `windowsPrinterDiscovery.test.ts` | PowerShell script structure (newline-separated) |
| `WindowsPlatformAdapter.test.ts` | JSON parsing, simulated ID rejection at print |

---

## Regression

Existing print-connector architecture guards and runtime tests pass unchanged.

---

## Not Covered by Automation

- Live `Get-Printer` against host spooler
- Physical paper output
- Order print E2E on Windows hardware
