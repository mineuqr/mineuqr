# PRINT-CONNECTOR-NETWORK-1 — Session Architecture

---

## Session Lifecycle (Authoritative)

```
Disconnected
    ↓
Connecting        (transport accepted)
    ↓
Authenticating    (credential validated)
    ↓
Registered        (gateway registry updated)
    ↓
Healthy           (heartbeat current)
    ↓
Degraded          (heartbeat delayed — gateway projection)
    ↓
Disconnected      (transport lost / revoked)
```

Managed by `ConnectorSessionManager` with persistence via `ConnectorSessionRepository`.

---

## Connector Identity

Registration includes:

| Field | Source |
|-------|--------|
| `connectorId` | Stable instance identifier |
| `restaurantId` | Tenant scope |
| `runtimeId` | RLC runtime identity |
| `platform` | OS process platform |
| `version` | Connector semver |
| `capabilities` | Discovery/execution flags |
| `deploymentType` | `DeploymentTarget` |
| `hostFingerprint` | Host binding metadata |

---

## Session Components

| Service | Responsibility |
|---------|----------------|
| `ConnectorSessionManager` | Lifecycle transitions, duplicate session protection |
| `ConnectorSessionTransportHandler` | Inbound message dispatch on cloud transport |
| `ConnectorRegistrationProtocol` | Gateway registry registration |
| `ConnectorHeartbeatProtocol` | Liveness signals (no business logic) |
| `ConnectorCommandRouter` | Outbound commands to RLC |
| `ConnectorResponseRouter` | Inbound response correlation |

---

## Duplicate Session Protection

When the same `connectorId` reconnects, the prior session is disconnected and removed before the new session is bound to the transport registry.
