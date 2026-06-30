# PRINT-CONNECTOR-LOCAL-1 — Runtime Identity

---

## Canonical Identity

`LocalConnectorRuntimeIdentity`:

| Field | Source |
|-------|--------|
| `connectorId` | Config |
| `runtimeId` | Config / auto-generated |
| `restaurantId` | Config |
| `deploymentType` | `local_desktop` |
| `platform` | `os.platform()` |
| `architecture` | `os.arch()` |
| `connectorVersion` | Config / `LOCAL_CONNECTOR_VERSION` |
| `capabilities` | `buildRuntimeCapabilities()` |
| `hostFingerprint` | Config |
| `hostLabel` | Config |

---

## Capabilities (RLC Production)

```typescript
{
  supportsLocalDiscovery: true,
  supportsRemoteExecution: true,
  supportsBackgroundExecution: true,
  supportsInProcessExecution: false,
}
```

Aligned with gateway registration protocol expectations.
