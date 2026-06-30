# PRINT-CONNECTOR-NETWORK-1 — Architecture Traceability

---

## ADR-ARCH-016 Compliance

| ADR Requirement | Implementation |
|-----------------|----------------|
| RLC outbound session | `acceptConnection` + transport abstraction |
| Scoped credentials | Pairing + `ConnectorAuthenticationService` |
| Tenant isolation | Credential + command `restaurantId` validation |
| Gateway routing | `SessionConnectorExecutionPort` |
| No browser → RLC | Unchanged — browser uses cloud only |
| Command trust (Domain C) | Command envelope with nonce, issuedAt, correlationId |
| Heartbeat availability | `ConnectorHeartbeatProtocol` → gateway |
| No business logic on RLC path | Commands transported only |

---

## Unchanged Modules

- `PrintingService`
- `PrintConnectorPort`
- `PrintConnectorApi`
- Platform adapters
- `DeploymentRuntime`
- Order domain

---

## Gateway Integration Point

`gatewayComposition.ts`:

```typescript
export const connectorGatewayComposition = connectorNetworkComposition.gateway;
```

Isolated gateway tests still use `composeConnectorGateway({ execution: mock })`.

---

## Program Sequence

PRINT-GATEWAY-1 (done) → **PRINT-CONNECTOR-NETWORK-1** (done) → PRINT-CONNECTOR-LOCAL-1 (next)
