# PRINT-CONNECTOR-LOCAL-1 — Bootstrap

---

## Canonical Sequence

```
Startup
  ↓
Configuration          (LocalConnectorConfigProvider)
  ↓
Identity               (buildRuntimeIdentity)
  ↓
Gateway Authentication (ConnectorSessionClient.authenticate)
  ↓
Connector Registration (ConnectorSessionClient.register)
  ↓
Healthy Session        (heartbeat + lifecycle = healthy)
  ↓
Ready                  (command loop active)
```

Implemented in `LocalConnectorBootstrap.start()`.

---

## Shutdown

`LocalConnectorBootstrap.stop()`:

1. Lifecycle → `stopping`
2. Stop heartbeat timer
3. Close transport
4. Lifecycle → `stopped`

---

## Reconnect

Uses `ConnectorReconnectPolicy` from connector-session (client-side). Full reconnect loop belongs to RLC process supervisor (future packaging program).
