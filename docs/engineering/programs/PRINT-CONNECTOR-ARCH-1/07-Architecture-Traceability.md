# PRINT-CONNECTOR-ARCH-1 — Architecture Traceability

## Exit Criteria

| Criterion | Evidence |
|-----------|----------|
| `PrintConnectorPort` unchanged | `server/printing/contracts/ports/PrintConnectorPort.ts` not modified |
| Business architecture unchanged | Printing Service, Workspace, Order untouched |
| Deployment Runtime abstraction | `DeploymentRuntime` + 5 target implementations |
| Embedded default | `DEFAULT_DEPLOYMENT_TARGET = "embedded"` |
| Composition root owns selection | `printConnectorComposition.ts`, `resolveDeploymentTarget.ts` |
| Deployment-agnostic connector | `PrintConnectorRuntime` uses `DeploymentRuntime` only |
| Workspace unchanged | No client/server workspace file changes |
| Tests pass | Bootstrap + architecture guard tests |

## Layer Ownership

| Layer | Owns |
|-------|------|
| Printing Service | Job lifecycle, payload, dispatch |
| Connector Runtime | Discovery orchestration, selection persistence calls, print routing |
| Deployment Runtime | Adapter resolution for host deployment model |
| Platform Adapter | OS APIs |
| Transport Adapter | Transport routing |

## Forbidden (Not Introduced)

Agent, Windows Service, background runtime, registration service, new queues, new business rules.
