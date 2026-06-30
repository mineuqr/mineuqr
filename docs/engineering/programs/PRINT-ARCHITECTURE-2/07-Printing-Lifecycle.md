# PRINT-ARCHITECTURE-2 — Printing Lifecycle

**Date:** 2026-06-30

---

## AD-3: Who owns printer selection?

**Decision: Cloud Printer Management owns configured printer selection; RLC validates at execution.**

| Concern | Owner |
|---------|-------|
| Which printer is restaurant default | Cloud `restaurant_printers.isDefault` |
| Connector runtime selection sync | Cloud provisions → RLC selection store (local) on execute |
| Operator picker UI | Cloud Workspace / Management |
| Physical printer availability | RLC live status |

---

## End-to-End Print Lifecycle (Distributed)

```
Order Domain Event (OrderCreated / OrderReady)
    ↓
OrderPrintingConsumer (unchanged)
    ↓
PrintingService.createJob / dispatch (unchanged — cloud SSOT)
    ↓
PrintConnectorPort.submit() — cloud adapter (unchanged interface)
    ↓
Connector Gateway → ExecutePrint command → RLC
    ↓
PrintConnectorRuntime.print() on RLC (unchanged API)
    ↓
DeploymentRuntime → PlatformAdapter → Transport → OS
    ↓
PrintExecutionResult → Gateway → Printing Service callback (unchanged)
    ↓
Operational events + Workspace read models
```

---

## Reprint

Same path. `printJobId` / idempotency rules remain in Printing Service. RLC receives explicit reprint command with correlation to original job.

---

## Test Print

Management / Workspace test print:

- Cloud `PrinterManagementService.testPrint()` or workspace command
- Routes through gateway to RLC (not Printing Service job lifecycle when `printJobId: 0` — existing UX pattern)

---

## Immutable

- Order aggregate mutation rules
- Print job state machine in Printing Service
- `PrintPayload` schema
- Workspace operational scope

---

## AD-14: PrintConnectorPort validity across deployment targets

| Target | `PrintConnectorPort` implementation | Executes on |
|--------|--------------------------------------|-------------|
| `embedded` | In-process adapter | API host (dev) |
| `local_desktop` | Remote gateway adapter | RLC |
| `android` | Remote gateway adapter | RLC |
| `edge` | Remote gateway adapter | RLC |

**Business code sees one port.** Composition root selects adapter implementation by deployment policy — not by branching in Printing Service.
