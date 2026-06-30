# PRINT-CONNECTOR-ARCH-1 — Connector Bootstrap

## Responsibilities

`DefaultConnectorBootstrap` / `bootstrapPrintConnector()`:

1. Resolve deployment target (`resolveDeploymentTarget()` or explicit config)
2. Create `DeploymentRuntime`
3. Compose `PrintConnectorRuntime` with selection repository
4. Return `{ deploymentRuntime, connectorRuntime }`

Nothing else — no business logic, no order logic, no workspace logic.

## Entry Point

`server/print-connector/bootstrap/ConnectorBootstrap.ts`

## Test Helper

`createTestDeploymentRuntime()` wraps a platform adapter for unit tests without touching composition root.
