# PRINT-CONNECTOR-1 — Connector Architecture

## Purpose

The Print Connector is the **integration layer** between the Printing Service and installed printers. It owns OS discovery, capability reads, transport routing, and delivery — nothing else.

## Layer Stack

```
PrintConnectorPort (Printing Service)
        ↓
PrintingServicePrintConnectorAdapter
        ↓
PrintConnectorRuntime
        ↓
Platform Adapter (Windows / macOS / Linux / Android)
        ↓
Transport Adapter (USB / Ethernet / Wi-Fi / Bluetooth)
        ↓
OS Print API
        ↓
Installed Printer
```

## Module

`server/print-connector/` — isolated from Order domain, workspace business logic, and print job lifecycle (owned by Printing Service).

## Composition Root

- `printConnectorComposition.ts` — runtime + platform adapter wiring
- `printingComposition.ts` — registers `PrintingServicePrintConnectorAdapter` as `PrintConnectorPort`

## Modes

| Mode | When |
|------|------|
| `simulated` | `NODE_ENV=test` or `PRINT_CONNECTOR_MODE=simulated` |
| `host` | Production — resolves platform from `process.platform` |

Override platform: `PRINT_CONNECTOR_PLATFORM=windows|macos|linux|android`
