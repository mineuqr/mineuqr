# PRINT-CONNECTOR-LOCAL-1 — Health Model

---

## Snapshot

`LocalConnectorHealthSnapshot` via `LocalConnectorHost.evaluateHealth()`:

| Field | Description |
|-------|-------------|
| `lifecycle` | Current RLC lifecycle state |
| `connectorStatus` | `offline` / `connecting` / `online` / `degraded` |
| `gatewayConnectivity` | `connected` / `disconnected` |
| `sessionState` | Session ID, connection ID, heartbeat timestamps |
| `platformAvailable` | Platform adapter host ready |
| `uptimeMs` | Process uptime |
| `version` | Connector version |
| `capabilities` | Runtime capability flags |

No printer execution health in this program — deferred to platform programs.
