# PRINT-GATEWAY-1 — Architecture Traceability

**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

---

## ADR-ARCH-016 v1.2 Compliance

| ADR Rule | PRINT-GATEWAY-1 Implementation |
|----------|--------------------------------|
| Rules 1–2 — Outbound session | Gateway accepts sessions; never dials restaurant |
| Rule 5 — Gateway never prints | No OS print I/O — delegates to `ConnectorExecutionPort` |
| Rule 8 — No direct browser→RLC | No browser/gateway coupling added |
| Rule 9 — Session SSOT | Heartbeat/availability derived from session layer |
| Rule 11 — PrintConnectorPort unchanged | Interface file untouched |
| Rule 12 — PrintingService unchanged | No edits to `PrintingService.ts` |
| Rule 13 — Session contracts only | `ConnectorExecutionPort` via session layer |
| Rule 18 — Canonical path (gateway slice) | `ConnectorGatewayService`, `RemotePrintConnectorPort` |
| Rule 18 — Composition root | `gatewayComposition.ts`, `printingComposition.ts` |

---

## Explicit Non-Goals (Completed by sibling programs)

| Item | Program | Status |
|------|---------|--------|
| Connector Session transport | PRINT-CONNECTOR-NETWORK-1 | Complete |
| RLC executable / local runtime | PRINT-CONNECTOR-LOCAL-1 | Complete |
| Windows/OS printing on RLC | PRINT-CONNECTOR-WINDOWS-1 | Complete |
| Durable gateway persistence | TBD persistence program | Planned |

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
