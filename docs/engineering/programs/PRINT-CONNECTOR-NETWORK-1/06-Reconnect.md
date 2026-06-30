# PRINT-CONNECTOR-NETWORK-1 — Reconnect

---

## Policy

`ConnectorReconnectPolicy` defines exponential backoff for RLC client reconnect:

| Parameter | Default |
|-----------|---------|
| Base delay | 1,000 ms |
| Max delay | 60,000 ms |
| Max attempts | 12 |

Formula: `min(base × 2^(attempt-1), maxDelay)`

---

## Server-Side Recovery

| Event | Server behavior |
|-------|-----------------|
| Transport disconnect | `ConnectorSessionTransportHandler` cleans session, fails pending commands |
| Duplicate reconnect | Prior session disconnected; new session registered |
| Credential revoked | Auth rejected; session not established |

---

## Session Recovery

RLC must re-authenticate and re-register after transport loss. Gateway registry is updated on successful `register` message; stale sessions are removed on disconnect.

---

## Client Guidance (Future RLC)

1. Detect transport loss
2. Apply `ConnectorReconnectPolicy.nextDelayMs(attempt)`
3. Re-establish outbound transport
4. Re-run `auth` → `register` → `heartbeat`
