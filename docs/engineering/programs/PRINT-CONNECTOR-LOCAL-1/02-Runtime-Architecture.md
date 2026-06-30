# PRINT-CONNECTOR-LOCAL-1 — Runtime Architecture

---

## Components

| Component | Responsibility |
|-----------|----------------|
| `LocalConnectorHost` | Authoritative lifecycle state |
| `LocalConnectorBootstrap` | Startup/shutdown orchestration |
| `GatewayConnectionClient` | Outbound transport open/close |
| `ConnectorSessionClient` | Auth, register, heartbeat, command loop |
| `DeferredConnectorCommandHandler` | Transport-only command ack (print deferred) |
| `PlatformAdapterHost` | Future platform adapter slot |
| `LocalConnectorDiagnostics` | Runtime introspection |

---

## RLC Owns (Infrastructure Only)

- Connector session client
- Session recovery hooks (reconnect policy)
- Heartbeats
- Runtime health and diagnostics
- Platform adapter hosting (stub)
- Future: printer discovery and execution

## RLC Must Never Own

- Orders, print jobs, printing policy
- Business rules, restaurant data, workflows

---

## ADR Compliance

- **Rule 1:** RLC initiates via `GatewayConnectionClient.open()`
- **Rule 8:** No business logic in RLC module
- **Rule 9:** Commands accepted only from cloud session (not browsers)
- **Rule 11:** Deployment terminates at `connectorLocalComposition.ts`
