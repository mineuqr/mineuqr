# PRINT-CONNECTOR-ARCH-1 — Deployment Runtime

## Contract

`DeploymentRuntime` (`contracts/deployment/DeploymentRuntime.ts`):

- `descriptor: DeploymentDescriptor`
- `getPlatformAdapter()`
- `getTransportAdapters()`

## Descriptor Types

| Type | Purpose |
|------|---------|
| `RuntimeIdentity` | `target`, `instanceId`, `label` |
| `RuntimeCapabilities` | discovery, remote, background, in-process flags |
| `DeploymentDescriptor` | identity + capabilities |

## Targets

| Target | Class | Status |
|--------|-------|--------|
| `embedded` | `EmbeddedDeploymentRuntime` | **Production default** |
| `local_desktop` | `LocalDesktopDeploymentRuntime` | Skeleton (in-process adapters) |
| `android` | `AndroidDeploymentRuntime` | Skeleton |
| `edge` | `EdgeDeploymentRuntime` | Skeleton |
| `future` | `FutureDeploymentRuntime` | Placeholder |

Skeleton runtimes share `InProcessDeploymentRuntime` adapter wiring today so selecting a non-default target does not break dev experiments; production remains `embedded`.

## No Assumptions

The `DeploymentRuntime` contract does not assume HTTP, localhost, background process, Windows, desktop, or server.
