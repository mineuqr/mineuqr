# PRINT-CONNECTOR-1 — Printing Service Integration

## Port Boundary

Printing Service depends **only** on `PrintConnectorPort.submit()`.

Implementation: `PrintingServicePrintConnectorAdapter` delegates to `PrintConnectorRuntime.print()` and reports outcomes via `PrintResultPort`.

## Dispatch Order (updated)

`PrintDispatchCoordinator` transitions:

1. `pending` → `dispatched`
2. `dispatched` → `printing`
3. `PrintConnectorPort.submit()` — connector executes and calls `PrintResultPort`
4. `printing` → `printed` or `failed`

## Composition Wiring

```typescript
// printingComposition.ts
const printConnectorPort = new PrintingServicePrintConnectorAdapter(
  printConnectorRuntime,
  printResultPort
);
```

Lazy `printResultPort` closures avoid circular dependency with `printingService`.

## Isolation Verified

`PrintingService.ts` imports `PrintConnectorPort` only — no platform or transport symbols.
