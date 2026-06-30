# PRINT-GATEWAY-1 — Health Model

---

## Heartbeat Ingestion

`ConnectorHealthService.recordHeartbeat()` accepts:

```typescript
type ConnectorHeartbeat = {
  restaurantId: number;
  connectorInstanceId: string;
  receivedAt: string;
};
```

Heartbeats update `runtime.lastHeartbeatAt` and refresh status to `online`. Unknown or mismatched connectors are rejected (returns `null`).

---

## Availability Thresholds

| State | Condition |
|-------|-----------|
| `online` | Heartbeat age ≤ 30 seconds |
| `degraded` | Heartbeat age > 30s and ≤ 90s |
| `offline` | Heartbeat age > 90s or no heartbeat |
| `unregistered` | No session in registry |

Constants: `DEGRADED_AFTER_MS = 30_000`, `OFFLINE_AFTER_MS = 90_000`.

---

## ConnectorHealth Snapshot

```typescript
type ConnectorHealth = {
  identity: ConnectorIdentity;
  status: ConnectorStatus;
  heartbeatAgeMs: number | null;
  evaluatedAt: string;
};
```

Evaluation is pure given session state and evaluation timestamp — suitable for directory queries and resolver decisions.

---

## Routing Interaction

- **Offline** connectors block routing (`failureReason: connector_offline`).
- **Degraded** connectors remain routable in v1 (heartbeat delayed but session exists).
- **Unregistered** restaurants fail with `connector_unregistered`.

Future programs may add queue-and-retry for degraded/offline scenarios per ADR-ARCH-016 offline handling notes.
