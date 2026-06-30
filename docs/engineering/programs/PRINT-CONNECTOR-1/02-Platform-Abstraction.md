# PRINT-CONNECTOR-1 — Platform Abstraction

## Contract

`PlatformAdapter` (`server/print-connector/contracts/PlatformAdapter.ts`):

- `discoverPrinters()`
- `getPrinterCapabilities(printerId)`
- `getPrinterStatus(printerId)`
- `deliverPrint(request)`
- `cancelPrint(executionId, printJobId)`

## Implementations

| Platform | Adapter | OS Integration |
|----------|---------|----------------|
| Windows | `WindowsPlatformAdapter` | PowerShell `Get-Printer`, `Out-Printer` |
| macOS | `DarwinPlatformAdapter` | `lpstat`, `lp` |
| Linux | `LinuxPlatformAdapter` | `lpstat`, `lp` |
| Android | `AndroidPlatformAdapter` | Skeleton for native `PrintManager` host |

All extend `BasePlatformAdapter` for shared capability/status defaults.

## Simulated Platform

`SimulatedPlatformAdapter` provides one printer per transport for CI and dev without hardware.

## Factory

`createPlatformAdapter()` in `platform/createPlatformAdapter.ts` selects adapter by host or override.

`createAllPlatformAdapters()` registers all four platforms for architecture validation.
