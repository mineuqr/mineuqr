# PRINTING-1 — Architecture Traceability

## Success Criteria Mapping

| Criterion | Evidence |
|-----------|----------|
| Printing Service implemented | `server/printing/application/PrintingService.ts` |
| Print Job lifecycle | `02-Print-Job-Lifecycle.md`, `PrintJobStatus.ts` |
| Print persistence | `0047_printing_service.sql`, Drizzle repositories |
| Workspace integrated | `printWorkspaceRouter` commands + `PrintWorkspacePanel` |
| Integration ports defined | `PrintConnectorPort`, `PrintResultPort`, `PrintStatusPublisher` |
| No connector implementation | Only `NoOpPrintConnectorPort` |
| No rendering | `PrintPayload` JSON only |
| No OS interaction | Architecture guard tests |
| Tests pass | `server/printing/**/__tests__` |
| Production stable | Order consumer path unchanged; additive migration |

## Wiring

| Component | Location |
|-----------|----------|
| Consumer wiring | `server/order/consumerComposition.ts` → `orderPrintDispatchAdapter` |
| Composition root | `server/printing/printingComposition.ts` |
| Workspace commands | `server/print-workspace/commands/PrintWorkspaceCommandService.ts` |

## P-08 Projection

`P-08-printing-queue` remains **defined** (not materialized). Print queue reads come from Printing Service tables directly in PRINTING-1. A future projection may denormalize for analytics.

## Forbidden Legacy

No Print Host, Agent, legacy queue, dispatcher, or printer manager references introduced.
