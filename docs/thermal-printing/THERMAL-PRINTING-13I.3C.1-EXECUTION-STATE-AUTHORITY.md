# THERMAL-PRINTING-13I.3C.1 — Execution State Authority

**Status:** Implemented  
**Date:** 2026-06-22  
**Frozen inputs:** THERMAL-PRINTING-13I.3A, 13I.3B, 13I.3B.5, 13I.3B.6, PRINTING-ADR-13I-002

---

## 1. Executive Summary

THERMAL-PRINTING-13I.3C.1 establishes **one authoritative execution truth** for print jobs: the **database**. Every agent-runtime execution transition now persists immediately through `transitionPrintJobExecutionState()`.

Before this phase, agent-executed jobs remained `queued` in TiDB while operational status was derived from ephemeral Print Host memory (assignments, delivery, outcomes). That split is removed for **execution state**. The dashboard `operationalStatus` and `assignedAgentId` are projections of `print_jobs.status` and `print_jobs.assignedAgentId`.

Runtime in-memory structures (assignment cache, delivery ack, execution outcome store) remain for protocol and performance but **do not define execution state**.

---

## 2. Execution State Machine

### Agent-runtime lifecycle (authoritative)

```
queued → assigned → printing → printed
                              ↘ failed
```

### Legacy dormant worker (unchanged)

```
queued → claimed → printing → printed | failed
```

### Transition triggers

| Transition | Runtime event | Module |
|------------|---------------|--------|
| `queued → assigned` | `assignPrintJob` after routing | `assignmentService.ts` |
| `assigned → printing` | Agent `JOB_FETCH_REQUEST` (execution start) | `jobRetrievalService.ts` |
| `printing → printed` | Execution outcome `executed` | `executionOutcomeService.ts` |
| `printing → failed` | Outcome `failed`, `prepared`, `transport-not-implemented` | `executionOutcomeService.ts` |

Delivery ack/confirm are **not** execution state transitions (protocol layer only).

---

## 3. Database Transition Model

### Schema (`drizzle/0035_print_jobs_execution_state.sql`)

- New status: `assigned`
- New columns: `assignedAgentId` (varchar 128), `assignedAt` (timestamp)

### Authority module

`server/printing/printJobExecutionState.ts` — single entry point:

- `PRINT_JOB_EXECUTION_TRANSITION`: `assign`, `start_execution`, `complete_success`, `complete_failure`
- Idempotent: duplicate transition returns `{ duplicate: true }` without re-writing
- Illegal transitions return `{ rejected: true, reason }`
- Each applied transition records `print_job_attempts` with `STATUS_TRANSITION` event

### Legal transitions (`printJobTransitions.ts`)

| From | To |
|------|-----|
| `queued` | `assigned`, `claimed` |
| `assigned` | `printing` |
| `claimed` | `printing` |
| `printing` | `printed`, `failed` |
| Terminal | none |

---

## 4. Runtime Alignment

| Runtime stage | DB transition | Notes |
|---------------|---------------|-------|
| Job creation | → `queued` | Unchanged (`insertPrintJob`) |
| Dispatch assignment | → `assigned` | Persists `assignedAgentId` |
| Agent job fetch | → `printing` | Idempotent re-fetch |
| Execution outcome | → `printed` or `failed` | Based on outcome status |
| Delivery ack | none | Protocol only |
| Delivery confirm | none | Protocol only |

`resolvePrintJobAssignment()` reconstructs assignment from DB when in-memory cache is cold (e.g. after process restart) without making memory authoritative.

---

## 5. Dashboard Alignment

`printOperationsService.ts`:

- `mapOperationalStatusFromDb()` — derives status **only** from `print_jobs.status`
- `buildPrintJobQueueItem()` — uses `job.assignedAgentId` from DB
- `getPrintJobDetail()` — assignment block from DB columns
- `listPrintFailures()` — DB `failed` jobs only (removed in-memory outcome merge)

| DB status | Operational status |
|-----------|-------------------|
| `queued` | `queued` |
| `assigned`, `claimed` | `assigned` |
| `printing` | `executing` |
| `printed` | `delivered` |
| `failed` | `failed` |

---

## 6. Transition Validation

Covered by:

- `printJobTransitions.test.ts` — legal/illegal transition matrix
- `printJobExecutionState.test.ts` — assign, start, complete, idempotency, rejection
- Updated integration tests: `endToEndPrintFlow`, `executionOutcomeReporting`, `dispatchBridge`, `assignmentService`, `printOperations`

---

## 7. Files Modified

| File | Change |
|------|--------|
| `shared/printing/types.ts` | `ASSIGNED` status |
| `drizzle/schema.ts` | `assigned` enum, `assignedAgentId`, `assignedAt` |
| `drizzle/0035_print_jobs_execution_state.sql` | Migration |
| `server/printing/printJobTransitions.ts` | Full lifecycle rules |
| `server/printing/printJobRepository.ts` | `markJobAssigned`, `markJobPrinting` from `assigned` |
| `server/printing/printJobExecutionState.ts` | **New** authority module |
| `server/printing/assignmentService.ts` | DB assign + `resolvePrintJobAssignment` |
| `server/printing/jobRetrievalService.ts` | Start execution on fetch |
| `server/printing/executionOutcomeService.ts` | Terminal transitions on outcome |
| `server/printing/printOperationsService.ts` | DB-only operational projection |
| `server/printing/deliveryAckService.ts` | `resolvePrintJobAssignment` |
| `server/printing/deliveryConfirmationService.ts` | `resolvePrintJobAssignment` |
| `server/printing/deliveryConfirmationFlow.ts` | `resolvePrintJobAssignment` |
| `server/printing/jobStatusService.ts` | `resolvePrintJobAssignment` |
| Test files | Execution state mocks + expectations |

---

## 8. Tests Added

| File | Tests |
|------|-------|
| `printJobExecutionState.test.ts` | 9 (new) |
| `printJobTransitions.test.ts` | 7 (rewritten for 13I.3C.1) |

---

## 9. Remaining Risks

| ID | Risk | Severity |
|----|------|----------|
| R1 | Dispatch notification tracking still ephemeral (`dispatchBridgeState`) — restart may re-notify; duplicate print risk deferred to 13I.3C.2+ | **High** |
| R2 | No dispatch retry on `agent_disconnected` — jobs stay `assigned` without agent notify | **High** |
| R3 | Execution outcome must arrive after fetch (`printing`); out-of-order agent messages rejected | **Medium** |
| R4 | `cancelled` / `expired` statuses still have no writers | **Low** |
| R5 | Legacy `claimed` path retained for dormant worker only | **Low** |
| R6 | Delivery confirm still in-memory — not execution state but may confuse operators | **Medium** |

---

## 10. Final Verdict

### **COMPLETE WITH FOLLOW-UP**

Execution state authority is implemented: DB is the durable source of truth for `queued → assigned → printing → printed | failed`. Dashboard reads DB only for execution status.

Follow-up belongs to later 13I.3C phases (dispatch persistence, retry, reconnect replay) — explicitly out of scope for 13I.3C.1.
