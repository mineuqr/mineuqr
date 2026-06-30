# PRINT-CONNECTOR-WINDOWS-1 — Root Cause Analysis

**Date:** 2026-06-30

---

## Observed Symptoms

| Symptom | Detail |
|---------|--------|
| Simulated printers only | Printer Management showed 4 fake printers (usb/ethernet/wifi/bluetooth) |
| No Windows printers | Installed OS printers not listed |
| `spawn lp ENOENT` | Linux CUPS `lp` command executed on Windows |

---

## Root Cause (Primary)

**Silent simulated fallback on native discovery failure**, combined with **platform adapter mismatch** in some deployments.

### Mechanism

1. `WindowsPlatformAdapter.discoverPrinters()` called PowerShell `Get-Printer`.
2. On failure (permissions, execution policy, container, wrong host OS), the `catch` block returned `SimulatedPlatformAdapter("windows").discoverPrinters()`.
3. UI displayed **simulated** printers (`location: "simulated"`, ids like `windows-usb-sim-01`).
4. Print execution still used the **real** platform adapter (`LinuxPlatformAdapter` or `WindowsPlatformAdapter`), not global simulation.
5. When `PRINT_CONNECTOR_PLATFORM=linux` was set on a Windows host, or Node ran under **WSL/Docker** (`process.platform === "linux"`), `LinuxPlatformAdapter` executed `spawn("lp")` → **ENOENT** on Windows.

### Contributing Factors

| Factor | Effect |
|--------|--------|
| `PRINT_CONNECTOR_PLATFORM=linux` override on win32 | Forces CUPS adapter → `lp` |
| WSL / Linux container hosting Node | `linux` platform → `lp` / `lpstat` |
| Discovery catch → simulated | Misleading printer list in production |
| Simulated printer ID prefix (`windows-*`) vs real (`win-*`) | Print name resolution failure if mixed |

---

## Root Cause (Secondary)

**drizzle-kit-style UX gap in connector:** failures were swallowed; operators saw simulated printers instead of an empty list or canonical error.

---

## Fix Summary (PRINT-CONNECTOR-WINDOWS-1)

1. Remove production simulated fallback from Windows/Linux/macOS discovery `catch` blocks → return `[]`.
2. Ignore incompatible `PRINT_CONNECTOR_PLATFORM` override on native host (except test/simulation mode).
3. Harden `WindowsPlatformAdapter`: `Get-Printer` + `Win32_Printer` default detection, temp-file `Out-Printer` delivery.
4. Reject simulated printer IDs at Windows print time in production.
5. Sanitize failure messages — no raw OS exception text in `PrintExecutionResult.message`.
6. **Certification fix:** Replace semicolon-joined PowerShell script with newline-separated script — semicolon joining broke `ForEach-Object` blocks and caused discovery to always fail on Windows.

---

## Architecture Impact

Changes confined to `server/print-connector/platform/` and `PrintFailureMapper` — **no** changes to Printing Service, PrintConnectorPort, Deployment Runtime contracts, or workspace layers.
