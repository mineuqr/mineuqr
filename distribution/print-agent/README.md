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

4. Bind logical printers to Windows printers:

   ```powershell
   cd scripts
   .\bind-printers.cmd
   ```

5. Test in a console window:

   ```powershell
   cd agent
   .\print-agent.cmd --config ..\config\mineuqr-agent-config.json
   ```

6. Install as a Windows service (Administrator PowerShell):

   ```powershell
   cd scripts
   .\install-agent.ps1
   ```

7. Return to the dashboard and press **Refresh Connection Status**, then **Test Print**.

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
| `config\printer-bindings.json` | **Physical bindings** created by bind-printers |
| `config\binding-diagnostics.json` | Latest binding status report |
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
| Test print fails | Run `scripts\bind-printers.cmd` and verify `config\binding-diagnostics.json` |

## Support

Keep `agent\version.json` and `package-manifest.json` when contacting MineuQR support.
