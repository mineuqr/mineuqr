# PRINT-CONNECTOR-1 — Transport Abstraction

## Contract

`TransportAdapter` (`server/print-connector/contracts/TransportAdapter.ts`):

- `canHandle(printer)` — matches `PrinterInfo.transport`
- `execute(request, printer, platform)` — routes to platform delivery

## Implementations

| Transport | Adapter |
|-----------|---------|
| USB | `UsbTransportAdapter` |
| Ethernet | `EthernetTransportAdapter` |
| Wi-Fi | `WifiTransportAdapter` |
| Bluetooth | `BluetoothTransportAdapter` |

Transport adapters contain **no business logic** — they delegate to `PlatformAdapter.deliverPrint`.

## Registry

`createTransportAdapters()` and `resolveTransportAdapter()` in `transport/TransportAdapters.ts`.

## Isolation

Printing Service and Print Workspace never reference transport types. Transport is visible only in connector discovery metadata and workspace printer picker labels.
