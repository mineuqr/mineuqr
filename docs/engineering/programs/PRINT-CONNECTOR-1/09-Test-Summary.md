# PRINT-CONNECTOR-1 — Test Summary

## Commands

```bash
npm run check     # PASS
npm test          # PASS (full suite)
```

## New Tests

| File | Coverage |
|------|----------|
| `PrintConnectorRuntime.test.ts` | Discovery, selection, print execution, failure mapping |
| `architecture.guards.test.ts` | All platforms/transports, no order logic in runtime, service isolation |

## Existing Tests

- `PrintingService.test.ts` — still passes with mock connector
- Print workspace tests — unaffected

## Simulated Mode

Tests run with `NODE_ENV=test` → `SimulatedPlatformAdapter` — no hardware required.

## Deploy

```bash
npm run db:migrate   # applies 0048_print_connector_selections
```
