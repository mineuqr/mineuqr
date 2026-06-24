# THERMAL-PRINTING-13I.6D — Windows Print Agent Service Hardening

**Status:** Implementation complete  
**Scope:** Operational lifecycle only — no printing architecture changes

---

## Phase 1 — Architecture Evaluation

| Criterion | A: Native Windows Service | B: NSSM | C: Task Scheduler |
|-----------|---------------------------|---------|-------------------|
| **Reliability** | High (if implemented correctly) | High | Medium — tasks can be disabled, miss triggers |
| **Auto-restart on crash** | Requires custom recovery config | Built-in (`AppExit Default Restart`) | Limited — restart on failure unreliable |
| **Survive logoff** | Yes (Session 0 service) | Yes | Only if configured "Run whether user is logged on" + elevated |
| **Boot auto-start** | Yes (`SERVICE_AUTO_START`) | Yes | Yes (at startup trigger) |
| **Node/tsx deployment** | Complex — needs custom service wrapper | **Trivial** — wraps `.cmd` entrypoint | Moderate — still needs wrapper |
| **Update workflow** | Rebuild service binary | Stop service → update repo → start | Edit task action |
| **Fleet scale (100s of sites)** | High maintenance per site | **Standard pattern** for Node POS agents | Poor — inconsistent recovery |
| **Operational burden** | High dev cost | **Low** — install script + logs | Low install, high support burden |

---

## Phase 2 — Selected Production Standard

### **Option B — NSSM (Non-Sucking Service Manager)**

**Why preferred:**
- Wraps existing `print-agent-service.cmd` without rewriting the agent as a native Windows service DLL
- Proven auto-restart, log rotation, and boot start semantics
- Same install script works across all restaurant PCs
- Support engineers use familiar `services.msc` + NSSM CLI

**Rejected:**
- **Native Windows Service** — unnecessary engineering for a Node/tsx runtime; no gain over NSSM for this workload
- **Task Scheduler** — weak crash recovery, easier for staff to disable, unsuitable for always-on print infrastructure

**Long-term impact:** Fleet rollout = copy repo + `pnpm install` + one PowerShell install command per site. Updates = git pull + service restart.

---

## Phase 3 — Implementation

### Service entrypoint

```text
scripts/windows/print-agent-service.cmd
  → node node_modules/tsx/dist/cli.mjs scripts/print-agent.ts
  → --config %PRINT_AGENT_CONFIG_PATH%
```

Default config: `agent/config/production.print-host.example.json` (`wss://print.mineuqr.com`)

### Install / uninstall / verify

| Script | Purpose |
|--------|---------|
| `scripts/windows/install-print-agent-service.ps1` | Register NSSM service, auto-start, restart on exit |
| `scripts/windows/uninstall-print-agent-service.ps1` | Remove service |
| `scripts/windows/verify-print-agent-service.ps1` | Health check + optional recovery test |

### Service configuration

| Setting | Value |
|---------|-------|
| Service name | `MineuQRPrintAgent` |
| Display name | `MineuQR Print Agent` |
| Start type | Automatic (boot) |
| Exit action | Restart (5s delay) |
| Logs | `%ProgramData%\MineuQR\logs\print-agent-stdout.log` / `stderr` |
| Config env | `PRINT_AGENT_CONFIG_PATH` |

---

## Phase 5 — Operational Runbook

### Prerequisites (new restaurant PC)

1. Windows 10/11 POS host with USB thermal printer installed in spooler
2. Node.js 20+ on PATH
3. MineuQR repo at e.g. `C:\mineuqr`
4. `pnpm install --frozen-lockfile` in repo root
5. **NSSM** — download [nssm 2.24](https://nssm.cc/download), extract `win64\nssm.exe` to `scripts\windows\tools\nssm.exe`
6. Host-specific config — copy `agent/config/production.print-host.example.json` to e.g. `C:\mineuqr\agent\config\production.<restaurantId>.json` and set `agentId`, printers, spooler names

### Installation

```powershell
# Run as Administrator
cd C:\mineuqr
.\scripts\windows\install-print-agent-service.ps1 `
  -InstallRoot C:\mineuqr `
  -ConfigPath C:\mineuqr\agent\config\production.print-host.example.json
```

If the spooler queue is only visible to the POS user:

```powershell
.\scripts\windows\install-print-agent-service.ps1 -ServiceAccount ".\POSUser"
```

### Verify

```powershell
.\scripts\windows\verify-print-agent-service.ps1
.\scripts\windows\verify-print-agent-service.ps1 -TestRecovery
curl.exe -sS https://print.mineuqr.com/health
```

Expect: `"agents":{"registered":1,"online":1}`

### Update procedure (agent release)

```powershell
nssm stop MineuQRPrintAgent confirm
cd C:\mineuqr
git pull
pnpm install --frozen-lockfile
nssm start MineuQRPrintAgent
```

### Recovery procedure (support)

1. Check service: `Get-Service MineuQRPrintAgent`
2. Read logs: `%ProgramData%\MineuQR\logs\`
3. Restart: `nssm restart MineuQRPrintAgent`
4. Confirm health: `https://print.mineuqr.com/health`
5. Dashboard → Printer Management → Test Print
6. Reinstall if corrupted: `uninstall-print-agent-service.ps1` then `install-print-agent-service.ps1`

### Uninstall

```powershell
.\scripts\windows\uninstall-print-agent-service.ps1
```

---

## Phase 4 — Validation

Operator must run install on POS host as Administrator. Validation checklist:

| Step | Command / check | Expected |
|------|-----------------|----------|
| Service registered | `Get-Service MineuQRPrintAgent` | `Running`, `Automatic` |
| Boot persistence | Reboot PC → wait 60s → health | `agents.online: 1` |
| Crash recovery | `verify-print-agent-service.ps1 -TestRecovery` | Service `Running`, agent reconnects |
| Print Host health | `curl https://print.mineuqr.com/health` | `registered:1, online:1` |

---

## Files Modified / Added

| File | Purpose |
|------|---------|
| `scripts/windows/print-agent-service.cmd` | Service entrypoint wrapper |
| `scripts/windows/install-print-agent-service.ps1` | NSSM install + auto-restart config |
| `scripts/windows/uninstall-print-agent-service.ps1` | Service removal |
| `scripts/windows/verify-print-agent-service.ps1` | Health + recovery verification |
| `docs/thermal-printing/AGENT-WINDOWS-SERVICE-13I.6D.md` | This document |

---

## Final Status

```
THERMAL-PRINTING-13I.6D BLOCKED
```

**Blocker:** NSSM binary not bundled in repo; service install requires Administrator + `scripts/windows/tools/nssm.exe` on the POS host. Implementation and scripts are complete — operator must run Phase 4 validation on restaurant PC after placing `nssm.exe`.

Once install + recovery test pass on production hardware → reclassify as **COMPLETE**.
