# PRINT-GATEWAY-1 — Remote PrintConnectorPort

---

## Contract Preservation

`PrintConnectorPort` (`server/printing/contracts/ports/PrintConnectorPort.ts`) is **unchanged**:

```typescript
interface PrintConnectorPort {
  submit(submission: PrintConnectorSubmission): Promise<void>;
}
```

Business layers (`PrintingService`, `PrintDispatchCoordinator`) depend only on this interface.

---

## Implementations

| Adapter | Execution | Composition |
|---------|-----------|-------------|
| `PrintingServicePrintConnectorAdapter` | Embedded `ConnectorRuntime` | Default (`embedded`) |
| `RemotePrintConnectorPort` | `ConnectorGatewayService.routePrint()` | `remote` mode |

Both adapters:

- Emit `print_connector_submission` ops event
- Call `PrintResultPort.reportPrintSuccess` or `reportPrintFailure`
- Never leak platform adapter types to Printing Service

---

## Remote Adapter Behavior

`RemotePrintConnectorPort` (`server/connector-gateway/adapters/RemotePrintConnectorPort.ts`):

1. Logs submission with `executionMode: "remote"` metadata.
2. Builds `GatewayPrintRouteRequest` including `PrintPayload` for future transport.
3. Delegates routing to `ConnectorGatewayService`.
4. Maps gateway result to print result port callbacks.

Printing Service cannot distinguish embedded vs remote — composition root selects the adapter.

---

## Failure Semantics

| Gateway failure | Print result |
|-----------------|--------------|
| `connector_unregistered` | `reportPrintFailure` |
| `connector_offline` | `reportPrintFailure` |
| `transport_unavailable` | `reportPrintFailure` (expected until PRINT-CONNECTOR-NETWORK-1) |
| Routed successfully | `reportPrintSuccess` |

No simulated printer fallback in remote mode.
