# PRINT-GATEWAY-1 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-GATEWAY-1 — Connector Gateway & Remote PrintConnectorPort  
**Authority:** [ADR-ARCH-016 v1.1](../../../architecture/adrs/ADR-ARCH-016.md)

---

## Mission

Implement the **Cloud Connector Gateway** — the single cloud entry point for Restaurant Local Connectors (RLC). The browser never communicates directly with RLC; it continues to communicate only with MineuQR Cloud.

This program delivers gateway domain models, registry, resolver, health, directory, composition, and a **Remote PrintConnectorPort** adapter. It does **not** implement network transport, WebSocket, or local connector runtime.

---

## Target Topology

```
Browser
  ↓
MineuQR Cloud (Printing Service, Print Workspace — unchanged)
  ↓
Connector Gateway                    ← PRINT-GATEWAY-1
  ↓
Remote PrintConnectorPort            ← PRINT-GATEWAY-1
  ↓
ConnectorExecutionPort (stub)        ← PRINT-CONNECTOR-NETWORK-1 (future)
  ↓
Restaurant Local Connector (future)
  ↓
Platform Adapter → Printer
```

---

## Delivered Module

| Path | Role |
|------|------|
| `server/connector-gateway/contracts/` | Canonical gateway models and repository/execution ports |
| `server/connector-gateway/services/` | Registry, resolver, health, directory, gateway service |
| `server/connector-gateway/infrastructure/` | In-memory repository, pending execution port |
| `server/connector-gateway/adapters/` | `RemotePrintConnectorPort` |
| `server/connector-gateway/gatewayComposition.ts` | Independent composition root |

---

## Composition Switch

`printingComposition.ts` selects connector execution via environment:

- `PRINT_CONNECTOR_EXECUTION_MODE=embedded` (default) — existing in-process connector
- `PRINT_CONNECTOR_EXECUTION_MODE=remote` — `RemotePrintConnectorPort` via gateway

Printing Service business logic is unchanged; only the composition root wires the port implementation.

---

## Exit Criteria Status

| Criterion | Status |
|-----------|--------|
| Connector Gateway exists | ✓ |
| Remote PrintConnectorPort | ✓ |
| Gateway composition | ✓ |
| Canonical models | ✓ |
| Registry / Resolver / Health | ✓ |
| Business layers unchanged | ✓ |
| PrintConnectorPort unchanged | ✓ |
| Architecture guards | ✓ |
| `npm run check` | ✓ |
| Vitest (gateway + full suite) | ✓ |
