# PRINTING-1 — Printing Service Architecture

## Purpose

PRINTING-1 implements the **Printing Service** — an operational coordination layer that decides **what** should be printed and **when**, without deciding **how** printing is executed.

## Constitutional Alignment

| Rule | Implementation |
|------|----------------|
| Order is the only Core Domain | Print jobs never mutate `Order` aggregate state |
| Event-Driven Architecture | `OrderPrintingConsumer` reacts to `OrderCreated` / `OrderReady` |
| Read Models derived from Domain Events | Canonical payload built from `order_read_*` projections |
| Printing is a Service | `server/printing/` module with explicit application + infrastructure boundaries |
| Print Connector is integration only | `PrintConnectorPort` interface + `NoOpPrintConnectorPort` stub |
| One Production Path | `OrderPrintDispatchAdapter` → `PrintingService` → `PrintDispatchCoordinator` |

## Module Layout

```
server/printing/
  domain/           — lifecycle, payload, operational events
  contracts/        — ports and repository interfaces
  application/      — PrintingService, PrintDispatchCoordinator
  infrastructure/   — Drizzle repos, payload builder, NoOp connector, ops publisher
  printingComposition.ts
```

## Non-Goals (Honored)

No Print Host, Agent, legacy queue, OS printing, rendering (ESC/POS, PDF, raster), or connector implementation.

## Related Programs

- **PRINT-WORKSPACE-1** — operational UI consuming read models + service contracts
- **PRINT-CONNECTOR-1** — future implementation of `PrintConnectorPort` + `PrintResultPort`
