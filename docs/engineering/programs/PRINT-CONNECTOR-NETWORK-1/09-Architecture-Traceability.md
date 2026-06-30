# PRINT-CONNECTOR-NETWORK-1 — Architecture Traceability

**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

---

## ADR-ARCH-016 v1.2 Compliance

| ADR Rule | Implementation |
|----------|----------------|
| Rules 1–2 — RLC outbound session | `acceptConnection`; no cloud dial to restaurant |
| Rules 3–4 — Transport direction immutable | `ConnectorTransportConnection` abstraction |
| Rule 5 — Gateway never prints | Commands transported only; no OS I/O |
| Rules 6–7 — RLC infrastructure only | Session layer has no business logic |
| Rule 8 — No direct client commands | Browser uses cloud only |
| Rule 9 — Connector Session SSOT | Lifecycle, heartbeat, availability from session |
| Rule 13 — Session contracts only | Canonical session command/response envelopes |
| Rule 18 — Canonical path (session slice) | `SessionConnectorExecutionPort` → gateway |
| Scoped credentials | Pairing + `ConnectorAuthenticationService` |
| Tenant isolation | Credential + command `restaurantId` validation |
| Command trust | Command envelope with nonce, issuedAt, correlationId |
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

PRINT-GATEWAY-1 (done) → **PRINT-CONNECTOR-NETWORK-1** (done) → PRINT-CONNECTOR-LOCAL-1 (done) → PRINT-CONNECTOR-WINDOWS-1 (done)
