# PRINT-CONNECTOR-LOCAL-1 — Architecture Traceability

**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

---

## ADR-ARCH-016 v1.2

| Rule | Implementation |
|------|----------------|
| Rules 1–2 — RLC initiates outbound session | `GatewayConnectionClient.open()` |
| Rules 6–7 — RLC infrastructure only | No order/print job/policy logic |
| Rule 8 — No direct client commands | Session command loop only |
| Rule 9 — Session SSOT | Heartbeat/register via `ConnectorSessionClient` |
| Rule 10 — Platform Adapters on RLC | Hosted via composition; Windows via PRINT-CONNECTOR-WINDOWS-1 |
| Rule 11 — Composition root | `connectorLocalComposition.ts` |
| Rule 18 — Canonical path (RLC slice) | `LocalConnectorHost`, `LocalConnectorBootstrap` |
| Rules 19–20 — PlatformAdapterHost / RuntimeFacade | PRINT-CONNECTOR-WINDOWS-1 on `win32` |
| Rule 21 — No production simulation | Deferred adapter on non-Windows; Windows RLC disables sim |

---

## Unchanged Modules

- `server/connector-gateway/` — no modifications
- `server/connector-session/services/` — no modifications
- `server/printing/` — no modifications
- `PrintConnectorPort` — unchanged

---

## Depends On

| Program | Provides |
|---------|----------|
| PRINT-GATEWAY-1 | Registry, routing |
| PRINT-CONNECTOR-NETWORK-1 | Session protocol contracts |

---

## Enables

| Program | Delivers |
|---------|----------|
| PRINT-CONNECTOR-WINDOWS-1 | Windows platform adapter on RLC |
| PRINT-PRODUCTION-VALIDATION-2 | End-to-end certification |
