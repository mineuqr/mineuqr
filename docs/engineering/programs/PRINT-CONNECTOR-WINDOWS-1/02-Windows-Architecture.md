# PRINT-CONNECTOR-WINDOWS-1 — Windows Architecture

---

## Placement (ADR-ARCH-016 v1.2 Rules 17–20)

| Layer | Windows I/O |
|-------|-------------|
| Cloud API | **Never** |
| Connector Gateway | **Never** |
| Connector Session | Transport only |
| **RLC** | **WindowsPlatformAdapter + PrintConnectorRuntime** |

---

## RLC Windows Stack

```
connectorLocalComposition.ts
├── PlatformAdapterHost → WindowsPlatformAdapter
├── RlcWindowsDeploymentRuntime
├── PrintConnectorRuntime
├── LocalConnectorRuntimeFacade
└── RuntimeConnectorCommandHandler
```

---

## Simulation Policy

| Context | Simulated printers |
|---------|-------------------|
| `NODE_ENV=test` (unit tests) | Allowed via mocks |
| `RLC_RUNTIME=1` production RLC | **Forbidden** — native PowerShell only |
| Discovery failure | Returns `[]` — no silent fallback |
