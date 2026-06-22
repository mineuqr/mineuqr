# THERMAL-PRINTING-12E.1B — Production Agent Host Deployment

**Status:** Implementation complete — ready for Fly.io provisioning  
**Date:** 2026-06-22  
**Depends on:** [THERMAL-PRINTING-DIAGNOSTIC-1](./THERMAL-PRINTING-DIAGNOSTIC-1.md), [AGENT-HOST-PRODUCTION-12E.1.md](./AGENT-HOST-PRODUCTION-12E.1.md)

---

## Executive Summary

This release adds a **dedicated production Agent Host** (`server/print-host/`) with:

- WebSocket `/ws/print-agent` on a long-running Node process
- Read-only **connectivity bridge** tRPC (`printOps`, `endpointOps`) for the dashboard
- **Fly.io** deployment specification (`fly.toml`, `Dockerfile.print-host`)
- Client **B1 routing** via `VITE_PRINT_OPS_API_URL`

After deployment and agent migration, `mineuqr-agent-720007` should register on `wss://print.mineuqr.com/ws/print-agent` and Printer Operations on mineuqr.com should show **Active Printers = 1**.

---

# 12E.1B.1 — Runtime Packaging Report

## Minimum runtime required

| Component | Required | Notes |
|-----------|----------|-------|
| `server/print-host/index.ts` | **Yes** | Production entrypoint |
| `attachPrintAgentWebSocketServer()` | **Yes** | Bound to same HTTP server |
| `agentLifecycleService` | **Yes** | HELLO / heartbeat / disconnect |
| `printerProfileNegotiationFlow` | **Yes** | Profile inventory |
| `endpointProjectionService` | **Yes** | 12E endpoint hydration |
| `printOperationsService` | **Yes** | Dashboard visibility reads |
| `endpointOperationsService` | **Yes** | Endpoint visibility reads |
| `printingRuntimeBootstrap` | **Yes** | DB resolution registry rebuild |
| Full Vite SPA | **No** | Not served by print host |
| Customer push / platform protection probes | **No** | Omitted from print host startup |

## Entrypoint

| Environment | Command | Output |
|-------------|---------|--------|
| Development | `pnpm dev:print-host` | `tsx watch server/print-host/index.ts` |
| Production build | `pnpm build:print-host` | `dist/print-host.mjs` |
| Production run | `pnpm start:print-host` | `node dist/print-host.mjs` |

## Required environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | **Yes** | Resolution registry rebuild + printer DB reads |
| `JWT_SECRET` | **Yes** | tRPC session auth (≥32 chars production) |
| `VITE_APP_ID` | **Yes** (production) | Auth validation |
| `PORT` / `PRINT_HOST_PORT` | No (default `8080`) | Listen port |
| `PRINT_HOST_PUBLIC_URL` | Recommended | Logs + agent URL docs (`https://print.mineuqr.com`) |
| `PRINT_HOST_CORS_ORIGINS` | Recommended | Dashboard origins (comma-separated) |
| `SESSION_COOKIE_DOMAIN` | **Yes** (production bridge) | `.mineuqr.com` for cross-subdomain cookies |
| `TRUST_PROXY` | **Yes** (behind Fly TLS) | `true` |

## Build outputs

| Artifact | Path |
|----------|------|
| Print host bundle | `dist/print-host.mjs` |
| Cairo font (Arabic raster) | `server/assets/Cairo-Variable.ttf` (copied in Docker image) |

## Not required on print host

- Vercel serverless handler
- Static SPA (`dist/public`)
- Port `3120` validation harness

---

# 12E.1B.2 — Fly.io Deployment Specification

## Files

| File | Role |
|------|------|
| `fly.toml` | App config, region, health checks, VM sizing |
| `Dockerfile.print-host` | Multi-stage build → `dist/print-host.mjs` |

## Build strategy

1. `pnpm install --frozen-lockfile`
2. `pnpm build:print-host` (esbuild bundle, external node_modules)
3. Runtime image: `node dist/print-host.mjs`

## Startup command

```text
node dist/print-host.mjs
```

## Health check

```text
GET /health
```

Returns JSON with `agents.registered`, `agents.online`, `endpoints.total`.

## Machine sizing (recommended)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Region | `fra` | EU proximity to TiDB eu-central |
| CPU | 1 shared | Low steady-state; burst during job dispatch |
| Memory | 512 MB | Node + WS connections + printing stores |
| `min_machines_running` | 1 | Agents require always-on host |
| `auto_stop_machines` | false | Prevent registry loss / disconnect |

## Auto-restart

Fly `http_service` health checks restart unhealthy machines automatically.

## Secrets (set via `fly secrets set`)

```bash
fly secrets set \
  DATABASE_URL='...' \
  JWT_SECRET='...' \
  VITE_APP_ID='...'
```

Non-secret env vars are in `fly.toml` `[env]` block.

## DNS

```text
print.mineuqr.com  CNAME  mineuqr-print-host.fly.dev
```

---

# 12E.1B.3 — Production Runtime Entrypoint

## Implementation

| Module | Path |
|--------|------|
| Entry | `server/print-host/index.ts` |
| Express app | `server/print-host/createPrintHostApp.ts` |
| tRPC router | `server/print-host/printHostRouter.ts` |

## Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/ws/print-agent` | WebSocket upgrade | Agent protocol |
| `/health` | GET | Liveness + registry stats |
| `/api/trpc` | POST | `printOps.*`, `endpointOps.*` |

## Initialized on startup

1. `validateAuthSecurityConfig()`
2. `initializePrintingRuntime()` → DB resolution mappings
3. HTTP server + WebSocket upgrade handler
4. In-memory stores populated as agents connect

---

# 12E.1B.4 — Connectivity Bridge (Plan B1)

## Problem

Dashboard on **mineuqr.com** (Vercel) cannot see in-memory agent state on the print host without routing print operations API calls to the print host.

## Solution

### Server

Print host exposes `printOps` and `endpointOps` tRPC routers (same procedures as main app).

### Client

`client/src/lib/trpcLinks.ts` uses `splitLink`:

- `printOps.*` → `VITE_PRINT_OPS_API_URL/api/trpc`
- `endpointOps.*` → `VITE_PRINT_OPS_API_URL/api/trpc`
- All other procedures → `/api/trpc` (Vercel)

### Auth

`SESSION_COOKIE_DOMAIN=.mineuqr.com` allows session cookies on both `mineuqr.com` and `print.mineuqr.com`.

### Vercel env (dashboard build)

```text
VITE_PRINT_OPS_API_URL=https://print.mineuqr.com
```

### Development

Leave `VITE_PRINT_OPS_API_URL` unset when using `pnpm dev` (single process on port 3000).

---

# 12E.1B.5 — Production Configuration

## Agent environment

| Environment | `PRINT_AGENT_SERVER_URL` |
|-------------|--------------------------|
| Development | `ws://localhost:3000/ws/print-agent` |
| Production | `wss://print.mineuqr.com/ws/print-agent` |

Env overrides JSON `serverUrl` (`agent/config/loadDeploymentConfig.ts`).

## Example configs (committed — no localhost in production templates)

| File | Purpose |
|------|---------|
| `agent/config/development.print-host.example.json` | Local dev |
| `agent/config/production.print-host.example.json` | Production template |
| `agent/config/production.example.json` | Updated production URL |

**Do not use** `agent/config/production.720007.json` `ws://127.0.0.1:3120` in production — that is the E2E validation runtime only.

## Windows Service

```text
PRINT_AGENT_CONFIG_PATH=C:\mineuqr\print-agent.json
PRINT_AGENT_SERVER_URL=wss://print.mineuqr.com/ws/print-agent
```

---

# 12E.1B.6 — First Production Registration Report

> **Status:** Pending operator execution after `fly deploy`  
> Complete this checklist during first production cutover.

## Pre-flight

| Step | Done | Evidence |
|------|------|----------|
| `fly deploy` succeeded | ☐ | `fly status` |
| `GET https://print.mineuqr.com/health` → `status: ok` | ☐ | curl output |
| DNS `print.mineuqr.com` resolves | ☐ | nslookup |
| Vercel `VITE_PRINT_OPS_API_URL` set | ☐ | Vercel dashboard |
| `SESSION_COOKIE_DOMAIN=.mineuqr.com` on print host | ☐ | fly.toml / secrets |
| DB `printers.profileId` = `pos-80c-copy-1-usb001` for restaurant 720007 | ☐ | SQL query |

## Agent migration

| Step | Done | Evidence |
|------|------|----------|
| Set `PRINT_AGENT_SERVER_URL=wss://print.mineuqr.com/ws/print-agent` | ☐ | Service env |
| Restart Windows print agent | ☐ | Agent log |
| Agent log shows WSS connection (not `:3120`) | ☐ | Log line |

## Registration validation

| Check | Expected | Done | Evidence |
|-------|----------|------|----------|
| HELLO | `mineuqr-agent-720007` registered | ☐ | `/health` `agents.registered >= 1` |
| Profiles | `pos-80c-copy-1-usb001` reported | ☐ | Printer Operations profile column |
| Heartbeat | `online` (not stale) | ☐ | Agents tab |
| Printer Operations | `activePrinters = 1` | ☐ | Dashboard KPI |
| Transport | `usb` | ☐ | Printers tab |
| Endpoint ops | `WINDOWS_AGENT` ONLINE | ☐ | `endpointOps.listEndpoints` |

## Physical print (post-registration)

| Check | Done |
|-------|------|
| Test print job dispatched from dashboard | ☐ |
| POS-80C prints receipt | ☐ |

> **Note:** Order auto-print dispatch from Vercel still routes through Vercel's in-memory assignment/dispatch path. End-to-end order printing from mineuqr.com may require a follow-up dispatch bridge (12E.2+). This release completes **visibility** and **agent registration** on the production host.

---

# Validation

```bash
pnpm exec tsc --noEmit
pnpm vitest run server/print-host/printHost.test.ts server/printing/printOperations.test.ts server/printing/endpointOperations.test.ts
```

---

# Code map

| Deliverable | Location |
|-------------|----------|
| Runtime entrypoint | `server/print-host/index.ts` |
| Fly spec | `fly.toml` |
| Docker build | `Dockerfile.print-host` |
| Connectivity bridge | `client/src/lib/trpcLinks.ts` |
| Endpoint ops router | `server/printing/endpointOperationsRouter.ts` |
| Config examples | `agent/config/*.print-host.example.json` |
| Tests | `server/print-host/printHost.test.ts` |
