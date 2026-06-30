# PRINT-CONNECTOR-1 — Architecture Traceability

## Success Criteria

| Criterion | Evidence |
|-----------|----------|
| PrintConnectorPort implemented | `PrintingServicePrintConnectorAdapter` |
| Platform abstraction | 4 platform adapters + `PlatformAdapter` contract |
| Transport abstraction | 4 transport adapters + registry |
| Canonical models | `server/print-connector/domain/*` |
| Workspace integrated | `printConnector` router + `PrintWorkspacePanel` |
| Printing Service integrated | `printingComposition.ts` wiring |
| Windows / macOS / Linux / Android | Platform adapter files |
| USB / Ethernet / Wi-Fi / Bluetooth | Transport adapter files |
| No business logic in connector | Architecture guard tests |
| No legacy architecture | No Print Host, Agent, queue, dispatcher |
| Tests pass | `server/print-connector/__tests__` |

## Forbidden (Not Introduced)

Print Host, Print Agent, Windows Service, background runtime, registration/binding services, legacy queue/dispatcher/printer manager.

## Files

```
server/print-connector/
drizzle/0048_print_connector.sql
client/src/lib/print-workspace/usePrintConnector.ts
```
