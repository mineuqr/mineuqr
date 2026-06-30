# PRINT-CONNECTOR-ARCH-1 — Composition Root

## Location

`server/print-connector/printConnectorComposition.ts`

## Wiring

```typescript
const bootstrapped = bootstrapPrintConnector(printerSelectionRepository);
export const printConnectorDeploymentRuntime = bootstrapped.deploymentRuntime;
export const printConnectorRuntime = bootstrapped.connectorRuntime;
```

## Printing Service

`server/printing/printingComposition.ts` imports `printConnectorRuntime` — unchanged surface.

## Rules

- Deployment selection via `resolveDeploymentTarget()` — **only** in bootstrap/composition
- No `if (platform == ...)` in `PrintConnectorRuntime`, Printing Service, or Workspace
- No service locator

## Factory Registry

`DEPLOYMENT_RUNTIME_FACTORIES` in `deployment/DeploymentRuntimes.ts` — dependency injection map for all targets.
