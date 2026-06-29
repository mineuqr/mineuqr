# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Runtime Ownership

**Date:** 2026-06-26

Principle: **Each responsibility has exactly one owner.** Printing is a Service; Order is Core Domain.

---

## Responsibility Matrix (Current Production)

| Responsibility | Owner | Implementation | Notes |
|----------------|-------|----------------|-------|
| Order state / lifecycle | **Order aggregate** (`server/order/`) | Command handlers, `orders` table | Core Domain — sole authority |
| Domain event emission | **Order aggregate + outbox** | `DrizzleOutboxRepository` | Transactional outbox |
| Event transport | **Publisher** (`InProcessEventPublisher`) | Transport-only — no business rules | Constitution compliant |
| Consumer dispatch | **OrderEventConsumerRegistry** | Registration + idempotency | One registry |
| Print event reaction | **OrderPrintingConsumer** | Integration consumer | Does not own job state |
| Print dispatch contract | **OrderPrintDispatchPort** | Interface | Extension point for PRINTING-1 |
| Print dispatch execution (today) | **LogOrderPrintDispatchPort** | No-op | Placeholder owner until PRINTING-1 |
| Print ops telemetry | **opsLog** (`server/_core/opsLog`) | `order_print_dispatch_requested` | Observability only |
| Print queue state | **None** | — | RETIRED; future: P-08 / PRINTING-1 |
| Print rendering | **None** | — | RETIRED |
| Print Host / dispatch service | **None** | — | RETIRED |
| Print Agent / device | **None** | — | RETIRED |
| Printer configuration DB | **None** | — | RETIRED (0043) |
| Kitchen telemetry | **OrderKitchenConsumer** | Ops log only | Separate from KDS |
| Read projections (order) | **server/order/read/** | P-01–P-06, P-10, P-11 | ORDERS-READ-MODEL-1 |
| Print read projection (future) | **server/printing/read/** (planned) | P-08 — not implemented | PRINTING-1 |

---

## Retired Ownership (Pre-RESET-1)

| Responsibility | Former owner | Status |
|----------------|--------------|--------|
| Print job persistence | `server/printing/` + `print_jobs` | **RETIRED** |
| Job queue / claiming | Print service + agent | **RETIRED** |
| ESC/POS rendering | Agent / shared printing | **RETIRED** |
| Device routing | Print Host + stations | **RETIRED** |
| Print settings API | tRPC print routers | **RETIRED** |
| Diagnostic runs | Agent + `print_diagnostic_runs` | **RETIRED** |

---

## Target Ownership (Future — ADR-ARCH-012)

| Responsibility | Target owner | Program |
|----------------|--------------|---------|
| Print job creation on events | `OrderPrintingConsumer` + real `OrderPrintDispatchPort` | PRINTING-1 |
| Print queue projection (read) | `PrintingQueueProjectionConsumer` → P-08 | PRINTING-1 |
| Print queue queries | `server/printing/read/` read services | PRINTING-1 / PRINT-WORKSPACE-1 |
| Workspace UI | Client print workspace | PRINT-WORKSPACE-1 |
| Connector / device status | Connector status store + Q-31 | PRINT-CONNECTOR-1 |
| ESC/POS execution | Edge connector (new) | PRINT-CONNECTOR-1 |

---

## Ownership Violations Check

| Rule | Status |
|------|--------|
| Printing owns Order state | **PASS** — consumer reads `getOrderById` for display field only |
| Order aggregate knows printer IDs | **PASS** — no printer fields on order |
| Multiple print dispatch owners | **PASS** — single consumer + port |
| Publisher contains print logic | **PASS** — transport only |
| Duplicate queue owners (DB + projection) | **N/A** — no queue exists |

### Minor coupling note

`OrderPrintingConsumer` calls `getOrderById` on `OrderReady` to resolve `orderNumber`. This is a **read dependency inside the consumer**, not projection ownership. Acceptable per ORDER-EVENTS-1B; PRINTING-1 may replace with envelope payload enrichment.

---

## Registry Layout (Certified)

```
OrderEventConsumerRegistry (ACTIVE)
├── OrderNotificationConsumer     [10]
├── OrderSessionConsumer          [20]
├── OrderKitchenConsumer          [30]
└── OrderPrintingConsumer         [40]

OrderProjectionConsumerRegistry (REGISTERED, dispatch INACTIVE by default)
├── OwnerOrdersProjectionConsumer
├── ActiveOrdersProjectionConsumer
├── ... (P-01–P-06, P-10, P-11)
└── (P-07, P-08 NOT registered)
```

---

## Verdict

Runtime ownership is **clean and singular** for the active stub path. No orphan services or competing dispatchers remain post-RESET-1.
