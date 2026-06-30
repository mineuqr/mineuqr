# PRINTING-1 — Print Job Lifecycle

## Operational States

| Status | Meaning |
|--------|---------|
| `pending` | Job recorded; not yet handed to connector |
| `dispatched` | Submitted to `PrintConnectorPort` |
| `printing` | Connector acknowledged / execution in progress |
| `printed` | Terminal success |
| `failed` | Terminal failure |
| `cancelled` | Terminal operator/system cancellation |

## Valid Transitions

```
pending → dispatched | cancelled | failed
dispatched → printing | cancelled | failed
printing → printed | failed | cancelled
```

Terminal states (`printed`, `failed`, `cancelled`) accept no further transitions.

## Sources

| Source | Trigger |
|--------|---------|
| `order_event` | `OrderPrintingConsumer` on domain events |
| `operator` | Print Workspace manual print |
| `reprint` | Print Workspace reprint command |

## Order Aggregate Boundary

Lifecycle changes are persisted only in `print_jobs` and related tables. **Order status is never modified** by the Printing Service.

## Implementation

- Transition rules: `server/printing/domain/PrintJobStatus.ts`
- Orchestration: `server/printing/application/PrintingService.ts`
- Dispatch handoff: `server/printing/application/PrintDispatchCoordinator.ts`
