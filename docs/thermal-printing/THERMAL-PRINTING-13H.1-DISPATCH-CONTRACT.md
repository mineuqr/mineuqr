# THERMAL-PRINTING-13H.1 — Dispatch Bridge Contract

**Status:** Production contract (13H.1–13H.6)  
**Problem addressed:** Vercel creates `print_jobs` but cannot assign/notify because `agentRegistry` and WebSocket connections live on Print Host only (see 13G.8A).

---

## Architecture summary

```text
Vercel (order.create)
  → createPrintJob()                    [TiDB: status = queued]
  → requestPrintHostDispatch(jobId)     [HTTP tRPC, authenticated]

Print Host (print.mineuqr.com)
  → dispatchBridge.dispatchJob          [API key auth]
  → executePrintHostDispatch()
       → assignPrintJob()               [in-memory, same process as agentRegistry]
       → notifyAgentOfAssignment()      [WebSocket JOB_ASSIGNED]

Print Agent
  → JOB_ASSIGNED → fetch → execute → ack
```

Vercel **never** calls `assignPrintJob()` or `notifyAgentOfAssignment()` directly in the auto-print path. Colocated dev fallback (no bridge env) still uses local dispatch for `pnpm dev` + agent on the same process.

---

## Endpoint specification

| Property | Value |
|----------|-------|
| **Surface** | tRPC mutation |
| **Procedure** | `dispatchBridge.dispatchJob` |
| **URL** | `POST {PRINT_HOST_DISPATCH_URL}/api/trpc/dispatchBridge.dispatchJob` |
| **Host** | Print Host only (`mineuqr-print-host` on Fly.io) |

### Request format

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `content-type` | Yes | `application/json` |
| `x-print-host-api-key` | Yes (production) | Shared secret (`PRINT_HOST_API_KEY`) |
| `x-correlation-id` | Recommended | End-to-end trace id (8–128 chars, `[a-zA-Z0-9._-]`) |

**Body** (tRPC + superjson)

```json
{
  "json": {
    "jobId": 4080001
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobId` | `number` | Yes | Positive integer `print_jobs.id` |

### Response format

**Success** (`200`)

```json
{
  "result": {
    "data": {
      "json": {
        "status": "dispatched",
        "jobId": 4080001,
        "restaurantId": 720007,
        "printerId": 1,
        "profileId": "pos-80c-copy-1-usb001",
        "agentId": "mineuqr-agent-720007",
        "assignmentCreated": true,
        "notified": true
      }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"dispatched" \| "already_processed" \| "failed"` | Dispatch outcome |
| `jobId` | `number` | Echo of request |
| `restaurantId` | `number?` | From `print_jobs` |
| `printerId` | `number?` | From `print_jobs` |
| `profileId` | `string?` | From `printers.profileId` |
| `agentId` | `string?` | Routed agent |
| `assignmentCreated` | `boolean` | `true` if new in-memory assignment |
| `notified` | `boolean` | `true` if `JOB_ASSIGNED` sent |
| `notificationSkippedReason` | `"agent_disconnected"?` | Agent offline at notify time |
| `failureReason` | `string?` | Present when `status = "failed"` |

**Auth failure** (`401`)

```json
{
  "error": {
    "json": {
      "message": "Invalid dispatch credentials",
      "code": -32001
    }
  }
}
```

---

## Authentication design

| Env var | Set on | Purpose |
|---------|--------|---------|
| `PRINT_HOST_API_KEY` | **Vercel** and **Print Host** | Shared secret (same value both sides) |
| `PRINT_HOST_DISPATCH_URL` | **Vercel** | Base URL, e.g. `https://print.mineuqr.com` |
| `PRINT_HOST_PUBLIC_URL` | Print Host | Fallback for dispatch URL if `PRINT_HOST_DISPATCH_URL` unset on Vercel |

**Rules**

- Anonymous requests → `401` + `dispatch_auth_rejected` (`missing_api_key` / `invalid_api_key`)
- Print Host production without `PRINT_HOST_API_KEY` → dispatch rejected (`server_misconfigured`)
- Key comparison uses SHA-256 + `timingSafeEqual` (not plain string compare)
- Development: if bridge env is unset, Vercel falls back to colocated `dispatchAssignedPrintJob` (non-production only)

---

## Idempotency design

Dispatch is safe to retry.

| State | Behavior |
|-------|----------|
| No assignment, notification not sent | Full assign + notify |
| Assignment exists, notification **not** yet sent (e.g. agent was offline) | Reuse assignment, **retry** notify |
| Assignment exists, notification **already sent** | Return `status: "already_processed"`, no duplicate `JOB_ASSIGNED` |

Implementation:

- Assignment idempotency: `assignmentService` Map (existing 7A.1)
- Notification idempotency: `dispatchBridgeState` tracks successfully notified `jobId`s (Print Host in-memory)

**Note:** In-memory idempotency resets on Print Host restart. A restart after successful notify but before agent fetch may re-notify; agents must tolerate duplicate `JOB_ASSIGNED` (existing protocol expectation).

---

## Retry behavior

| Caller | Retry policy |
|--------|----------------|
| **Vercel** (`requestPrintHostDispatch`) | Single attempt per `order.create`; logs `dispatch_bridge_failed` on error. Does **not** throw to `order.create`. |
| **Operator / future worker** | May retry `dispatchBridge.dispatchJob` for `failed` or `notificationSkippedReason: agent_disconnected` |
| **Print Host** | No queue poller in 13H (bridge only) |

Recommended operator retry: re-POST same `jobId` after agent reconnects; idempotency prevents duplicate notifications when already delivered.

---

## Failure semantics

| `status` | `failureReason` / notes | `print_jobs` DB | Agent notified |
|----------|-------------------------|-----------------|----------------|
| `dispatched` | — | Unchanged (`queued`) | Yes (or skipped with reason) |
| `already_processed` | — | Unchanged | No (idempotent) |
| `failed` | `print_job_not_found`, routing errors, etc. | Unchanged | No |
| Bridge HTTP error | `dispatch_bridge_not_configured`, `dispatch_bridge_unreachable` | Unchanged | No |

Assignment and notification failures do **not** roll back the `print_jobs` row. Job remains `queued` until the agent execution path updates status.

---

## Telemetry events

All events use category `ORDER` and include `correlationId` when available.

| Event | Emitter | When |
|-------|---------|------|
| `dispatch_requested` | Vercel | Before HTTP call |
| `dispatch_received` | Print Host | Endpoint entry |
| `dispatch_assignment_started` | Print Host | After job + printer load |
| `dispatch_assignment_completed` | Print Host | After assign (or already_processed short-circuit) |
| `dispatch_notification_sent` | Print Host | WebSocket send succeeded |
| `dispatch_notification_failed` | Print Host | Agent disconnected at notify |
| `dispatch_auth_rejected` | Print Host | Invalid/missing API key |
| `dispatch_bridge_failed` | Vercel or Print Host | HTTP/config/job errors |

Metadata fields: `jobId`, `restaurantId`, `printerId`, `agentId`, `correlationId`, `reason` (on failures).

Legacy events still emitted: `print_job_assigned`, `print_job_assignment_reused`, `print_agent_job_notified`, `print_agent_job_notification_skipped`.

---

## Deployment requirements

### Vercel (mineuqr.com)

```bash
PRINT_HOST_DISPATCH_URL=https://print.mineuqr.com
PRINT_HOST_API_KEY=<strong-random-secret>
```

### Fly.io (mineuqr-print-host)

```bash
fly secrets set -a mineuqr-print-host \
  PRINT_HOST_API_KEY=<same-secret-as-vercel> \
  PRINT_HOST_PUBLIC_URL=https://print.mineuqr.com
```

Existing secrets unchanged: `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`.

### Agent (Windows POS)

No change. Agent continues `wss://print.mineuqr.com/ws/print-agent`.

---

## Validation plan

1. **Unit tests**
   ```bash
   pnpm vitest run server/printing/dispatchBridge.test.ts server/printing/printHostDispatchAuth.test.ts server/printing/autoPrintOnOrderCreate.test.ts
   ```

2. **Print Host smoke** (with agent online)
   ```bash
   curl -sS -X POST "https://print.mineuqr.com/api/trpc/dispatchBridge.dispatchJob" \
     -H "content-type: application/json" \
     -H "x-print-host-api-key: $PRINT_HOST_API_KEY" \
     -H "x-correlation-id: manual-dispatch-4080001" \
     -d '{"json":{"jobId":<QUEUED_JOB_ID>}}'
   ```
   Expect: `status: "dispatched"`, `notified: true`, agent receives `JOB_ASSIGNED`.

3. **Idempotency**
   - Repeat same request → `status: "already_processed"`, agent receives no second message.

4. **Auth**
   - Omit API key → `401`, `dispatch_auth_rejected` in Print Host logs.

5. **End-to-end order**
   - Place order on mineuqr.com for restaurant `720007`
   - Vercel logs: `dispatch_requested` → Print Host logs: `dispatch_received`, `dispatch_notification_sent`
   - Agent prints ticket

6. **Dashboard**
   - `printOps.listPrintJobs` on Print Host shows operational status `assigned` (not stuck `queued`)

---

## Code map

| File | Role |
|------|------|
| `server/printing/printHostDispatchClient.ts` | Vercel → Print Host client |
| `server/printing/dispatchBridgeService.ts` | Assign + notify on Print Host |
| `server/printing/dispatchBridgeRouter.ts` | tRPC `dispatchBridge.dispatchJob` |
| `server/printing/printHostDispatchAuth.ts` | API key validation |
| `server/printing/dispatchBridgeState.ts` | Notification idempotency |
| `server/printing/autoPrintOnOrderCreate.ts` | Uses bridge after `createPrintJob` |
| `server/print-host/printHostRouter.ts` | Mounts `dispatchBridge` router |

---

## Out of scope (13H)

- Queue workers / polling `print_jobs`
- `printProcessorWorker` revival
- Multi-tenant registry isolation (13G.2 policy still applies)
- Persisting assignments to TiDB
