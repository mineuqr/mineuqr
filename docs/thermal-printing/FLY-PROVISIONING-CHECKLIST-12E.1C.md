# THERMAL-PRINTING-12E.1C — Fly.io Production Provisioning Checklist

**Status:** Operator checklist (no deployment performed by this document)  
**Priority:** Critical  
**Date:** 2026-06-22  
**Depends on:** [AGENT-HOST-DEPLOYMENT-12E.1B.md](./AGENT-HOST-DEPLOYMENT-12E.1B.md), [AGENT-HOST-PRODUCTION-12E.1.md](./AGENT-HOST-PRODUCTION-12E.1.md)

---

## Purpose

Step-by-step procedure to provision the **MineuQR Print Agent Host** on Fly.io at:

```text
wss://print.mineuqr.com/ws/print-agent
```

**Operator executes all commands.** This document does not deploy infrastructure.

---

## Pre-flight artifact review (verified against repo)

| # | Requirement | Artifact | Verified configuration |
|---|-------------|----------|------------------------|
| 1 | `fly.toml` | `fly.toml` | App `mineuqr-print-host`, region `fra`, Docker build, port `8080`, health `/health`, `min_machines_running = 1`, `auto_stop_machines = false` |
| 2 | `Dockerfile.print-host` | `Dockerfile.print-host` | Multi-stage Node 20, `pnpm build:print-host`, runtime `CMD node dist/print-host.mjs`, assets copied |
| 3 | Build command | `package.json` | `pnpm build:print-host` → `esbuild … → dist/print-host.mjs` |
| 4 | Startup command | `Dockerfile.print-host` + `index.ts` | `node dist/print-host.mjs` → `createPrintHostApp()` + `attachPrintAgentWebSocketServer(server)` |
| 5 | Health endpoint | `createPrintHostApp.ts` | `GET /health` → JSON `{ status: "ok", service: "mineuqr-print-host", agents, endpoints }` |
| 6 | Environment variables | `fly.toml` `[env]` + Fly secrets | See Phase 2 table |
| 7 | Exposed ports | `fly.toml` + `Dockerfile` | Internal `8080`, `EXPOSE 8080`, Fly `http_service.internal_port = 8080` |
| 8 | WebSocket upgrade | `printAgentWebSocketServer.ts` | Path `/ws/print-agent`, HTTP `upgrade` on **same** server as Express (Fly-compatible) |

### Build command (exact)

```bash
pnpm build:print-host
```

Equivalent inside Docker:

```dockerfile
RUN pnpm build:print-host
```

Produces: `dist/print-host.mjs`

### Startup command (exact)

```bash
node dist/print-host.mjs
```

Listens on `PORT` (default `8080` per `PRINT_HOST_ENV`).

### Health endpoint (exact)

```text
GET /health
```

Expected HTTP `200` body (example before agents connect):

```json
{
  "status": "ok",
  "service": "mineuqr-print-host",
  "agents": { "registered": 0, "online": 0 },
  "endpoints": { "total": 0, "online": 0 },
  "timestamp": "..."
}
```

### WebSocket endpoint (exact)

```text
wss://print.mineuqr.com/ws/print-agent
```

(Use `wss://<app-name>.fly.dev/ws/print-agent` before DNS cutover.)

---

## Prerequisites

| Item | Command / action |
|------|------------------|
| Fly CLI installed | https://fly.io/docs/hands-on/install-flyctl/ |
| Fly account logged in | `fly auth login` |
| Repo checkout at commit containing 12E.1B | `git pull` |
| Production `DATABASE_URL` (TiDB) | Same database as mineuqr.com Vercel API |
| Production `JWT_SECRET` | **Same value** as Vercel (session cookies must validate) |
| Production `VITE_APP_ID` | **Same value** as Vercel |
| DNS access for `mineuqr.com` | For `print.mineuqr.com` CNAME |
| Vercel dashboard access | Set `VITE_PRINT_OPS_API_URL` after deploy |

Optional local Docker smoke test (does not deploy to Fly):

```bash
docker build -f Dockerfile.print-host -t mineuqr-print-host:local .
docker run --rm -p 8080:8080 -e DATABASE_URL="..." -e JWT_SECRET="..." -e VITE_APP_ID="..." mineuqr-print-host:local
curl http://127.0.0.1:8080/health
```

---

## Phase 1 — Create Fly application

From repository root (`c:\mineuqr` or clone path):

### Option A — New app (first-time provisioning)

```bash
cd c:\mineuqr
fly apps create mineuqr-print-host --org personal
```

If `fly.toml` already names `mineuqr-print-host`, confirm org:

```bash
fly orgs list
```

### Option B — Link existing `fly.toml` without deploying

```bash
cd c:\mineuqr
fly launch --no-deploy --copy-config --name mineuqr-print-host --region fra
```

When prompted:

- Use existing `fly.toml` — **Yes**
- Deploy now — **No**

### Verify app exists

```bash
fly apps list
fly status -a mineuqr-print-host
```

**Exit criteria:** App `mineuqr-print-host` exists; primary region `fra`.

---

## Phase 2 — Configure secrets

Non-secret env vars are already in `fly.toml` `[env]`:

| Variable | Value in `fly.toml` | Purpose |
|----------|---------------------|---------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `8080` | Listen port |
| `TRUST_PROXY` | `true` | TLS / `X-Forwarded-*` behind Fly |
| `PRINT_HOST_PUBLIC_URL` | `https://print.mineuqr.com` | Public URL in logs |
| `PRINT_HOST_CORS_ORIGINS` | `https://mineuqr.com,https://www.mineuqr.com` | Dashboard CORS |
| `SESSION_COOKIE_DOMAIN` | `.mineuqr.com` | Cross-subdomain session cookies |

**Secrets** (never commit; set on Fly):

```bash
fly secrets set -a mineuqr-print-host ^
  DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE" ^
  JWT_SECRET="YOUR_PRODUCTION_JWT_SECRET_MIN_32_CHARS" ^
  VITE_APP_ID="YOUR_PRODUCTION_VITE_APP_ID"
```

PowerShell (single line):

```powershell
fly secrets set -a mineuqr-print-host DATABASE_URL="mysql://..." JWT_SECRET="..." VITE_APP_ID="..."
```

### Verify secrets (names only — values hidden)

```bash
fly secrets list -a mineuqr-print-host
```

Expected secret names:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`

**Exit criteria:** All three secrets listed; no plaintext secrets in git.

---

## Phase 3 — Deploy runtime

```bash
cd c:\mineuqr
fly deploy -a mineuqr-print-host --dockerfile Dockerfile.print-host
```

Monitor build and release:

```bash
fly logs -a mineuqr-print-host
```

### Verify machine is running

```bash
fly status -a mineuqr-print-host
fly machine list -a mineuqr-print-host
```

Expected logs on successful boot:

```text
[PrintHost] Listening on port 8080
[PrintHost] Health: https://print.mineuqr.com/health
[PrintHost] WebSocket: wss://print.mineuqr.com/ws/print-agent
[Printing] Rebuilt printer resolution registry (N mapping(s))
```

**Exit criteria:** Deploy succeeds; at least one machine `started`; no crash loop in `fly logs`.

---

## Phase 4 — Validate health endpoint

### 4a — Before custom DNS (Fly default hostname)

```bash
fly status -a mineuqr-print-host
```

Note hostname, e.g. `https://mineuqr-print-host.fly.dev`

```bash
curl -sS https://mineuqr-print-host.fly.dev/health
```

PowerShell:

```powershell
Invoke-RestMethod https://mineuqr-print-host.fly.dev/health | ConvertTo-Json
```

### 4b — After DNS (Phase 6)

```bash
curl -sS https://print.mineuqr.com/health
```

**Pass criteria:**

| Check | Expected |
|-------|----------|
| HTTP status | `200` |
| `status` | `"ok"` |
| `service` | `"mineuqr-print-host"` |
| Fly health check | `fly checks list -a mineuqr-print-host` shows passing |

---

## Phase 5 — Validate WebSocket endpoint

Fly terminates TLS and forwards WebSocket upgrades to the app on port `8080`. Path must be exactly `/ws/print-agent`.

### 5a — Install wscat (one-time, operator machine)

```bash
npm install -g wscat
```

Or without global install:

```bash
npx --yes wscat -c wss://mineuqr-print-host.fly.dev/ws/print-agent
```

### 5b — Connect (pre-DNS)

```bash
npx --yes wscat -c wss://mineuqr-print-host.fly.dev/ws/print-agent
```

### 5c — Send test HELLO (paste after connected)

Replace `SUPPORTED_VERSION` with the value from `shared/printing/printAgentProtocol.ts` if unsure; current repo uses the constant `SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION`.

Minimal HELLO (must include `capabilities`):

```json
{"type":"agent.hello","protocolVersion":"1.0","agentId":"provisioning-test-agent","platform":"windows","capabilities":{"protocolVersion":"1.0","platform":"windows","transports":["websocket"],"printers":1}}
```

> Current repo constant: `SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION = "1.0"` (`shared/printing/printAgentProtocol.ts`).

### 5d — Confirm registration via health

```bash
curl -sS https://mineuqr-print-host.fly.dev/health
```

Expected after HELLO: `agents.registered` ≥ `1`.

Disconnect wscat (`Ctrl+C`). Optional cleanup: restart machine or wait for disconnect handler.

### 5e — After DNS cutover

```bash
npx --yes wscat -c wss://print.mineuqr.com/ws/print-agent
```

**Pass criteria:**

| Check | Expected |
|-------|----------|
| WebSocket connects | No immediate close / TLS error |
| HELLO accepted | No `Agent hello requires capabilities` in `fly logs` |
| `/health` | `agents.registered` increments |

---

## Phase 6 — DNS cutover

### 6a — Request Fly TLS certificate

```bash
fly certs add print.mineuqr.com -a mineuqr-print-host
```

```bash
fly certs show print.mineuqr.com -a mineuqr-print-host
```

### 6b — Create DNS record

At your DNS provider for `mineuqr.com`, add:

| Type | Name | Target |
|------|------|--------|
| `CNAME` | `print` | `mineuqr-print-host.fly.dev` |

(Use the exact target shown by `fly certs show` if different.)

### 6c — Wait for certificate issuance

```bash
fly certs check print.mineuqr.com -a mineuqr-print-host
```

Repeat until status is **Ready**.

### 6d — Validate HTTPS on custom domain

```bash
curl -sS https://print.mineuqr.com/health
```

**Exit criteria:** TLS valid; `/health` returns `200` on `print.mineuqr.com`.

---

## Phase 7 — Agent migration

### 7a — Vercel dashboard (connectivity bridge B1)

In Vercel project settings → Environment Variables → **Production**:

| Name | Value |
|------|-------|
| `VITE_PRINT_OPS_API_URL` | `https://print.mineuqr.com` |

Redeploy Vercel production so the SPA picks up the variable.

Confirm main API still uses `SESSION_COOKIE_DOMAIN` compatibility: login on `mineuqr.com` must send cookies to `print.mineuqr.com` (requires `.mineuqr.com` cookie domain on **main** API if not already set — coordinate with auth team if login fails on Printer Operations).

### 7b — Windows print agent (POS host)

Set machine environment (Windows Service / NSSM):

```text
PRINT_AGENT_CONFIG_PATH=C:\mineuqr\agent\production.print-host.json
PRINT_AGENT_SERVER_URL=wss://print.mineuqr.com/ws/print-agent
```

Use template: `agent/config/production.print-host.example.json` (copy to host; **do not** use `production.720007.json` with `127.0.0.1:3120`).

Restart service:

```powershell
# Example if using NSSM service name "MineuQR Print Agent"
nssm restart "MineuQR Print Agent"
```

Or restart the terminal session running:

```bash
pnpm exec tsx scripts/print-agent.ts --config C:\path\to\production.print-host.json
```

### 7c — Verify agent logs

Agent stdout should show connection to `wss://print.mineuqr.com` (not `:3120`).

### 7d — Verify Fly registry

```bash
curl -sS https://print.mineuqr.com/health
fly logs -a mineuqr-print-host
```

Expected for pilot restaurant `720007`:

| Field | Expected |
|-------|----------|
| Agent ID | `mineuqr-agent-720007` |
| Profile ID | `pos-80c-copy-1-usb001` |
| `agents.online` | `≥ 1` |

### 7e — Verify Printer Operations (mineuqr.com)

1. Log in to dashboard → **Printer Operations**
2. Confirm:

| Metric | Expected |
|--------|----------|
| Active Printers | `1` |
| Transport | `usb` |
| Agents tab | `mineuqr-agent-720007` → `online` |

### 7f — Database alignment check

Confirm DB row for restaurant `720007`:

```sql
SELECT id, restaurantId, name, profileId FROM printers WHERE restaurantId = 720007;
```

`profileId` must equal `pos-80c-copy-1-usb001`.

---

## Post-provisioning validation matrix

| Scenario | Command / action | Pass |
|----------|------------------|------|
| Health | `curl https://print.mineuqr.com/health` | ☐ |
| WebSocket | `wscat` connect + HELLO | ☐ |
| Agent connected | `/health` → `agents.online >= 1` | ☐ |
| Dashboard KPI | Active Printers = 1 | ☐ |
| Transport | `usb` on printer row | ☐ |
| Physical print | Test order prints on POS-80C | ☐ |

---

## Rollback (if needed)

| Step | Command / action |
|------|----------------|
| Revert agent URL | `PRINT_AGENT_SERVER_URL=ws://127.0.0.1:3120/ws/print-agent` (validation only) or previous known-good |
| Remove Vercel bridge | Unset `VITE_PRINT_OPS_API_URL`; redeploy Vercel |
| Scale down Fly app | `fly scale count 0 -a mineuqr-print-host` |
| Remove DNS | Delete `print` CNAME |

---

## Related files

| File | Role |
|------|------|
| `fly.toml` | Fly app configuration |
| `Dockerfile.print-host` | Container build |
| `server/print-host/index.ts` | Runtime entrypoint |
| `server/print-host/createPrintHostApp.ts` | `/health`, tRPC, CORS |
| `server/printing/printAgentWebSocketServer.ts` | `/ws/print-agent` |
| `agent/config/production.print-host.example.json` | Agent config template |
| `docs/thermal-printing/AGENT-HOST-DEPLOYMENT-12E.1B.md` | Architecture reference |

---

## Success criteria (12E.1C)

| Criterion | This checklist |
|-----------|----------------|
| `fly.toml` reviewed | ✓ Pre-flight table |
| `Dockerfile.print-host` reviewed | ✓ Pre-flight table |
| Build / startup / health verified | ✓ Phases 3–4 |
| Environment variables documented | ✓ Phase 2 |
| Ports documented | ✓ Pre-flight #7 |
| WebSocket upgrade documented | ✓ Phase 5 |
| Exact operator commands | ✓ Phases 1–7 |
| No deployment performed by doc | ✓ Checklist only |
