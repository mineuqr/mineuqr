# PRINT-CONNECTOR-ARCH-1 — Runtime Contracts

## Files

| Contract | Path |
|----------|------|
| `DeploymentTarget` | `contracts/deployment/DeploymentContracts.ts` |
| `RuntimeIdentity` | same |
| `RuntimeCapabilities` | same |
| `DeploymentDescriptor` | same |
| `DeploymentRuntime` | `contracts/deployment/DeploymentRuntime.ts` |
| `ConnectorRuntime` | `contracts/deployment/ConnectorRuntime.ts` (= `PrintConnectorApi`) |
| `ConnectorBootstrap` | `contracts/deployment/ConnectorBootstrap.ts` |

## Unchanged Contracts

| Contract | Status |
|----------|--------|
| `PrintConnectorPort` | **Unchanged** |
| `PrintConnectorApi` | **Unchanged** |
| `PlatformAdapter` | **Unchanged** |
| `TransportAdapter` | **Unchanged** |

## Printing Service Boundary

Printing Service depends only on `PrintConnectorPort.submit()`. It has no reference to deployment types.
