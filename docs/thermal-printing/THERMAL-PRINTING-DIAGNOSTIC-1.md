# THERMAL-PRINTING-DIAGNOSTIC-1

**Title:** Active Printer Visibility Investigation  
**Status:** Diagnosis complete (no code changes)  
**Date:** 2026-06-22

---

## Executive Summary

**Root cause (primary): Runtime endpoint mismatch — Option A**

The deployment config `agent/config/production.720007.json` points the Windows agent at a **validation-only WebSocket endpoint** (`ws://127.0.0.1:3120/ws/print-agent`). Printer Operations reads **in-memory agent state on the main MineuQR API server** (default dev port `3000`, path `/ws/print-agent`). These are **separate Node.js processes with separate registries**.

Physical printing can succeed on the validation runtime while the dashboard API process has **no registered agent / no live profiles**, so `activePrinters` remains `0` and each printer shows **inactive**.

---

## 1. Runtime Endpoint Investigation

### Configured endpoint

From `agent/config/production.720007.json`:

```json
"serverUrl": "ws://127.0.0.1:3120/ws/print-agent",
"agentId": "mineuqr-agent-720007"
```

### What port 3120 is

| Source | Evidence |
|--------|----------|
| `agent/config/printingE2eValidationOptions.ts` | `DEFAULT_VALIDATION_PORT = 3120` |
| `scripts/validate-printing-e2e.ts` | Builds `ws://127.0.0.1:${port}/ws/print-agent`; spawns a **minimal HTTP server** used only by the E2E validation harness |
| `scripts/validate-printing-e2e.ts` (comments) | Documents `--port` / `PRINT_VALIDATION_PORT` for local WebSocket during validation |

Port **3120 is not the main application server**. It is the dedicated validation harness port.

### What Printer Operations expects

| Source | Evidence |
|--------|----------|
| `server/_core/index.ts` | Main server listens on `PORT` env or **3000** (with port fallback) |
| `server/_core/index.ts` | Calls `attachPrintAgentWebSocketServer(server)` on the **same HTTP server** as the dashboard API |
| `server/printing/printAgentWebSocketServer.ts` | WebSocket path: `/ws/print-agent` |
| `docs/thermal-printing/AGENT-DEPLOYMENT.md` | Production example uses `wss://your-mineuqr-host.example.com/ws/print-agent` |

Expected production/dev URL pattern:

```text
ws(s)://<mineuqr-api-host>:<api-port>/ws/print-agent
```

**Not** `ws://127.0.0.1:3120/ws/print-agent` unless the dashboard is also served from that same validation process (it is not).

### Live runtime evidence (investigation snapshot)

At investigation time on the operator machine:

- `netstat` showed **no listener** on `127.0.0.1:3120` or `127.0.0.1:3000`
- `DATABASE_URL` was not set in the diagnostic shell (could not query live DB printer rows)

**Interpretation:** Either the agent/main server were not running during the snapshot, or the agent was started against a validation server that later exited. In all cases, the **configured URL targets the wrong runtime class** for dashboard visibility.

### HELLO / heartbeat on the correct server

Agent registration path when connected to a server:

```text
WebSocket connect
  → HELLO (agentWebSocketInboundHandler → registerPrintAgent → agentRegistry + endpoint projection)
  → agent.printer.profiles.report (printerProfileStore)
  → HEARTBEAT every heartbeatIntervalMs (30s in config)
```

If the agent connects only to port **3120**, those events populate the **validation harness process**, not the dashboard API process.

---

## 2. Agent Registry State (Architecture)

All printing runtime state queried by Printer Operations is **in-memory per server process** (no persistence across restarts or across processes).

### `agentRegistry`

| Property | Detail |
|----------|--------|
| File | `server/printing/agentRegistry.ts` |
| Storage | `Map<agentId, RegisteredAgent>` |
| Populated by | WebSocket `HELLO`, updated by `HEARTBEAT` |
| Cleared on | Process restart |

Expected entry when healthy on **the dashboard server**:

```text
agentId: mineuqr-agent-720007
registration.connectedAt: <ISO timestamp>
lastHeartbeatAt: <within 5 minutes>
```

### `printerProfileStore`

| Property | Detail |
|----------|--------|
| File | `server/printing/printerProfileStore.ts` |
| Storage | `Map<agentId, AgentPrinterInventoryRecord>` |
| Populated by | `agent.printer.profiles.report` after HELLO |
| Expected profile | `pos-80c-copy-1-usb001` (from config `startupPrinters`) |

### `printerResolutionRegistry` (DB mapping layer)

| Property | Detail |
|----------|--------|
| File | `server/printing/printerResolutionRegistry.ts` |
| Storage | `Map<dbPrinterId, profilePrinterId>` |
| Populated by | `rebuildPrinterResolutionRegistryFromDb()` on API server boot |
| Bootstrap | `server/printing/printingRuntimeBootstrap.ts` via `createApiApp()` |

Maps database `printers.id` → `printers.profileId`. Does **not** know about agents until an agent reports the matching `profilePrinterId`.

### `endpointRegistry`

| Property | Detail |
|----------|--------|
| File | `server/printing/endpointRegistry.ts` |
| Role | 12E projection read-model synced from agent lifecycle |
| Used by Printer Operations UI? | **No** — `printOperationsEndpointCompatibility.ts` states `printOperationsService` remains authoritative for Printer Operations in 12E.3 |

### Expected registry state on dashboard server (healthy)

| Registry | Expected for POS-80C visibility |
|----------|-----------------------------------|
| `agentRegistry` | `mineuqr-agent-720007` registered, fresh heartbeat |
| `printerProfileStore` | Inventory containing `pos-80c-copy-1-usb001` |
| `printerResolutionRegistry` | DB printer row `profileId` = `pos-80c-copy-1-usb001` |
| `endpointRegistry` | Projected endpoint ONLINE (informational; not used for active count today) |

### Actual state on dashboard server (inferred)

Because the agent config targets port **3120**, the dashboard API process likely has:

| Registry | Likely state |
|----------|--------------|
| `agentRegistry` | Empty, or agent absent / stale |
| `printerProfileStore` | Empty for `mineuqr-agent-720007` |
| `printerResolutionRegistry` | DB mappings may exist after boot, but resolution cannot bind to an agent |
| Result | `isActive = false` for all restaurant printers |

---

## 3. Printer Operations Data Source

### UI → API → Service → Registry trace

```text
Dashboard → Printer Operations panel
  client/src/components/dashboard/printing/PrintingOperationsPanel.tsx
    trpc.printOps.getSummary
    trpc.printOps.listPrinters
    trpc.printOps.listAgents
        ↓
  server/printing/printOperationsRouter.ts
    getPrintOperationsSummary(restaurantId)
    listPrinterOverview(restaurantId)
    listAgentOverview(restaurantId)
        ↓
  server/printing/printOperationsService.ts
        ↓
  Data sources:
    - printerRepository.listPrintersForRestaurant (MySQL `printers` table)
    - printerResolutionRegistry + printerResolutionService (in-memory)
    - printerProfileStore / printerProfileQueries (in-memory)
    - agentRegistry + agentLifecycleService (in-memory)
```

### `activePrinters` calculation

From `getPrintOperationsSummary()`:

```typescript
const printerOverviews = await Promise.all(printers.map(buildPrinterOverviewItem));
const activePrinters = printerOverviews.filter((printer) => printer.isActive).length;
```

From `buildPrinterOverviewItem()`:

```typescript
const resolution = getPrinterResolution(printer.id);   // db → profilePrinterId → owning agentId
if (resolution) {
  const profile = getPrinterProfile(resolution.agentId, resolution.profilePrinterId);
  const connectivity = getAgentConnectivityState(resolution.agentId);
  isActive = connectivity?.status === "online";        // strict: not "stale", not undefined
}
```

**All must be true for a printer to count as active:**

1. DB printer row exists for the restaurant
2. `printers.profileId` maps in resolution registry
3. An agent in **this server process** owns that `profilePrinterId` in `printerProfileStore`
4. That agent's connectivity status is exactly **`online`** (heartbeat within 5 minutes)

Reference: `shared/printing/agentHeartbeat.ts` — `DEFAULT_AGENT_STALE_THRESHOLD_MS = 5 * 60 * 1000`

### Agent tab visibility (separate from active count)

`listAgentOverview()` only includes agents whose **reported profile IDs overlap** the restaurant's `printers.profileId` values. If the agent is not registered on the dashboard server, the Agents tab will also be empty even if printing works elsewhere.

---

## 4. Runtime Mismatch Analysis

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **A. Agent connected to local validation runtime only** | **CONFIRMED (primary)** | Config hardcodes port 3120 = validation harness default; registries are process-local; physical print + E2E validation can pass on isolated server |
| B. Connected correctly but query wrong | Unlikely | `printOperationsService` logic is consistent and covered by `printOperations.test.ts`; E2E harness uses same service successfully when agent + server share a process |
| C. UI consuming stale/legacy data | Ruled out | UI uses current `trpc.printOps.*` routes; no legacy endpoint operations wiring in the panel |
| D. Other contributing causes | Possible secondary | See below |

### Secondary contributing causes (if endpoint is corrected)

| Issue | Symptom | Check |
|-------|---------|-------|
| **DB profileId mismatch** | Printer listed but always inactive; resolution fails | `printers.profileId` must equal `pos-80c-copy-1-usb001` per `AGENT-DEPLOYMENT.md` |
| **Stale heartbeat** | Agent visible as `stale`, printer inactive | `isActive` requires `online`, not `stale` |
| **API server restart** | Brief or persistent inactive until agent reconnects to **API** server | Agent must re-HELLO on the process the dashboard uses |
| **Restaurant scope** | Zero printers in UI | Wrong `restaurantId` in dashboard context (expected: `720007` for this config) |

---

## 5. Production Host Review

### `serverUrl = ws://127.0.0.1:3120/ws/print-agent`

| Question | Answer |
|----------|--------|
| Is this expected for production? | **No** |
| Is this a validation-only endpoint? | **Yes** — matches `DEFAULT_VALIDATION_PORT` and `validate-printing-e2e.ts` local server |
| Is this the runtime Printer Operations uses? | **No** — Printer Operations queries the main API server process started via `pnpm dev` / production deployment, not the validation harness |

### Correct alignment model

```text
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  MineuQR API + Dashboard    │         │  E2E Validation Harness      │
│  :3000 (or production host) │         │  :3120 (validate-printing)   │
│  /ws/print-agent            │         │  /ws/print-agent             │
│  agentRegistry (authoritative│         │  separate agentRegistry      │
│   for Printer Operations)   │         │  (discarded when harness ends)│
└──────────────▲──────────────┘         └──────────────▲───────────────┘
               │                                       │
               │  SHOULD connect here                  │  production.720007.json
               │                                       │  currently connects here ✗
        ┌──────┴──────┐
        │ Print Agent │
        │ POS-80C     │
        └─────────────┘
```

---

## 6. Root Cause

**The Windows print agent is configured to register against the E2E validation WebSocket server (`127.0.0.1:3120`), while Printer Operations reads agent connectivity from the main MineuQR API server (`127.0.0.1:3000` or production host). In-memory registries are not shared between these processes.**

Physical printing succeeds because execution is local to the agent (USB spooler) and jobs can be dispatched through whichever server the agent is connected to. Dashboard visibility fails because the UI's API process never receives HELLO, profiles, or heartbeats from the agent.

---

## 7. Evidence Summary

| Evidence | Location |
|----------|----------|
| Agent targets port 3120 | `agent/config/production.720007.json` |
| 3120 = validation port | `agent/config/printingE2eValidationOptions.ts:21` |
| Validation spawns isolated WS server | `scripts/validate-printing-e2e.ts:372-382` |
| Main app WS on API server port | `server/_core/index.ts:29-40` |
| `activePrinters` uses in-memory agent state | `server/printing/printOperationsService.ts:73-89, 169-170` |
| Strict `online` requirement | `server/printing/printOperationsService.ts:88` + `shared/printing/agentHeartbeat.ts:40-49` |
| DB alignment documented | `docs/thermal-printing/AGENT-DEPLOYMENT.md:198-200` |
| E2E harness validates ops on **same** process | `scripts/validate-printing-e2e.ts:498-520` |

---

## 8. Affected Components

| Component | Impact |
|-----------|--------|
| `agent/config/production.720007.json` | Misconfigured `serverUrl` |
| `server/printing/agentRegistry` | Empty/stale on dashboard server |
| `server/printing/printerProfileStore` | No profiles on dashboard server |
| `server/printing/printOperationsService` | Correctly reports inactive (downstream of empty registry) |
| `client/.../PrintingOperationsPanel.tsx` | Displays inactive (correct reflection of service) |
| `server/printing/endpointRegistry` | Not on critical path for current UI |
| Agent USB execution | Unaffected — local transport still works |

---

## 9. Recommended Fix (documentation only — not implemented)

### Primary fix

1. **Point the agent at the same WebSocket host/port as the MineuQR API server** the dashboard uses:
   - Local dev example: `ws://127.0.0.1:3000/ws/print-agent` (confirm actual port from server startup log)
   - Production: `wss://<production-host>/ws/print-agent` per `agent/config/production.example.json`
2. Set via config `serverUrl` or env `PRINT_AGENT_SERVER_URL` (overrides config).
3. **Restart the print agent** after the main server is running.
4. Confirm in dashboard → Printer Operations → **Agents**: `mineuqr-agent-720007` shows `online` with `reportedProfileCount >= 1`.

### Secondary verification

1. Confirm DB row for restaurant `720007` has `printers.profileId = 'pos-80c-copy-1-usb001'` (matches `startupPrinters[].printerId`).
2. After API server boot, confirm log: `[Printing] Rebuilt printer resolution registry (N mapping(s))`.
3. Open printer detail in UI — resolution status should be `resolved` with `agentId: mineuqr-agent-720007`.

### Operator verification commands (suggested)

```powershell
# Confirm which process owns the API port (e.g. 3000)
netstat -ano | findstr "LISTENING" | findstr "3000"

# Confirm agent is NOT only bound to validation port
netstat -ano | findstr "3120"

# Agent should log connection to the API server URL, not 3120
# (watch print-agent stdout after restart)
```

### What not to change (for this issue)

- No Printer Operations query changes required if endpoint alignment is corrected.
- No endpoint registry / 12E migration required for basic active visibility.
- Do not use `production.720007.json` `serverUrl` as-is for dashboard-integrated deployment.

---

## 10. Success Criteria Checklist

| Criterion | Status |
|-----------|--------|
| Root cause identified | ✓ Runtime endpoint mismatch (Option A) |
| Registry state documented | ✓ Architecture + inferred dashboard-server state |
| Runtime path documented | ✓ UI → tRPC → printOperationsService → in-memory registries |
| Active printer calculation traced | ✓ `buildPrinterOverviewItem` + `online` gate |
| Recommended fix documented | ✓ Align `serverUrl` with API server; verify DB profileId |

---

## References

- `docs/thermal-printing/AGENT-DEPLOYMENT.md` — deployment and Printer Operations visibility
- `scripts/validate-printing-e2e.ts` — validation harness using port 3120
- `server/printing/printOperations.test.ts` — expected active printer preconditions
- `docs/thermal-printing/ENDPOINT-REGISTRY-COMPATIBILITY.md` — endpoint registry is not UI-authoritative in 12E.3
