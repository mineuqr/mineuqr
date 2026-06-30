# PRINTING-1 — Dispatch Flow

## Order Event Path

```
Order domain event published
  → OrderEventConsumerRegistry
  → OrderPrintingConsumer
  → OrderPrintDispatchAdapter (OrderPrintDispatchPort)
  → PrintingService.requestPrint
  → PrintDispatchCoordinator.dispatchPendingJob
  → PrintConnectorPort.submit (NoOp stub)
```

## Coordinator Steps

1. `pending` → `dispatched` — record `PrintDispatched`, increment attempt
2. Call `PrintConnectorPort.submit` with canonical payload
3. `dispatched` → `printing` — record `PrintStarted`

## Idempotency

Order events use key: `order-event:{eventType}:{eventId}`.

Duplicate consumer delivery returns the existing job without re-dispatch unless still `pending`.

## Connector Boundary

The Printing Service **never** communicates with printers or the OS. Dispatch ends at `PrintConnectorPort`.

Future **PRINT-CONNECTOR-1** will implement the port and call back via `PrintResultPort`.

## Ops Signals

- `print_dispatched`, `print_started`, `print_connector_submission`
