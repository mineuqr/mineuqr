# PRINT-CONNECTOR-NETWORK-1 — Architecture Traceability

---

## ADR-ARCH-016 v1.1 Compliance

| ADR Requirement | Implementation |
|-----------------|----------------|
| **RLC outbound session (Rule 1–2)** | `acceptConnection`; no cloud dial to restaurant |
| **Transport direction immutable (Rule 3–4)** | `ConnectorTransportConnection` abstraction |
| Scoped credentials | Pairing + `ConnectorAuthenticationService` |
| Tenant isolation | Credential + command `restaurantId` validation |
| Gateway routing | `SessionConnectorExecutionPort` |
| No browser → RLC | Unchanged — browser uses cloud only |
| **Gateway never prints (Rule 7)** | Commands transported only; no OS I/O |
| **RLC infrastructure only (Rule 8)** | Session layer has no business logic |
| **Connector Session SSOT (Rule 10)** | Lifecycle, heartbeat, availability from session |
| Command trust (Domain C) | Command envelope with nonce, issuedAt, correlationId |
| Heartbeat availability | `ConnectorHeartbeatProtocol` → gateway |

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
