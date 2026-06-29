# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Production Path Audit

**Date:** 2026-06-26

---

## Current Production Execution Path

Printing has **no end-to-end production path** today. The only live path is an event-consumer stub that terminates at a no-op port.

```
Order Command (mutation)
    │
    ▼
Order aggregate commit + domain event emission
    │
    ▼
DrizzleOutboxRepository (transactional outbox)
    │
    ▼
OrderEventRelay.processBatch()          ← post-mutation / batch relay
    │
    ▼
InProcessEventPublisher                   ← transport-only
    │
    ▼
OrderEventConsumerRegistry.dispatch()
    │
    ▼
OrderPrintingConsumer.handle()            ← registration order 40, parallel
    │
    ├── parseEnvelopePayload (OrderCreated | OrderReady)
    ├── getOrderById (OrderReady only — orderNumber lookup)
    │
    ▼
OrderPrintDispatchPort.dispatchPrintRequest()
    │
    ▼
LogOrderPrintDispatchPort                 ← NO-OP (default silent logger)
    │
    ▼
opsLog(order_print_dispatch_requested)    ← debug severity telemetry
    │
    ✕ END — no Print Job, Rendering, Dispatch, Host, Agent, or Printer
```

**Wiring evidence:** `consumerComposition.ts` line 30 — `new LogOrderPrintDispatchPort()`.

---

## Path Segments — Status

| Stage | Component | Status |
|-------|-----------|--------|
| Order | Order aggregate / command handlers | **ACTIVE** |
| Event | Domain events + outbox | **ACTIVE** |
| Consumer | `OrderPrintingConsumer` | **ACTIVE** |
| Print Job creation | — | **NOT IMPLEMENTED** |
| Rendering | TicketDocument / ESC/POS | **REMOVED** |
| Dispatch | Print Host / dispatcher service | **REMOVED** |
| Print Host | `server/print-host/` | **REMOVED** |
| Agent | `agent/` edge process | **REMOVED** |
| Printer | Hardware / device queue | **NOT CONNECTED** |

---

## Parallel / Duplicated Paths

| Path | Status | Notes |
|------|--------|-------|
| Legacy inline print on order commit | **DEAD** | RESET-1 removed |
| Legacy tRPC print procedures | **DEAD** | RESET-1 Wave 2 |
| Print Host HTTP dispatch | **DEAD** | RESET-1 Wave 3 |
| Agent job claim loop | **DEAD** | DB columns removed with tables |
| `OrderPrintingConsumer` → port | **ACTIVE** | Sole production hook |
| P-08 `PrintingQueueProjectionConsumer` | **NOT WIRED** | Type/metadata only; not in `createOrderReadProjectionConsumers` |
| Composite projection dispatch | **INACTIVE** | `ORDER_READ_PROJECTIONS_ENABLED=false` default; even if enabled, excludes P-08 |

**No duplicated live paths detected.** One integration consumer, one no-op port.

---

## Legacy Production Path (Pre-RESET-1 — Reconstructed from Docs/Migrations)

```
OrderCreated / auto-print hook
    │
    ▼
server/printing/ (print job service)
    │
    ▼
print_jobs table (queued → claimed → printing → printed)
    │
    ▼
Print Host dispatcher (dispatchNotifiedAt, assignedAgentId)
    │
    ▼
Edge Agent (agentId, lease, ESC/POS)
    │
    ▼
Physical printer
```

This path is **fully retired**. Migration `0043_print_purification.sql` dropped all tables.

---

## Abandoned / Dead Execution Paths

| Path | Evidence | Classification |
|------|----------|----------------|
| Auto-print on new order | `restaurant_print_settings.autoPrintOnNewOrder` (dropped) | **DEAD** |
| Station-based routing | `print_stations`, `categories.stationId` (dropped) | **DEAD** |
| Agent diagnostic runs | `print_diagnostic_runs` (dropped) | **DEAD** |
| Print job telemetry stream | `print_job_telemetry_events` (dropped) | **DEAD** |
| Commercial gates `thermalPrinting` / `autoPrint` / `reprint` | Removed from feature keys | **DEAD** |
| `scripts/preflight-printing-integrity-audit.ts` | Referenced in 0038–0042 comments only | **DEAD** |

---

## Future Target Path (ADR-ARCH-012 / READ-ARCHITECTURE-1)

```
Order Event
    │
    ├── OrderPrintingConsumer → real OrderPrintDispatchPort (PRINTING-1)
    │         └── creates/updates print job state
    │
    └── PrintingQueueProjectionConsumer (PRINTING-1)
              └── P-08 materialized queue
                        │
                        ▼
              printing.read.getQueue (PRINT-WORKSPACE-1)
                        │
                        ▼
              PRINT-CONNECTOR-1 (device / ESC/POS execution)
```

**Not active.** Documented in RA-04, RA-06, ADR-ARCH-012.

---

## Kitchen Parallel (Related Boundary)

```
OrderEvent → OrderKitchenConsumer → opsLog(order_kitchen_event_received)
```

No KDS queue, no `KitchenQueueProjectionConsumer`. Same foundation-only pattern as printing.

---

## Production Path Verdict

| Metric | Assessment |
|--------|------------|
| Live print execution | **None** (stub terminates at no-op port) |
| Path duplication | **None** |
| Legacy path residue in runtime | **None** |
| Constitution compliance | **PASS** — printing does not own Order state |
| Readiness for PRINT-WORKSPACE-1 UI | **BLOCKED** — no queue data layer exists |
