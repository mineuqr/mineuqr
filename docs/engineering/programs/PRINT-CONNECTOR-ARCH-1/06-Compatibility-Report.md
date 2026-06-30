# PRINT-CONNECTOR-ARCH-1 — Compatibility Report

## Production Behavior

| Area | Status |
|------|--------|
| Default deployment | `embedded` — same in-process execution as before |
| Printer discovery | Unchanged |
| Print dispatch flow | Unchanged |
| Workspace API | Unchanged |
| Printing Service | Unchanged |
| `PrintConnectorPort` | **Unchanged** (file untouched) |
| Order domain | Unchanged |
| New persistence | None |
| New queues / lifecycle | None |

## Code Changes

| Component | Change |
|-----------|--------|
| `PrintConnectorRuntime` | Delegates to `DeploymentRuntime` instead of direct `PlatformAdapter` |
| `printConnectorComposition` | Uses `bootstrapPrintConnector()` |
| `PrintingServicePrintConnectorAdapter` | Types against `ConnectorRuntime` interface |

## Regression Risk

**Low.** Embedded runtime uses identical `createPlatformAdapter()` + `createTransportAdapters()` wiring as pre-ARCH composition.

## Opt-In Deployment

Setting `PRINT_CONNECTOR_DEPLOYMENT` to a non-embedded target selects a skeleton runtime with the same in-process adapters today — reserved for future host-specific implementations.
