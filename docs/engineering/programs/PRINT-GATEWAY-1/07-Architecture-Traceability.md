# PRINT-GATEWAY-1 — Architecture Traceability

---

## ADR-ARCH-016 Compliance

| ADR Requirement | PRINT-GATEWAY-1 Implementation |
|-----------------|--------------------------------|
| Connector Gateway routes to RLC | `ConnectorGatewayService.routePrint()` |
| Browser → Cloud only | No browser/gateway coupling added |
| `PrintConnectorPort` unchanged | Interface file untouched |
| Remote port adapter in cloud | `RemotePrintConnectorPort` |
| Printing Service unchanged | No edits to `PrintingService.ts` |
| Gateway owns registration/routing/health | Registry, resolver, health, directory |
| No print execution in gateway | `ConnectorExecutionPort` delegated |
| `embedded` non-production for distributed | Default remains `embedded`; `remote` opt-in |

---

## Explicit Non-Goals (Deferred)

| Item | Future Program |
|------|----------------|
| WebSocket / SignalR / HTTP polling | PRINT-CONNECTOR-NETWORK-1 |
| RLC executable / local runtime | PRINT-CONNECTOR-LOCAL-1 |
| Windows/OS printing | PRINT-CONNECTOR-WINDOWS-1 (on RLC host) |
| Durable gateway persistence | TBD persistence program |

---

## Unchanged Modules (Verified by Architecture Guards)

- `server/printing/application/PrintingService.ts`
- `server/printing/contracts/ports/PrintConnectorPort.ts`
- `server/print-connector/` platform adapters and `PrintConnectorApi`
- Order domain, Print Workspace, Printer Management business rules

---

## Guard Tests

`server/connector-gateway/__tests__/architecture.guards.test.ts` validates:

- Gateway services do not import order/printing persistence
- Remote port does not reference platform adapters or `ConnectorRuntime`
- Execution mode selection only in composition roots
- `PrintConnectorPort` interface stability
