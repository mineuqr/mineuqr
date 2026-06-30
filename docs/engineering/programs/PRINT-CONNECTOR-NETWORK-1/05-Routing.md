# PRINT-CONNECTOR-NETWORK-1 — Routing

---

## Canonical Path

```
Connector Gateway.routePrint()
        ↓
SessionConnectorExecutionPort
        ↓
ConnectorCommandRouter
        ↓
ConnectorTransportConnection (command envelope)
        ↓
RLC (future) → ConnectorCommandResponse
        ↓
ConnectorResponseRouter
        ↓
Gateway execution result
```

---

## Command Envelope (Domain C)

Every command carries:

| Field | Purpose |
|-------|---------|
| `commandId` | Response correlation |
| `restaurantId` | Tenant scope |
| `connectorId` | Instance routing |
| `correlationId` | Print job traceability |
| `issuedAt` | Command freshness |
| `nonce` | Replay resistance |

Command types: `execute_print`, `discover_printers`, `get_printer_status`.

---

## Print Command Transport

`execute_print` transports `PrintPayload` in the command envelope. **No printing occurs in this program** — commands are delivered and acknowledged only. RLC print execution belongs to PRINT-CONNECTOR-LOCAL-1.

---

## Response Correlation

`ConnectorResponseRouter` maps `commandId` → pending promise with timeout. Transport disconnect fails all pending commands with `transport_unavailable`.
