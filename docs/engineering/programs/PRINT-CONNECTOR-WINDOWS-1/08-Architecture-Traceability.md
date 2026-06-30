# PRINT-CONNECTOR-WINDOWS-1 — Architecture Traceability

**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

---

## ADR-ARCH-016 v1.2

| Rule | Compliance |
|------|------------|
| Rules 1–2 — Outbound session only | Unchanged — RLC initiates |
| Rule 5 — Gateway never prints | No cloud code changes |
| Rules 6–7 — RLC infrastructure only | No business logic in Windows runtime |
| Rules 14–15 — Platform isolation | `WindowsPlatformAdapter` inside RLC only |
| Rule 19 — PlatformAdapterHost | `PlatformAdapterHost` — sole adapter lifecycle authority |
| Rule 20 — LocalConnectorRuntimeFacade | `LocalConnectorRuntimeFacade` — session→adapter boundary |
| Rule 21 — No production simulation | `RLC_RUNTIME=1` disables simulated discovery |
| Rule 18 — Canonical path (platform slice) | RLC → PlatformAdapterHost → OS → Printer |

---

## Unchanged Modules

- `server/connector-gateway/`
- `server/connector-session/services/`
- `server/printing/`
- `PrintConnectorPort`

---

## Modified (RLC scope only)

- `server/connector-local/windows/` — Windows runtime integration
- `WindowsPlatformAdapter` — `RLC_RUNTIME=1` disables simulation on RLC path

---

## Depends On

PRINT-CONNECTOR-LOCAL-1, PRINT-CONNECTOR-NETWORK-1, PRINT-GATEWAY-1

## Ratifies

ADR-ARCH-016 v1.2 Rules 19–21 (approved by PRINT-CONNECTOR-WINDOWS-1)
