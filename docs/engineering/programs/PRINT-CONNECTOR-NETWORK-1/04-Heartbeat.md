# PRINT-CONNECTOR-NETWORK-1 — Heartbeat

---

## Contract

```typescript
type ConnectorHeartbeatRequest = {
  sessionId: string;
  restaurantId: number;
  connectorId: string;
  version: string;
  capabilities: ConnectorCapability;
  receivedAt: string;
};
```

Heartbeat carries **infrastructure metadata only** — no orders, print jobs, or business payloads.

---

## Gateway Projection

`ConnectorHeartbeatProtocol` delegates to `ConnectorGatewayService.heartbeat()`, updating:

- Last heartbeat timestamp
- Connector availability (`online` / `degraded` / `offline`)
- Session lifecycle (`healthy`)

Thresholds (from PRINT-GATEWAY-1): **30s** degraded, **90s** offline.

---

## Gateway Visibility

Gateway always knows:

- Connector online/offline state
- Last heartbeat time
- Health evaluation
- Connector version and capabilities (from heartbeat payload)

---

## Failures

| Condition | Code |
|-----------|------|
| Unknown session | `session_expired` |
| Tenant mismatch | `authentication_failure` |
| Unsupported version | `version_mismatch` |
| Gateway rejects heartbeat | `connector_unavailable` |
