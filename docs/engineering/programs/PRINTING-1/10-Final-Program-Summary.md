# PRINTING-1 — Final Program Summary

## Delivered

PRINTING-1 implements the **Printing Service** as an operational coordination layer:

- **Print job lifecycle** — `pending` through terminal states without touching Order aggregate
- **Persistence** — `print_jobs`, `print_job_attempts`, `print_job_history` (migration 0047)
- **Dispatch** — `PrintDispatchCoordinator` → `NoOpPrintConnectorPort`
- **Canonical payload** — renderer-independent JSON from order read projections
- **Operational events** — `PrintRequested` … `PrintCancelled` with ops taxonomy
- **Integration ports** — `PrintConnectorPort`, `PrintResultPort`, `PrintStatusPublisher`
- **Order consumer** — `LogOrderPrintDispatchPort` replaced by `OrderPrintDispatchAdapter`
- **Workspace** — active Print / Reprint / Preview / Cancel via tRPC commands

## Not Delivered (By Design)

- Print connector, rendering, printer discovery, OS printing
- P-08 projection materialization (queue read uses service tables)

## Before PRINT-CONNECTOR-1

1. Apply migration `0047_printing_service.sql`
2. Implement `PrintConnectorPort` with real transport
3. Wire `PrintResultPort` callbacks for async completion
4. Consider P-08 projection for analytics/dashboard denormalization
5. Operator `markPrinted` may remain for manual fallback workflows

## Architectural Health

**Green.** The program respects the architecture constitution: Order remains the sole core domain; printing is isolated as a service with clear ports; workspace and consumers integrate through contracts only; no legacy printing paths were reintroduced.
