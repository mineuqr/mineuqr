# PRINT-CONNECTOR-WINDOWS-1 — Architecture Traceability

**Date:** 2026-06-30

---

## Unchanged Layers

| Layer | Status |
|-------|--------|
| Order Domain | Unchanged |
| Printing Service | Unchanged |
| PrintConnectorPort | Unchanged |
| Deployment Runtime abstraction | Unchanged |
| Transport abstraction | Unchanged |
| Print Workspace | Unchanged |
| Printer Management (orchestration) | Unchanged |

---

## Changed Files

| File | Change |
|------|--------|
| `platform/resolveHostPlatform.ts` | Override conflict policy |
| `platform/windows/WindowsPlatformAdapter.ts` | Hardened discovery/print |
| `platform/windows/windowsPrinterDiscovery.ts` | **New** — discovery script + parser |
| `platform/windows/windowsPrinterId.ts` | **New** — ID codec |
| `platform/linux/LinuxPlatformAdapter.ts` | Remove simulated catch fallback |
| `platform/darwin/DarwinPlatformAdapter.ts` | Remove simulated catch fallback |
| `platform/android/AndroidPlatformAdapter.ts` | Simulated only in test mode |
| `platform/BasePlatformAdapter.ts` | Sanitize failure messages |
| `runtime/PrintFailureMapper.ts` | ENOENT / simulated patterns |

---

## Execution Path (Unchanged Shape)

```
Order → Printing Service → PrintConnectorPort
  → PrintConnectorRuntime → DeploymentRuntime
  → PlatformAdapter → OS Print Spooler
```

---

## Tests Added

- `platform/__tests__/resolveHostPlatform.test.ts`
- `platform/__tests__/windowsSimulation.guards.test.ts`
- `platform/windows/__tests__/WindowsPlatformAdapter.test.ts`
