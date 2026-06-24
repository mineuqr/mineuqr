# THERMAL-PRINTING-13I.2C-1 — Agent Build Artifact

**Status:** Implemented  
**Scope:** Distributable print agent runtime (`dist/agent/`) — no ZIP, no installer, no binding UX

---

## Build Command

```bash
pnpm build:agent
```

Post-build verification:

```bash
node scripts/verify-print-agent-artifact.mjs
```

Run built agent:

```bash
node dist/agent/agent.mjs --config path/to/mineuqr-agent-config.json
```

Windows launcher:

```text
dist\agent\print-agent.cmd --config path\to\mineuqr-agent-config.json
```

---

## Artifact Layout

```text
dist/agent/
  agent.mjs                 # esbuild ESM bundle (entrypoint)
  package.json              # minimal runtime dependencies
  version.json              # build manifest (version, builtAt, deps)
  print-agent.cmd           # Windows launcher
  README.txt                # operator/engineer quick reference
  scripts/
    windowsSpoolerRawPrint.ps1
  assets/
    Cairo-Variable.ttf      # copied when present in server/assets
  node_modules/             # production runtime deps (npm install --omit=dev)
```

---

## Runtime Requirements

| Requirement | Notes |
|-------------|-------|
| **Node.js 20+** | Required on POS host |
| **Windows** | Agent deployment config validates `platform: "windows"` |
| **PowerShell** | Used for Windows spooler RAW printing |
| **Configuration JSON** | `--config` or `PRINT_AGENT_CONFIG_PATH` |
| **Network** | Outbound WSS to Print Host (`serverUrl` in config) |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `PRINT_AGENT_CONFIG_PATH` | Deployment JSON path |
| `PRINT_AGENT_SERVER_URL` | Override `serverUrl` |
| `PRINT_AGENT_ID` | Override `agentId` |
| `PRINT_AGENT_AGENT_NAME` | Override `agentName` |
| `PRINT_AGENT_SPOOLER_SCRIPT_PATH` | Override spooler PowerShell script path |

---

## Build Architecture

**Decision:** esbuild single-bundle + external npm packages + copied runtime assets.

| Layer | Approach |
|-------|----------|
| Application code | Bundled into `agent.mjs` (`agent/`, `shared/printing/`, entry script) |
| Native / npm runtime | Installed into `dist/agent/node_modules` |
| PowerShell spooler script | Copied to `dist/agent/scripts/` |
| Arabic raster font | Copied to `dist/agent/assets/` when available |

**Why not a single executable yet:** `@napi-rs/canvas` requires native bindings per platform. This layout prepares for future installer/ZIP packaging without redesign.

---

## Runtime Dependency Inventory

Bundled into `agent.mjs`:

- `scripts/print-agent.ts` entry
- `agent/**` (config, runtime, transports, jobs, execution, etc.)
- `shared/printing/**` (protocol, receipts, ESC/POS, transports)

Installed via `dist/agent/package.json`:

- `dotenv`
- `ws`
- `@napi-rs/canvas`
- `bidi-js`
- `arabic-persian-reshaper`

Filesystem assets at runtime:

- Deployment config JSON (operator-provided)
- `~/.mineuqr/print-agent/identity.json` (auto-created)
- `scripts/windowsSpoolerRawPrint.ps1`
- `assets/Cairo-Variable.ttf` (Arabic raster receipts)

---

## Known Limitations

1. **Node.js still required** — runtime is not embedded in this phase (installer phase 13I.2C-3 may bundle Node).
2. **Cairo font optional at build** — if `server/assets/Cairo-Variable.ttf` is absent, Arabic raster jobs fail at runtime until font is placed in `dist/agent/assets/`.
3. **Dashboard-generated `usbTransportEndpoints` are placeholders** — physical binding remains installer/agent responsibility (PRINTING-ARCHITECTURE-NOTE-6).
4. **No auto-update channel** — manual artifact replacement until future updater work.
5. **Service wrapper** — existing `scripts/windows/print-agent-service.cmd` still targets repo/tsx; update in installer phase to use `dist/agent/agent.mjs`.

---

## Future Compatibility

| Future phase | Supported by this artifact |
|--------------|---------------------------|
| ZIP distribution | Yes — zip `dist/agent/` |
| Windows installer | Yes — install directory = artifact root |
| Printer binding UX | Yes — installer writes config; agent unchanged |
| Version pinning | Yes — `version.json` + package version |
| Code signing | Target `agent.mjs` + launcher |

---

## CI Integration

```bash
pnpm check
pnpm build:agent
node scripts/verify-print-agent-artifact.mjs
```

---

## Related Documents

- [AGENT-DEPLOYMENT.md](./AGENT-DEPLOYMENT.md)
- [AGENT-WINDOWS-SERVICE-13I.6D.md](./AGENT-WINDOWS-SERVICE-13I.6D.md)
- THERMAL-PRINTING-13I.2C Agent Distribution UX Audit
