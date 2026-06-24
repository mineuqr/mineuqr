# MineuQR Print Agent Deployment

**Program:** THERMAL-PRINTING-12B  
**Scope:** Production deployment of Windows print agents

---

## Architecture

```text
Agent Deployment Config (JSON)
        ↓
scripts/print-agent.ts
        ↓
bootAgentFromDeploymentConfig()
        ↓
WebSocket /ws/print-agent
        ↓
HELLO → Profiles Report → Capabilities Report → Ready
        ↓
Job consumption + USB transport execution
```

Each agent owns:

```text
Agent
 ↓
Printer Profiles (startupPrinters)
 ↓
Transport Endpoints (usbTransportEndpoints keyed by profileId)
```

---

## WebSocket Requirements

Print agents connect to:

```text
wss://<your-host>/ws/print-agent
```

The WebSocket server is attached only on **long-running Node** hosts (`server/_core/index.ts` for local full-stack dev, or the dedicated **print host** for production).

### Production print host (12E.1B)

Deploy the dedicated Agent Host for production agents:

```text
pnpm build:print-host && pnpm start:print-host
```

See [AGENT-HOST-DEPLOYMENT-12E.1B.md](./AGENT-HOST-DEPLOYMENT-12E.1B.md) and `fly.toml`.

Production agent URL:

```text
wss://print.mineuqr.com/ws/print-agent
```

Dashboard Printer Operations uses the connectivity bridge (`VITE_PRINT_OPS_API_URL`) to read agent state from the print host.

---

## Configuration

### Single printer (POS-80C production example)

```json
{
  "agentId": "mineuqr-agent-720007",
  "agentName": "MineuQR Print Agent",
  "serverUrl": "wss://your-mineuqr-host.example.com/ws/print-agent",
  "platform": "windows",
  "startupPrinters": [
    {
      "printerId": "pos-80c-copy-1-usb001",
      "printerName": "POS-80C (copy 1)",
      "transport": "usb",
      "paperWidth": 80,
      "capabilities": {
        "escpos": true,
        "cutter": false,
        "cashDrawer": false,
        "qrCode": true,
        "imagePrinting": false
      },
      "executionCapabilities": {
        "airprint": false,
        "vendorSdk": false
      }
    }
  ],
  "usbTransportEndpoints": {
    "pos-80c-copy-1-usb001": {
      "kind": "windows-spooler",
      "printerName": "POS-80C (copy 1)",
      "portName": "USB001"
    }
  }
}
```

Canonical example file: `agent/config/production.example.json`

### Multi-printer example

See `agent/config/production.multi-station.example.json` for Kitchen, Coffee, and Dessert profiles on one agent.

### Multi-station routing (12A)

Station routing is server-side. The agent only needs profiles that match database `printers.profileId` values. Configure one profile per physical printer; map categories to stations in the dashboard.

---

## Environment Overrides

| Variable | Overrides |
|----------|-----------|
| `PRINT_AGENT_CONFIG_PATH` | Path to JSON config file |
| `PRINT_AGENT_SERVER_URL` | `serverUrl` |
| `PRINT_AGENT_ID` | `agentId` |
| `PRINT_AGENT_AGENT_NAME` | `agentName` |

---

## Running the Agent

```bash
pnpm exec tsx scripts/print-agent.ts
pnpm exec tsx scripts/print-agent.ts --config agent/config/production.example.json
```

Startup flow:

```text
Load Config → Validate → Boot Agent → Connect WebSocket
→ HELLO → Profiles Report → Capabilities Report → Ready
```

Identity is persisted at:

```text
~/.mineuqr/print-agent/identity.json
```

Override with `identityStorePath` in config.

---

## Windows Service Deployment

**Production standard (13I.6D):** NSSM-managed Windows service. See [AGENT-WINDOWS-SERVICE-13I.6D.md](./AGENT-WINDOWS-SERVICE-13I.6D.md).

Quick install (Administrator PowerShell):

```powershell
cd C:\mineuqr
.\scripts\windows\install-print-agent-service.ps1
```

Manual foreground (development / validation only):

```powershell
pnpm exec tsx scripts/print-agent.ts --config agent/config/production.print-host.example.json
```

Legacy checklist:

1. Install Node.js 20+ on the POS Windows host.
2. Clone or deploy the MineuQR build to the host.
3. Copy `agent/config/production.print-host.example.json` to a host-specific path (e.g. `C:\mineuqr\agent\config\production.720007.json`).
4. Place `nssm.exe` in `scripts\windows\tools\` (see 13I.6D doc).
5. Run `install-print-agent-service.ps1` — do **not** rely on an open terminal.
6. Ensure the Windows spooler printer name and USB port match `usbTransportEndpoints`.
7. Verify Printer Operations → **Agents** tab shows the agent as `online`.

---

## Validation Rules

Configuration validation fails fast on:

- empty `startupPrinters`
- duplicate `profileId` values
- duplicate profile definitions
- USB profile without matching `usbTransportEndpoints` entry
- orphan endpoint keys without profiles
- invalid Windows spooler endpoint (missing `printerName`)
- unsupported platform (non-Windows in deployment config)

---

## Reconnect Behavior

On WebSocket reconnect the agent:

1. Clears profile/capability report trackers
2. Sends HELLO
3. Re-reports printer profiles
4. Re-reports platform capabilities
5. Returns to `ready`

No stale tracker state blocks re-reporting after server restart.

---

## Printer Operations Visibility

Dashboard → Printer Operations → **Agents** tab (read-only):

- agent id
- connectivity status (`online` / `stale` / `offline`)
- platform
- reported profile count
- connectedAt
- lastHeartbeatAt

Agents are listed when their reported profiles overlap the restaurant's configured `printers.profileId` values.

---

## Database Alignment

Ensure each `startupPrinters[].printerId` matches a row in `printers.profileId` for the restaurant. The server rebuilds resolution mappings from the database on boot; the agent must report matching profiles at runtime for Printer Operations to show active printers and transport.
