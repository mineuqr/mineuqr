# PRINT-CONNECTOR-LOCAL-1 — Architecture Traceability

---

## ADR-ARCH-016 v1.1

| Rule | Implementation |
|------|----------------|
| Rule 1 — RLC initiates | `GatewayConnectionClient.open()` |
| Rule 2 — No cloud inbound | Cloud `acceptConnection` only; RLC dials |
| Rule 8 — RLC infrastructure only | No order/print job logic |
| Rule 9 — No direct browser commands | Session command loop only |
| Rule 10 — Session SSOT | Heartbeat/register via session client |
| Rule 11 — Composition root | `connectorLocalComposition.ts` |

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
| PRINT-CONNECTOR-WINDOWS-2 (future) | Windows platform adapter on RLC |
| PRINT-PRODUCTION-VALIDATION-2 | End-to-end certification |
