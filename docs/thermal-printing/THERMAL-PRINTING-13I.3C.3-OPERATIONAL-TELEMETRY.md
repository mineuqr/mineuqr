# THERMAL-PRINTING-13I.3C.3 — Operational Telemetry

**Status:** Implemented  
**Date:** 2026-06-22  
**Frozen inputs:** THERMAL-PRINTING-13I.3A–3C.2, PRINTING-ADR-13I-002/003/004

---

## 1. Executive Summary

THERMAL-PRINTING-13I.3C.3 adds **durable operational observability** for print jobs without changing printing behavior, dispatch logic, or execution state authority.

Each print job receives a single immutable `correlationId` at creation. Lifecycle stages emit structured telemetry events into `print_job_telemetry_events`. Existing `opsLog` output is preserved and augmented with `print_telemetry_*` event types mirroring the telemetry taxonomy.

A read-only `printOps.getPrintJobTelemetry` API exposes timeline, current stage, failures, retries, and replays for future Dashboard V2.

---

## 2. Telemetry Architecture

```
Order / createPrintJob
        │
        ├── correlationId assigned (print_jobs.correlationId)
        └── telemetry: job_created

Station routing (auto print)
        └── telemetry: routing_completed

assignPrintJob
        └── telemetry: assignment_completed

requestPrintHostDispatch → executePrintHostDispatch
        ├── telemetry: dispatch_started
        ├── telemetry: dispatch_notified | dispatch_failed
        └── replay/retry via dispatchNotificationService
                └── telemetry: dispatch_replayed | dispatch_retry

fetchAuthoritativePrintJob
        ├── telemetry: agent_fetch
        └── telemetry: execution_started

recordExecutionOutcomeReport
        ├── telemetry: execution_completed | execution_failed
        └── telemetry: final_outcome

delivery ack / confirm
        └── telemetry: delivery_acknowledged | delivery_confirmed

printJobTelemetryRepository ← recordPrintJobTelemetryEvent
printOps.getPrintJobTelemetry ← getPrintJobOperationalTelemetry
```

| Layer | Role |
|-------|------|
| `print_jobs.correlationId` | Immutable lifecycle correlation |
| `print_job_telemetry_events` | Authoritative operational timeline |
| `opsLog` | Backward-compatible console/JSON logging |
| Execution state (`print_jobs.status`) | Unchanged — not telemetry authority |

---

## 3. Correlation Model

| Rule | Implementation |
|------|----------------|
| One ID per job | UUID v4 generated in `createPrintJob`, stored on `print_jobs.correlationId` |
| Immutability | `assignPrintJobCorrelationId` only writes when `correlationId IS NULL` |
| Legacy jobs | `ensurePrintJobCorrelationId` lazy-assigns on first telemetry emit |
| Dispatch binding | `requestPrintHostDispatch` uses job `correlationId` instead of generating a new UUID |
| Cross-process | Same ID passed via `x-correlation-id` / dispatch bridge `correlationId` |

---

## 4. Event Taxonomy

Canonical events (`shared/printing/telemetry.ts`):

| Event | When |
|-------|------|
| `job_created` | Print job inserted |
| `routing_completed` | Station target resolved (auto print) |
| `assignment_completed` | Agent assigned in DB |
| `dispatch_started` | Print Host dispatch received |
| `dispatch_notified` | WebSocket JOB_ASSIGNED persisted |
| `dispatch_retry` | Notify retry sweep (`notify_retry`) |
| `dispatch_replayed` | Reconnect / restart replay |
| `dispatch_failed` | Notify or assignment failure |
| `agent_fetch` | Agent JOB_FETCH succeeded |
| `execution_started` | DB transition to `printing` |
| `execution_completed` | Outcome `executed` |
| `execution_failed` | Outcome failure |
| `delivery_acknowledged` | Agent delivery ack accepted |
| `delivery_confirmed` | Delivery confirmation accepted |
| `final_outcome` | Terminal execution outcome recorded |

Each event includes: `timestamp`, `correlationId`, `printJobId`, `restaurantId`, optional `agentId` / `printerId`, structured `payload`.

---

## 5. Timeline Model

- Events stored in `print_job_telemetry_events` ordered by `createdAt`, `id`.
- `currentStage` = highest-rank event from `PRINT_JOB_TELEMETRY_STAGE_ORDER`.
- `failures` = events with type `dispatch_failed` or `execution_failed`.
- `retries` = `dispatch_retry` events.
- `replays` = `dispatch_replayed` events.

Telemetry recording is **fire-and-forget** — failures do not affect printing paths.

---

## 6. API Surface

**tRPC:** `printOps.getPrintJobTelemetry`

```typescript
input: { restaurantId: number; jobId: number }
output:
  | { found: false }
  | {
      found: true;
      telemetry: PrintJobOperationalTelemetry; // timeline, currentStage, failures, retries, replays
    }
```

Read-only. Tenant-scoped via `assertRestaurantAccess`. No Dashboard V2 UI in this phase.

---

## 7. Files Modified

| File | Change |
|------|--------|
| `shared/printing/telemetry.ts` | **New** — taxonomy + types |
| `drizzle/schema.ts` | `correlationId`, `print_job_telemetry_events` |
| `drizzle/0037_print_job_operational_telemetry.sql` | **New** migration |
| `drizzle/meta/_journal.json` | Journal entry 0037 |
| `server/printing/printJobTelemetryRepository.ts` | **New** |
| `server/printing/printJobCorrelationService.ts` | **New** |
| `server/printing/printJobTelemetryService.ts` | **New** |
| `server/printing/printJobService.ts` | Correlation at creation + `job_created` |
| `server/printing/autoPrintOnOrderCreate.ts` | `routing_completed` |
| `server/printing/assignmentService.ts` | `assignment_completed` |
| `server/printing/dispatchBridgeService.ts` | `dispatch_started`, `dispatch_failed` |
| `server/printing/dispatchNotificationService.ts` | `dispatch_notified/retry/replayed/failed` |
| `server/printing/printHostDispatchClient.ts` | Bind job correlation |
| `server/printing/jobRetrievalService.ts` | `agent_fetch`, `execution_started` |
| `server/printing/executionOutcomeService.ts` | `execution_completed/failed`, `final_outcome` |
| `server/printing/deliveryAckService.ts` | `delivery_acknowledged` |
| `server/printing/deliveryConfirmationFlow.ts` | `delivery_confirmed` |
| `server/printing/printOperationsRouter.ts` | `getPrintJobTelemetry` |
| `server/printing/printJobTypes.ts` | `correlationId` on insert |
| `server/printing/printJobRepository.ts` | Persist `correlationId` |
| Tests updated for `correlationId` + telemetry mocks |

---

## 8. Tests Added

| Suite | Coverage |
|-------|----------|
| `printJobTelemetry.test.ts` | Complete lifecycle timeline, retry/replay separation, execution failure, correlation consistency, lazy legacy correlation, replay reason mapping |

**Validation:**

- `pnpm check` — pass
- `server/printing` — 476/477 pass (1 pre-existing `printerProfileNegotiation` `arabicRenderingMode` drift)

---

## 9. Remaining Risks

| ID | Risk | Severity |
|----|------|----------|
| R1 | Migration `0037` not applied to production TiDB | **High** |
| R2 | TiDB may require split DDL (column + table + index) | **Medium** |
| R3 | Legacy jobs without `correlationId` get lazy UUID on first telemetry | **Low** |
| R4 | Pre-migration jobs have no historical telemetry events | **Medium** |
| R5 | `opsLog` uses dynamic `print_telemetry_*` types not in `opsTaxonomy.ts` | **Low** |
| R6 | Dashboard V2 UI not built — API only | **Low** (by design) |

---

## 10. Final Verdict

**COMPLETE WITH FOLLOW-UP**

Implementation is complete within scope. Follow-up: apply migration `0037` to production and optionally add canonical `OPS_EVENT` entries for `print_telemetry_*` types.
