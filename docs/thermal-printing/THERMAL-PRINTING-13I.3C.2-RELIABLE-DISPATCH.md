# THERMAL-PRINTING-13I.3C.2 — Reliable Dispatch

**Status:** Implemented  
**Date:** 2026-06-22  
**Frozen inputs:** THERMAL-PRINTING-13I.3A, 13I.3B, 13I.3B.5, 13I.3B.6, 13I.3C.1, PRINTING-ADR-13I-002, PRINTING-ADR-13I-003

---

## 1. Executive Summary

THERMAL-PRINTING-13I.3C.2 hardens the **dispatch notification layer** so assigned print jobs are delivered reliably from Print Host to Print Agent. Execution state remains authoritative in the database (13I.3C.1); this phase only addresses **notification delivery**.

The in-memory `notifiedJobIds` Set in `dispatchBridgeState` is replaced with durable `print_jobs.dispatchNotifiedAt`. Pending notifications (`status = assigned`, `dispatchNotifiedAt IS NULL`) are retried automatically on agent reconnect, Print Host restart, and a periodic sweep. Duplicate physical prints are prevented by reusing `assignedAt` as the stable WebSocket timestamp (agent dedupe) plus DB notification persistence.

---

## 2. Dispatch Reliability Architecture

```
Vercel dispatch request
        │
        ▼
executePrintHostDispatch (dispatchBridgeService)
        │
        ├── assignPrintJob → DB status assigned (13I.3C.1)
        │
        └── attemptDispatchNotification (dispatchNotificationService)
                    │
                    ├── hasPersistedDispatchNotification? → skip (idempotent)
                    ├── notifyAgentOfJobId (WebSocket JOB_ASSIGNED)
                    └── recordPersistedDispatchNotification → dispatchNotifiedAt

Recovery paths (dispatchReliabilityService):
  • Agent HELLO → replayPendingDispatchNotificationsForAgent
  • Print Host startup → replayAllPendingDispatchNotifications
  • 15s interval → runDispatchRetrySweep
```

| Concern | Authority |
|---------|-----------|
| Execution state (`queued → assigned → printing → …`) | `printJobExecutionState.ts` (unchanged) |
| Dispatch notification delivered | `print_jobs.dispatchNotifiedAt` |
| WebSocket transport | `assignmentNotifier.ts` (unchanged protocol) |
| Agent-side dedupe | `jobId` + `timestamp` (`assignedAt`) |

---

## 3. Retry Strategy

| Trigger | Mechanism | Interval |
|---------|-----------|----------|
| Agent offline at notify | `attemptDispatchNotification` returns `agent_disconnected`; job stays pending | — |
| Periodic retry | `startDispatchRetryScheduler` → `runDispatchRetrySweep` | 15s (default) |
| Agent reconnect | `replayPendingDispatchNotificationsForAgent` on HELLO | Event-driven |
| Print Host restart | `initializeDispatchReliability` → `replayAllPendingDispatchNotifications` | Startup |

Retry is **automatic**; no operator action required. Sweeps skip work when `DATABASE_URL` is unset (unit tests) or when a sweep is already in flight.

---

## 4. Replay Strategy

**Pending job query** (`listPendingDispatchNotifications`):

- `status = assigned`
- `assignedAgentId IS NOT NULL`
- `dispatchNotifiedAt IS NULL`
- Optional filter by `agentId` (reconnect replay)

On replay:

1. Warm in-memory assignment cache (`warmPrintJobAssignmentCache`) for fetch path — not execution authority.
2. Call `attemptPendingDispatchNotification` with `replayReason` (`agent_reconnect`, `print_host_restart`, `notify_retry`).
3. Log ops events with replay metadata.

Jobs already notified are excluded from the pending list; idempotency for redispatch API calls uses `hasPersistedDispatchNotification`.

---

## 5. Restart Recovery

`initializeDispatchReliability()` is invoked from `printingRuntimeBootstrap` after registry rebuild:

1. `replayAllPendingDispatchNotifications()` — deliver any assigned-but-unnotified jobs.
2. `startDispatchRetryScheduler()` — resume periodic retries.

Dispatch state survives process restart via TiDB; no in-memory state is required for correctness.

**Migration:** `drizzle/0036_print_jobs_dispatch_notification.sql` adds `dispatchNotifiedAt` and index `print_jobs_dispatch_pending (assignedAgentId, dispatchNotifiedAt)`.

---

## 6. Duplicate Protection Validation

| Layer | Mechanism |
|-------|-----------|
| DB | `recordPersistedDispatchNotification` only updates when `dispatchNotifiedAt IS NULL` |
| Dispatch bridge | `executePrintHostDispatch` returns `already_processed` when assignment exists and notification persisted |
| WebSocket | `assignedAt` used as fixed `timestamp` in `JOB_ASSIGNED` — agent dedupes `jobId:timestamp` |
| Replay | Pending list excludes notified jobs; direct re-notify returns `{ duplicate: true }` without sending |

No parallel idempotency system introduced; existing agent protocol dedupe is reused.

**Tests:** reconnect replay, restart recovery, notify retry sweep, duplicate protection via redispatch, repeated reconnects, repeated restart recovery (`dispatchBridge.test.ts`).

---

## 7. Files Modified

| File | Change |
|------|--------|
| `drizzle/schema.ts` | `dispatchNotifiedAt` column |
| `drizzle/0036_print_jobs_dispatch_notification.sql` | Migration |
| `drizzle/meta/_journal.json` | Journal entries 0035, 0036 |
| `server/printing/dispatchNotificationRepository.ts` | **New** — DB persistence |
| `server/printing/dispatchNotificationService.ts` | **New** — notify + persist |
| `server/printing/dispatchReliabilityService.ts` | **New** — replay, retry, startup |
| `server/printing/dispatchBridgeState.ts` | Re-exports DB-backed functions |
| `server/printing/dispatchBridgeService.ts` | Async DB notification path |
| `server/printing/assignmentService.ts` | `warmPrintJobAssignmentCache` |
| `server/printing/agentWebSocketInboundHandler.ts` | HELLO reconnect replay |
| `server/printing/printingRuntimeBootstrap.ts` | Startup recovery + scheduler |
| `server/printing/dispatchBridge.test.ts` | Reliability tests |
| `server/printing/endToEndPrintFlow.test.ts` | Dispatch notification mocks |

---

## 8. Tests Added

| Test suite | Coverage |
|------------|----------|
| `dispatchBridge.test.ts` — `dispatchReliability THERMAL-PRINTING-13I.3C.2` | Reconnect replay, restart recovery, notify retry, duplicate protection, repeated reconnects, repeated restart |
| `dispatchBridge.test.ts` — existing 13H cases | Assign + notify, already_processed, offline retry on reconnect |

**Validation run:**

- `pnpm check` — pass
- `pnpm vitest run server/printing` — 470/471 pass (1 pre-existing failure: `printerProfileNegotiation.test.ts` `arabicRenderingMode` drift, unrelated)

---

## 9. Remaining Risks

| ID | Risk | Severity |
|----|------|----------|
| R1 | Migration `0036` not yet applied to production TiDB | **High** — deploy blocked until applied |
| R2 | TiDB may require split DDL for `ADD COLUMN` + `CREATE INDEX` (as with 0035) | **Medium** |
| R3 | 15s retry interval may delay notify during extended offline periods | **Low** — reconnect replay is immediate |
| R4 | Assignment cache warm on replay is best-effort; cold fetch still resolves from DB | **Low** |
| R5 | Vercel→Print Host dispatch HTTP retry independent of this layer; orphaned HTTP failures still possible | **Medium** — out of 13I.3C.2 scope |
| R6 | No operational telemetry dashboard for pending dispatch backlog | **Low** — deferred to later program |

---

## 10. Final Verdict

**COMPLETE WITH FOLLOW-UP**

Implementation is complete for reliable dispatch within scope. Follow-up: apply migration `0036` to production and deploy Print Host with updated code.
