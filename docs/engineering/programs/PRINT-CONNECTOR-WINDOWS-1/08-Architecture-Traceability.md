# PRINT-CONNECTOR-WINDOWS-1 — Architecture Traceability

---

## ADR-ARCH-016 v1.1

| Rule | Compliance |
|------|------------|
| RLC owns platform adapters | `RlcWindowsDeploymentRuntime` |
| Cloud never prints | No cloud code changes |
| Outbound session only | Unchanged |
| Gateway orchestrates only | Unchanged |
| Business logic in cloud | `PrintingService` unchanged |

---

## Unchanged Modules

- `server/connector-gateway/`
- `server/connector-session/services/`
- `server/printing/`
- `PrintConnectorPort`

---

## Modified (RLC scope only)

- `server/connector-local/` — Windows runtime integration
- `WindowsPlatformAdapter` — `RLC_RUNTIME=1` disables simulation in tests on RLC path

---

## Depends On

PRINT-CONNECTOR-LOCAL-1, PRINT-CONNECTOR-NETWORK-1, PRINT-GATEWAY-1
