# PRINT-CONNECTOR-1 — Canonical Models

All models live under `server/print-connector/domain/`:

| Model | Purpose |
|-------|---------|
| `PlatformType` | `windows` \| `macos` \| `linux` \| `android` |
| `TransportType` | `usb` \| `ethernet` \| `wifi` \| `bluetooth` |
| `PrinterInfo` | Discovered printer descriptor |
| `PrinterCapability` | Feature flags (raw text, paper width, DPI) |
| `PrinterStatus` | Online/ready/paper state |
| `PrintExecutionRequest` | Connector-bound job + canonical payload |
| `PrintExecutionResult` | Success/failure with canonical reason |
| `PrintFailureReason` | `printer_offline`, `no_printer_selected`, `paper_out`, etc. |

## Payload Delivery

Canonical `PrintPayload` from Printing Service is serialized to plain structured text via `PrintPayloadTextSerializer` — not ESC/POS, PDF, or raster.

## API DTOs

`PrintConnectorApi` contract types in `contracts/PrintConnectorApi.ts` — identical across all platforms.
