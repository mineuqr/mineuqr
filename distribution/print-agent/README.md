# MineuQR Print Agent

Thermal print agent package for Windows POS hosts.

## Requirements

- Windows 10 or 11
- Node.js 20 or newer on PATH
- USB thermal printer installed in Windows (Devices and Printers)
- Outbound HTTPS/WSS access to MineuQR Print Host

## Quick Start

1. Extract this ZIP to a permanent folder, for example `C:\MineuQR\PrintAgent`.
2. Download `mineuqr-agent-config.json` from your MineuQR dashboard (**Connect Device**).
3. Save the file as:

   ```text
   config\mineuqr-agent-config.json
   ```

4. Test in a console window:

   ```powershell
   cd agent
   .\print-agent.cmd --config ..\config\mineuqr-agent-config.json
   ```

5. Install as a Windows service (Administrator PowerShell):

   ```powershell
   cd scripts
   .\install-agent.ps1
   ```

6. Return to the dashboard and press **Refresh Connection Status**, then **Test Print**.

## Folder Layout

```text
MineuQR-Print-Agent/
  README.md
  package-manifest.json
  agent/                 Runtime bundle (do not edit)
  config/                Place mineuqr-agent-config.json here
  scripts/               Service install helpers
```

## Configuration

| File | Purpose |
|------|---------|
| `config\mineuqr-agent-config.json` | **Active config** from dashboard download |
| `config\mineuqr-agent-config.json.example` | Reference template only |

The service installer defaults to `config\mineuqr-agent-config.json`.

## Service Install Notes

- Requires **Administrator** PowerShell.
- Requires **NSSM 2.24** at `scripts\tools\nssm.exe` (see `scripts\tools\README.txt`).
- Service name: `MineuQRPrintAgent`
- Logs: `%ProgramData%\MineuQR\logs\`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `node.exe not found` | Install Node.js 20+ and reopen PowerShell |
| `Config not found` | Place dashboard JSON at `config\mineuqr-agent-config.json` |
| Agent offline in dashboard | Firewall, internet, config `serverUrl` |
| Test print fails | Windows printer name in config must match spooler queue (support) |

## Support

Keep `agent\version.json` and `package-manifest.json` when contacting MineuQR support.
