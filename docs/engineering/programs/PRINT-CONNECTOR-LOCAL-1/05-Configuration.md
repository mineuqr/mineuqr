# PRINT-CONNECTOR-LOCAL-1 — Configuration

---

## Abstraction

`LocalConnectorConfigProvider` — swappable config source.

Default: `EnvLocalConnectorConfigProvider` (runtime env vars only — no business config).

---

## Configuration Fields

| Field | Env variable | Purpose |
|-------|--------------|---------|
| `cloudEndpoint` | `RLC_CLOUD_ENDPOINT` | Gateway wire endpoint |
| `restaurantId` | `RLC_RESTAURANT_ID` | Tenant scope |
| `connectorId` | `RLC_CONNECTOR_ID` | Instance identity |
| `credentialSecret` | `RLC_CREDENTIAL_SECRET` | Domain B auth |
| `runtimeId` | `RLC_RUNTIME_ID` | Runtime identity |
| `hostLabel` | `RLC_HOST_LABEL` | Registration metadata |
| `hostFingerprint` | `RLC_HOST_FINGERPRINT` | Host binding |
| `heartbeatIntervalMs` | `RLC_HEARTBEAT_INTERVAL_MS` | Liveness interval |

`deploymentType` is fixed to `local_desktop` for this program.
