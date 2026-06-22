# THERMAL-PRINTING-12E.1 — Production Agent Host

**Status:** Architecture & rollout planning (no implementation)  
**Priority:** Critical  
**Date:** 2026-06-22  
**Prerequisite:** [THERMAL-PRINTING-DIAGNOSTIC-1](./THERMAL-PRINTING-DIAGNOSTIC-1.md)

---

## Program Summary

Diagnostics confirmed that Printer Operations shows **inactive printers** because the Windows agent registers against the **E2E validation runtime** (`ws://127.0.0.1:3120`) while **mineuqr.com** serves the dashboard API from **Vercel serverless**, which has a **separate, empty in-memory agent registry**.

This document defines the first **production-grade Agent Host** architecture: where print agents connect, how that runtime relates to the dashboard, how to deploy it, and how to roll it out.

**Constraints honored:** No deployment, no infrastructure purchase, no agent migration, no production config changes in this phase.

---

## Root Cause (Recap)

| Layer | Validation runtime (`:3120`) | Dashboard runtime (Vercel / dev `:3000`) |
|-------|---------------------------|------------------------------------------|
| Process | E2E harness or misconfigured agent | `mineuqr.com` API (`createApp.production`) |
| WebSocket `/ws/print-agent` | Yes (when harness runs) | **No on Vercel**; yes on long-running Node only |
| `agentRegistry` | Populated when agent connects | Empty unless same process receives HELLO |
| Printer Operations `activePrinters` | Would read local registry (harness only) | Reads Vercel process → **0 active** |

Physical printing works on the validation path because USB execution is **local to the agent**. Visibility fails because **registry state is process-local and not shared**.

---

# 12E.1A — Production Runtime Audit

## Current deployment topology

```text
┌─────────────────────────────────────────────────────────────────┐
│  mineuqr.com (Vercel)                                           │
│  vercel.json → api/index.ts → dist/vercel-api.mjs               │
│  createApp.production.ts → createApiApp()                       │
│  • Express API + tRPC (/api/trpc)                               │
│  • Static SPA (dist/public)                                     │
│  • MySQL via DATABASE_URL                                       │
│  • NO WebSocket upgrade                                         │
│  • NO attachPrintAgentWebSocketServer()                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Local long-running Node (pnpm dev / pnpm start)                │
│  server/_core/index.ts                                          │
│  • createServer(app) + attachPrintAgentWebSocketServer(server)  │
│  • Full tRPC + WebSocket on same process                        │
│  • In-memory printing registries live here                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  E2E validation harness (scripts/validate-printing-e2e.ts)      │
│  • Minimal HTTP server on port 3120 (default)                   │
│  • attachPrintAgentWebSocketServer() only                       │
│  • Ephemeral; not dashboard-integrated                          │
└─────────────────────────────────────────────────────────────────┘
```

## Vercel deployment

| Item | Detail |
|------|--------|
| Config | `vercel.json` — build `pnpm build`, output `dist/public`, serverless `api/index.ts` |
| API bundle | `esbuild` → `dist/vercel-api.mjs` via `scripts/vercel-handler.ts` |
| Entry | `createApp.production.ts` re-exports `createApiApp` only |
| `VERCEL` env | `server/_core/index.ts` skips `startServer()` when `process.env.VERCEL` is set |
| WebSocket | **Not supported** for print agents on Vercel serverless |

## API entrypoints

| Entry | Role | Print agent WS |
|-------|------|----------------|
| `api/index.ts` | Vercel serverless handler | No |
| `server/_core/index.ts` | Local/production Node HTTP server | **Yes** (`attachPrintAgentWebSocketServer`) |
| `scripts/validate-printing-e2e.ts` | Validation-only host | Yes (isolated) |

## WebSocket implementation

| Component | Path | Responsibility |
|-----------|------|----------------|
| `printAgentWebSocketServer.ts` | `/ws/print-agent` | HTTP `upgrade` → `ws` server (`noServer: true`) |
| `agentWebSocketInboundHandler.ts` | — | HELLO, HEARTBEAT, profiles, jobs, outcomes |
| `agentConnectionManager.ts` | — | Live socket per `agentId` (required for dispatch) |
| `assignmentNotifier.ts` | — | Push jobs to connected agent; fails if `agent_disconnected` |

**Inbound agent lifecycle (on long-running host only):**

```text
WebSocket connect
  → HELLO → registerPrintAgent() → agentRegistry + endpoint projection
  → agent.printer.profiles.report → printerProfileStore
  → agent.platform.capabilities.report → platformCapabilityStore
  → HEARTBEAT (every ~30s) → agentRegistry.lastHeartbeatAt
  → Job push / fetch / delivery / outcome (requires live connection)
```

## Long-running process assumptions

The following **require a persistent Node process** (cannot run correctly on stateless Vercel invocations):

| Store / service | File | Why persistent |
|-----------------|------|----------------|
| `agentRegistry` | `agentRegistry.ts` | HELLO / heartbeat state |
| `agentConnectionManager` | `agentConnectionManager.ts` | Open WebSocket for job push |
| `printerProfileStore` | `printerProfileStore.ts` | Reported printer inventory |
| `platformCapabilityStore` | `platformCapabilityStore.ts` | Negotiated capabilities |
| `endpointRegistry` | `endpointRegistry.ts` | 12E projection (in-memory) |
| `assignmentService` | `assignmentService.ts` | In-memory job assignments |
| `routingEngine` | `routingEngine.ts` | In-memory routing decisions |
| `pendingRequestRegistry` | `pendingRequestRegistry.ts` | In-flight agent RPC |
| `deliveryStateTracker` | `deliveryStateTracker.ts` | Delivery state |
| `executionOutcomeStore` | `executionOutcomeStore.ts` | Runtime outcomes (partial; DB for jobs) |

**MySQL-backed (works on Vercel):** `printers`, `print_jobs`, orders, restaurants — via `printerRepository`, `printJobRepository`.

**Resolution registry:** Rebuilt from DB on API boot (`printingRuntimeBootstrap.ts`), but **agent ownership** still requires live `agentRegistry` + `printerProfileStore` on the **same process** that receives agent traffic.

## What cannot run on Vercel serverless

| Capability | Reason |
|------------|--------|
| Persistent WebSocket `/ws/print-agent` | No long-lived connection / upgrade on serverless |
| Agent registration visibility | In-memory registry per cold start |
| Job dispatch to agent | Requires `getConnection(agentId)` on dispatch process |
| Printer Operations `activePrinters` | `printOperationsService` reads in-memory connectivity on **invoking process** |
| E2E validation port 3120 | Wrong target for production; not shared with dashboard |

## Audit conclusion

Production today is **split-brain**:

- **Dashboard + tRPC** → Vercel (stateless, no agents).
- **Agent protocol** → implemented only in codebase paths used by long-running Node, currently mispointed to validation port `3120` in `production.720007.json`.

A **production Agent Host** must be a **always-on Node service** that holds WebSocket connections and printing runtime state. **Additionally**, because Printer Operations is invoked via tRPC on Vercel today, a **connectivity bridge** is required (see §12E.1D) — deploying WebSocket alone on a separate host without bridging will **not** fix dashboard visibility.

---

# 12E.1B — Agent Host Architecture

## Target topology

```text
                    ┌──────────────────────────────────────┐
                    │  mineuqr.com (Vercel)                │
                    │  • SPA dashboard                     │
                    │  • tRPC (orders, menu, billing, …)   │
                    │  • MySQL                             │
                    └──────────────┬───────────────────────┘
                                   │
              printOps reads       │  (bridge required — see 12E.1D)
              ─────────────────────┼──────────────────────────────
                                   ▼
┌──────────────┐    wss://print.mineuqr.com/ws/print-agent    ┌─────────────────────────┐
│ Windows      │ ──────────────────────────────────────────► │ Production Agent Host   │
│ Agent        │    HELLO · profiles · heartbeat · jobs      │ (long-running Node)     │
│ (future:     │                                               │                         │
│  Android/iOS)│                                               │ • WebSocket server      │
└──────────────┘                                               │ • agentRegistry         │
                                                               │ • printerProfileStore   │
                                                               │ • dispatch / delivery   │
                                                               │ • printOps API (bridge) │
                                                               └───────────┬─────────────┘
                                                                           │
                                                                           ▼
                                                               ┌─────────────────────────┐
                                                               │ MySQL (shared)          │
                                                               │ printers.profileId      │
                                                               │ print_jobs              │
                                                               └─────────────────────────┘
```

## Agent Host responsibilities

| Responsibility | Module(s) |
|----------------|-----------|
| Accept persistent WebSocket | `printAgentWebSocketServer.ts` |
| Register agents | `agentLifecycleService` → `agentRegistry` |
| Store printer profiles | `printerProfileNegotiationFlow` → `printerProfileStore` |
| Endpoint projection (12E) | `endpointProjectionService` → `endpointRegistry` |
| Resolve printers to agents | `printerResolutionService` + live profile ownership |
| Route, assign, dispatch jobs | `routingEngine`, `assignmentService`, `assignmentNotifier` |
| Serve Printer Operations reads | `printOperationsService` **(must execute on this host or via DB projection)** |
| Physical print path | Agent-side USB/spooler (unchanged) |

## Multi-platform endpoint support (future-ready)

| Platform | Agent type | Endpoint type (12E) | Connection |
|----------|------------|---------------------|------------|
| Windows | `scripts/print-agent.ts` | `WINDOWS_AGENT` | WebSocket today |
| Android | Future runtime | `ANDROID_RUNTIME` | WebSocket (same path) |
| iOS | Future runtime | `IOS_RUNTIME` | WebSocket (same path) |
| LAN / vendor | Future | `LAN_PRINTER`, `VENDOR_CONNECTOR` | Separate registration (12E+) |

The Agent Host is **platform-neutral at the WebSocket layer**: `HELLO` carries `platform`; handlers already branch on `windows` / `android` / `ios` in shared contracts.

## Security boundaries (production)

| Control | Recommendation |
|---------|----------------|
| Transport | `wss://` only in production (TLS termination at host or edge) |
| Authentication | Agent identity via `agentId` + future token (not in 12E.1 scope) |
| Network | Restrict Agent Host admin ports; public only 443/WSS |
| Tenant isolation | Restaurant scoping via DB `printers.profileId` + agent id convention (`mineuqr-agent-{restaurantId}`) |

---

# 12E.1C — Deployment Recommendation

## Option comparison

| Criterion | A. VPS | B. Docker host | C. Railway | D. Fly.io | E. Render |
|-----------|--------|----------------|------------|-----------|-----------|
| **WebSocket** | Yes (configure nginx/Caddy) | Yes | Yes (web service) | Yes (native) | Yes (web service) |
| **Long-running process** | Yes | Yes | Yes | Yes (Machines) | Yes |
| **Operational complexity** | High (OS, TLS, updates) | Medium–High | Low | Low–Medium | Low |
| **Estimated cost** | $6–40/mo | Host-dependent | $5–25/mo | $5–20/mo | $7–25/mo |
| **Reliability** | Good (you operate) | Good | Good | Good (auto-restart) | Good |
| **Fit with Vercel split** | Good (separate subdomain) | Good | Good | **Excellent** | Good |
| **EU region (TiDB eu-central)** | Choose EU DC | Choose EU DC | EU available | **FRA/AMS regions** | EU available |

## Primary recommendation: **Fly.io**

**Why Fly.io for MineuQR Agent Host:**

1. **Native WebSocket + long-running Machines** — matches `attachPrintAgentWebSocketServer` without platform hacks.
2. **Subdomain model** — `print.mineuqr.com` points to Fly app; `mineuqr.com` stays on Vercel.
3. **Low ops** — GitHub deploy, health checks, auto-restart; suitable for early SaaS.
4. **EU regions** — aligns with existing TiDB `eu-central` footprint.
5. **Dockerfile path** — same image can run locally, staging, and production.

## Secondary recommendation: **Railway**

Choose Railway if the team prefers the simplest Git-push deploy UX and managed TLS with minimal Fly-specific configuration. Functionally equivalent for a single always-on web service.

## Not recommended as primary

| Option | Reason |
|--------|--------|
| **Vercel** | Cannot host print agent WebSockets or in-memory dispatch |
| **Raw VPS** | Higher ops burden unless team already operates VPS fleet |
| **Validation port 3120** | Development/E2E only |

## Suggested production hostname

```text
wss://print.mineuqr.com/ws/print-agent
```

TLS terminated at Fly/Railway edge; origin runs `node dist/index.js` (or dedicated print entrypoint in a later refactor).

---

# 12E.1D — Runtime Separation Strategy

## Options

### Option 1 — Monolithic Node runtime

Single long-running Node replaces Vercel for **all** API + WebSocket + optional SPA.

| Pros | Cons |
|------|------|
| One registry; Printer Operations works without bridge | Migrates entire API off Vercel |
| Simplest mental model | Loses Vercel DX for main SaaS |
| `pnpm start` already supports this | Larger blast radius on deploy |

### Option 2 — Dedicated Print Runtime (recommended)

Vercel remains dashboard + general tRPC; **Agent Host** runs printing stack.

| Pros | Cons |
|------|------|
| Keeps Vercel for SPA and stateless API | Requires **connectivity bridge** for Printer Operations on Vercel |
| Isolated scaling and deploy for print | Two deployments to operate |
| Matches 12E endpoint architecture direction | Job creation on Vercel must reach print host for dispatch |

## Recommendation: **Option 2 — Dedicated Print Runtime**

**Rationale:**

- Production is already on **Vercel** (`vercel.json`, `createApp.production.ts`).
- Printing is **connection-oriented**; general SaaS API is **request/response**.
- 12E endpoint registry anticipates **multi-endpoint** growth without moving the whole API.
- Operational isolation: agent reconnect storms do not affect menu/order API cold starts.

## Required bridge (critical — not optional)

Deploying WebSocket on `print.mineuqr.com` **alone** does not fix Printer Operations on `mineuqr.com` until one of:

| Bridge | Description | Effort | 12E.1 rollout fit |
|--------|-------------|--------|-------------------|
| **B1 — Colocated printOps on Agent Host** | Dashboard `printOps.*` tRPC calls `print.mineuqr.com/api/trpc` | Medium (client/env routing) | **Fastest for 12E.1** |
| **B2 — Reverse proxy** | Vercel rewrites `printOps` paths to Agent Host | Medium (infra) | Possible |
| **B3 — DB-backed connectivity read model** | Persist agent heartbeat + profiles; Vercel reads MySQL | Higher (12E.2+) | Best long-term |
| **B4 — Monolith** | Move all API to Agent Host | High | Option 1 |

**12E.1 rollout should plan for B1 immediately**, with **B3** as the strategic follow-up so print visibility survives host restarts and multi-instance scale.

## Runtime strategy diagram

```text
Phase 12E.1 (now)                Phase 12E.2+ (future)
─────────────────────           ─────────────────────────
Vercel: general tRPC            Vercel: general tRPC
Agent Host: WS + dispatch       Agent Host: WS + dispatch
Agent Host: printOps (B1)       MySQL: connectivity projection (B3)
Agents → print.mineuqr.com      Dashboard reads DB or single printOps URL
```

---

# 12E.1E — Production Configuration Model

## Principles

1. **No hardcoded localhost** in production agent configs.
2. **Environment overrides** win over JSON file values.
3. **Same URL shape** across dev, staging, production — only host/scheme change.

## Agent-side variables

| Variable | Purpose | Example (production) |
|----------|---------|----------------------|
| `PRINT_AGENT_CONFIG_PATH` | Deployment JSON path | `C:\mineuqr\print-agent.json` |
| `PRINT_AGENT_SERVER_URL` | **Authoritative WS URL override** | `wss://print.mineuqr.com/ws/print-agent` |

Config file field `serverUrl` is the default when env is unset (`agent/config/loadDeploymentConfig.ts`).

## Environment URL matrix

| Environment | Agent `PRINT_AGENT_SERVER_URL` | Dashboard printOps (B1) | Notes |
|-------------|-------------------------------|-------------------------|-------|
| **Development** | `ws://127.0.0.1:3000/ws/print-agent` | Same origin `/api/trpc` | `pnpm dev` — single process |
| **E2E validation** | `ws://127.0.0.1:3120/ws/print-agent` | N/A (harness only) | **Not for production agents** |
| **Staging** | `wss://print.staging.mineuqr.com/ws/print-agent` | Staging print host tRPC | Mirror production topology |
| **Production** | `wss://print.mineuqr.com/ws/print-agent` | `https://print.mineuqr.com/api/trpc` (B1) | Agents never use `:3120` |

## Production deployment JSON template (spec only — do not apply in 12E.1)

```json
{
  "agentId": "mineuqr-agent-720007",
  "agentName": "MineuQR Print Agent",
  "serverUrl": "wss://print.mineuqr.com/ws/print-agent",
  "platform": "windows",
  "startupPrinters": [ "..." ],
  "usbTransportEndpoints": { "..." }
}
```

Prefer setting `PRINT_AGENT_SERVER_URL` in Windows Service environment so secrets/URLs are not committed to JSON.

## Dashboard / SPA variables (B1 bridge)

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_PRINT_OPS_API_URL` | Base URL for printOps tRPC | `https://print.mineuqr.com` |

When unset in development, fall back to same-origin (current behavior with `pnpm dev`).

## Anti-patterns (documented)

| Pattern | Why forbidden |
|---------|---------------|
| `ws://127.0.0.1:3120/...` in production config | Validation-only runtime |
| Assuming Vercel serves WebSocket | Architecturally impossible |
| Different hosts for agent vs printOps without bridge | Dashboard shows inactive printers |

---

# 12E.1F — Production Rollout Plan

## Phase 1 — Production host provisioning

| Step | Action | Owner | Exit criteria |
|------|--------|-------|---------------|
| 1.1 | Create Fly.io (or Railway) app `mineuqr-print-host` in EU region | Ops | App created |
| 1.2 | Configure DNS `print.mineuqr.com` → host | Ops | TLS valid (`wss://` works) |
| 1.3 | Set secrets: `DATABASE_URL`, auth secrets matching main API | Ops | DB connectivity from host |
| 1.4 | Dockerfile / `pnpm build && node dist/index.js` | Eng | Health endpoint responds |
| 1.5 | Verify `attachPrintAgentWebSocketServer` active on host | Eng | WS upgrade on `/ws/print-agent` |

**Do not migrate agents in this phase.**

## Phase 2 — Runtime deployment

| Step | Action | Exit criteria |
|------|--------|---------------|
| 2.1 | Deploy long-running Node with WebSocket + printing modules | Process stays up >24h |
| 2.2 | Confirm `[Printing] Rebuilt printer resolution registry` on boot | DB mappings loaded |
| 2.3 | Implement **B1 bridge**: expose `printOps` tRPC on print host OR document temporary monolith cutover | Dashboard can query print host |
| 2.4 | Staging deploy with `print.staging.mineuqr.com` | Staging agents connect |

## Phase 3 — Agent migration

| Step | Action | Exit criteria |
|------|--------|---------------|
| 3.1 | Update Windows Service env: `PRINT_AGENT_SERVER_URL=wss://print.mineuqr.com/ws/print-agent` | **Not** `:3120` |
| 3.2 | Restart print agent on POS host | Agent logs show connection to production URL |
| 3.3 | Remove reliance on `production.720007.json` localhost URL for production | Config review signed off |
| 3.4 | One restaurant pilot (`720007`) before fleet rollout | Pilot only |

## Phase 4 — Live registration validation

| Check | How | Pass |
|-------|-----|------|
| HELLO registered | Agent Host logs / ops events | `mineuqr-agent-720007` in registry |
| Heartbeats | `lastHeartbeatAt` < 5 min | Status `online` |
| Profiles reported | `printerProfileStore` | `pos-80c-copy-1-usb001` present |
| Resolution | `resolvePrinter(dbPrinterId)` | Maps to pilot agent |
| Printer Operations | Dashboard KPI | `activePrinters >= 1` |
| Agents tab | `listAgentOverview` | Agent listed `online` |

## Phase 5 — Physical print validation

| Scenario | Pass |
|----------|------|
| Auto-print on order create | Job dispatched, not `agent_disconnected` |
| USB receipt prints on POS-80C | Physical ticket |
| Delivery confirmation + outcome | Pipeline completes |
| Arabic / width-aware receipt (13C/13D) | Unchanged behavior on production host |

## Rollback

| Trigger | Action |
|---------|--------|
| Agent cannot connect | Revert `PRINT_AGENT_SERVER_URL` to last known good (document current) |
| Dispatch failures | Roll back Agent Host deploy; keep Vercel unchanged |
| Dashboard bridge issues | Revert `VITE_PRINT_OPS_API_URL`; use monolith dev for support |

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Host restart clears registry | Plan B3 DB projection in 12E.2+; accept brief inactive window until agents reconnect |
| Vercel + print host split | B1 bridge in Phase 2 (mandatory) |
| DB `profileId` mismatch | Pre-flight: `printers.profileId` = agent `startupPrinters[].printerId` |
| Single point of failure | Fly/Railway auto-restart; future multi-instance + B3 |

---

# Success Criteria Checklist

| Criterion | Status |
|-----------|--------|
| Root cause documented | ✓ §Root Cause + 12E.1A |
| Production host architecture defined | ✓ §12E.1B |
| Deployment strategy selected | ✓ Fly.io primary (§12E.1C) |
| Runtime topology defined | ✓ Dedicated Print Runtime + bridge (§12E.1D) |
| Production URL strategy defined | ✓ `wss://print.mineuqr.com/...` (§12E.1E) |
| Rollout plan defined | ✓ §12E.1F |
| Ready for infrastructure provisioning | ✓ Phase 1 can start |

---

# Related documentation

| Document | Relevance |
|----------|-----------|
| [THERMAL-PRINTING-DIAGNOSTIC-1.md](./THERMAL-PRINTING-DIAGNOSTIC-1.md) | Incident root cause |
| [AGENT-DEPLOYMENT.md](./AGENT-DEPLOYMENT.md) | Agent config and Vercel limitation |
| [ENDPOINT-REGISTRY-COMPATIBILITY.md](./ENDPOINT-REGISTRY-COMPATIBILITY.md) | 12E endpoint projection model |
| `scripts/validate-printing-e2e.ts` | Validation runtime (port 3120) — not production |

---

# Code references

| Topic | Location |
|-------|----------|
| Long-running server + WS attach | `server/_core/index.ts` |
| Vercel exclusion of WS | `server/_core/index.ts` (`!process.env.VERCEL`) |
| Vercel API only | `server/_core/createApp.production.ts`, `api/index.ts` |
| WebSocket server | `server/printing/printAgentWebSocketServer.ts` |
| Active printer logic | `server/printing/printOperationsService.ts` |
| Agent config env | `agent/config/loadDeploymentConfig.ts` |
| Validation port 3120 | `agent/config/printingE2eValidationOptions.ts` |
