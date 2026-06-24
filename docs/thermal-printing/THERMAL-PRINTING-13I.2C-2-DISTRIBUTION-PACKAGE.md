# THERMAL-PRINTING-13I.2C-2 — Agent Distribution Package (ZIP)

**Status:** Implemented  
**Scope:** ZIP packaging for pilot/support distribution — no installer, no binding UX

---

## Build and Package

```bash
pnpm check
pnpm build:agent
pnpm package:agent
```

Post-package verification:

```bash
node scripts/verify-print-agent-package.mjs
```

**Output:** `dist/packages/MineuQR-Print-Agent.zip`

---

## Package Layout

```text
MineuQR-Print-Agent/
  README.md
  package-manifest.json
  agent/
    agent.mjs
    print-agent.cmd
    package.json
    version.json
    README.txt
    scripts/windowsSpoolerRawPrint.ps1
    assets/                         (optional Cairo font)
    node_modules/                   (runtime deps)
  config/
    mineuqr-agent-config.json.example
    CONFIG-PLACEMENT.txt
  scripts/
    install-agent.ps1
    uninstall-agent.ps1
    print-agent-service.cmd
    tools/README.txt                (NSSM placement instructions)
```

---

## Distribution Inventory

Shipped from `dist/agent` build artifact:

| Item | Required |
|------|----------|
| `agent.mjs` | Yes |
| `node_modules/` (dotenv, ws, canvas, bidi-js, reshaper) | Yes |
| `scripts/windowsSpoolerRawPrint.ps1` | Yes |
| `print-agent.cmd` | Yes |
| `package.json`, `version.json` | Yes |
| `assets/Cairo-Variable.ttf` | Optional (Arabic raster) |

Added by packaging templates:

| Item | Purpose |
|------|---------|
| `README.md` | Operator/support guide |
| `package-manifest.json` | Version + layout metadata |
| `config/*.example` | Reference only |
| `scripts/install-agent.ps1` | NSSM service install |
| `scripts/uninstall-agent.ps1` | Service removal |
| `scripts/print-agent-service.cmd` | Service entrypoint |

---

## Configuration Placement

**Expected active config path:**

```text
config\mineuqr-agent-config.json
```

**Operator workflow:**

1. Download `mineuqr-agent-config.json` from dashboard (13I.2B)
2. Extract ZIP to e.g. `C:\MineuQR\PrintAgent`
3. Copy downloaded file to `config\mineuqr-agent-config.json`
4. Run agent or install service

The service wrapper and `install-agent.ps1` default to this path via `PRINT_AGENT_CONFIG_PATH`.

**Do not** use `mineuqr-agent-config.json.example` in production.

---

## Extraction and Startup

### Foreground test

```powershell
cd C:\MineuQR\PrintAgent\agent
.\print-agent.cmd --config ..\config\mineuqr-agent-config.json
```

### Windows service (Administrator)

1. Place `nssm.exe` in `scripts\tools\`
2. Save dashboard config to `config\mineuqr-agent-config.json`
3. Run:

```powershell
cd C:\MineuQR\PrintAgent\scripts
.\install-agent.ps1
```

Logs: `%ProgramData%\MineuQR\logs\`

---

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| ZIP won't extract | Use Windows built-in Extract All or 7-Zip |
| `node.exe not found` | Install Node.js 20+ |
| `Config not found` | Place dashboard JSON at `config\mineuqr-agent-config.json` |
| `nssm.exe not found` | Follow `scripts\tools\README.txt` |
| Agent online, print fails | Physical spooler binding placeholder — see 13I.2D / future binding UX |
| Arabic receipt errors | Add `Cairo-Variable.ttf` to `agent\assets\` |

---

## Pilot Deployment Assessment

### Ready for single-restaurant pilot

- Downloadable ZIP artifact
- Documented config placement
- Foreground and service install paths
- Connects to production Print Host when valid dashboard config is used

### Remaining manual steps

| Step | Owner |
|------|-------|
| Install Node.js 20+ on POS | Operator / IT |
| Extract ZIP | Operator |
| Download dashboard config | Operator |
| Place config file | Operator |
| Download and place NSSM | Support / IT |
| Run install script as Admin | Support / IT |
| Align Windows spooler names in config | Support (until binding UX) |
| Dashboard Refresh + Test Print | Operator |

### Operational risks

1. **NSSM not bundled** — extra manual step (legal/size; installer phase may bundle)
2. **Physical binding placeholders** — print may fail despite agent online
3. **No code signing** — SmartScreen warnings possible
4. **No auto-update** — manual ZIP replacement for agent updates
5. **Node.js prerequisite** — not embedded in ZIP

### Support requirements

- Remote desktop or on-site IT for service install
- Access to dashboard for config download
- Ability to read `%ProgramData%\MineuQR\logs\`

---

## Future Compatibility

| Future phase | Compatible without ZIP redesign |
|--------------|--------------------------------|
| Windows Installer (.exe) | Yes — same `agent/` + `config/` layout |
| Dashboard Download Agent button | Yes — link to versioned ZIP URL |
| Pairing code bootstrap | Yes — replaces manual config file step |
| Printer binding UX | Yes — installer edits config before service start |
| Auto-update | Yes — replace `agent/` subtree or full ZIP |

---

## CI Integration

```bash
pnpm check
pnpm build:agent
pnpm package:agent
node scripts/verify-print-agent-package.mjs
```

---

## Related Documents

- [THERMAL-PRINTING-13I.2C-1-BUILD-ARTIFACT.md](./THERMAL-PRINTING-13I.2C-1-BUILD-ARTIFACT.md)
- [AGENT-WINDOWS-SERVICE-13I.6D.md](./AGENT-WINDOWS-SERVICE-13I.6D.md)
