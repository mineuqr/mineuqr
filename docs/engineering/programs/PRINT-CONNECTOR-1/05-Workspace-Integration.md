# PRINT-CONNECTOR-1 — Workspace Integration

## tRPC Router

`printConnector` mounted in `appRouter`:

| Procedure | Type | Purpose |
|-----------|------|---------|
| `discoverPrinters` | query | List available printers |
| `getPrinterCapabilities` | query | Capability for printer ID |
| `getSelectedPrinter` | query | Current restaurant selection |
| `getStatus` | query | Printer status |
| `selectPrinter` | mutation | Persist selection |
| `cancel` | mutation | Cancel active execution |

## Client

- `usePrintConnector(restaurantId)` — discovery + selection hook
- `PrintWorkspacePanel` — printer section with online/offline badges; Print/Reprint require selection

## Rules

- No platform-specific code in UI
- Workspace calls connector API only; no direct OS access
- Print execution still flows through Printing Service → `PrintConnectorPort`

## Persistence

`print_connector_selections` table — per-restaurant printer choice (migration `0048`).
