# PRINT-CONNECTOR-NETWORK-1 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-CONNECTOR-NETWORK-1 — Connector Session Protocol & Secure Remote Transport  
**Authority:** ADR-ARCH-016

---

## Mission

Implement the secure communication layer between the **Cloud Connector Gateway** and the future **Restaurant Local Connector (RLC)**. RLC always initiates outbound connections; cloud never opens inbound connections to restaurants.

This is an **infrastructure program** — no RLC runtime, no OS printing, no business logic changes.

---

## Target Topology

```
Browser → MineuQR Cloud → Connector Gateway
                              ↓
                         Connector Session (PRINT-CONNECTOR-NETWORK-1)
                              ↓
                         Restaurant Local Connector (future)
                              ↓
                         Platform Adapter → Printer
```

---

## Delivered Module

| Path | Role |
|------|------|
| `server/connector-session/contracts/` | Session protocol, transport ports, failure codes |
| `server/connector-session/services/` | Auth, lifecycle, registration, heartbeat, routing |
| `server/connector-session/infrastructure/` | In-memory persistence, in-process test transport |
| `server/connector-session/adapters/` | `SessionConnectorExecutionPort` (gateway integration) |
| `server/connector-session/networkComposition.ts` | Session + gateway wiring |

---

## Gateway Integration

`gatewayComposition.ts` default export uses `connectorNetworkComposition.gateway`, wiring `SessionConnectorExecutionPort` as the live `ConnectorExecutionPort` implementation.

---

## Exit Criteria

| Criterion | Status |
|-----------|--------|
| Connector Session lifecycle | ✓ |
| Registration protocol | ✓ |
| Authentication (pairing + credentials) | ✓ |
| Heartbeat protocol | ✓ |
| Transport abstraction | ✓ |
| Command/response routing | ✓ |
| Failure model | ✓ |
| Reconnect policy | ✓ |
| Gateway integration | ✓ |
| Business layers unchanged | ✓ |
| `npm run check` + Vitest | ✓ |
