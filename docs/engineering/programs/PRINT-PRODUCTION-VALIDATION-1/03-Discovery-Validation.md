# PRINT-PRODUCTION-VALIDATION-1 — Discovery Validation

## Checklist

| # | Criterion | Automated | Physical | Result |
|---|-----------|-----------|----------|--------|
| 1 | Printer appears in workspace list | Code review ✓ | **Pending** | — |
| 2 | Platform detected (`windows`/`macos`/`linux`) | Adapter logic ✓ | **Pending** | — |
| 3 | Transport detected (`usb`/`wifi`/etc.) | Heuristic mapping ✓ | **Pending** | — |
| 4 | Capabilities readable via API | `getPrinterCapabilities` exists ✓ | **Pending** | — |
| 5 | Online/offline badge in UI | `PrintWorkspacePanel` ✓ | **Pending** | — |

## API Under Test

- `printConnector.discoverPrinters`
- `printConnector.getPrinterCapabilities`
- `printConnector.getStatus`

## Automated Evidence

- `PrintConnectorRuntime.discoverPrinters` delegates to `DeploymentRuntime` → `PlatformAdapter`.
- Windows: `Get-Printer` (PowerShell); macOS/Linux: `lpstat`; fallback to simulated list if OS tools fail.
- Workspace UI renders `printer.platform`, `printer.transport`, `printer.isOnline`.

## Physical Procedure

1. Open Print Workspace with printer connected and powered on.
2. Click refresh on Printer section.
3. Confirm expected printer name appears.
4. Verify platform and transport labels match hardware.
5. Optional: call `getPrinterCapabilities` via network tab / API client.

## Defects Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| — | — | No defects filed (physical run not executed) | Open |

## Section Verdict

**NOT CERTIFIED** — physical discovery not validated.
