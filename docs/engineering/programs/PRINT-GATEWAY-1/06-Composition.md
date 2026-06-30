# PRINT-GATEWAY-1 — Composition

---

## Gateway Composition Root

`server/connector-gateway/gatewayComposition.ts`

```typescript
composeConnectorGateway(options?: {
  repository?: ConnectorRegistryRepository;
  execution?: ConnectorExecutionPort;
}): ConnectorGatewayComposition
```

Default wiring:

| Dependency | Default implementation |
|------------|------------------------|
| Repository | `InMemoryConnectorRegistryRepository` |
| Execution | `PendingConnectorExecutionPort` |
| Services | Registry → Health → Resolver → Directory → Gateway |

Exports:

- `connectorGatewayComposition` — singleton for app wiring
- `connectorGateway` — gateway service instance
- `createRemotePrintConnectorPort(printResultPort)` — factory for remote adapter

Gateway composes **independently** of Printing Service.

---

## Printing Composition Integration

`server/printing/printingComposition.ts` adds execution mode selection only:

```typescript
function resolvePrintConnectorExecutionMode(): "embedded" | "remote" {
  const configured = process.env.PRINT_CONNECTOR_EXECUTION_MODE?.trim().toLowerCase();
  return configured === "remote" ? "remote" : "embedded";
}
```

- **embedded** (default): `PrintingServicePrintConnectorAdapter` + `printConnectorRuntime`
- **remote**: `connectorGatewayComposition.createRemotePrintConnectorPort(printResultPort)`

`PrintingService`, `PrintDispatchCoordinator`, and order adapters are unchanged.

---

## ConnectorExecutionPort Stub

`PendingConnectorExecutionPort` returns `transport_unavailable` for all print executions.  
PRINT-CONNECTOR-NETWORK-1 will provide real RLC transport without changing gateway service contracts.
