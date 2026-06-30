# PRINT-GATEWAY-1 — Test Summary

---

## Test Files

| File | Coverage |
|------|----------|
| `gatewayContracts.test.ts` | Canonical model type shapes |
| `ConnectorRegistry.test.ts` | Register, lookup, unregister |
| `ConnectorResolver.test.ts` | Unregistered, healthy, offline resolution |
| `ConnectorHealthService.test.ts` | Online, degraded, heartbeat ingestion |
| `ConnectorGatewayService.test.ts` | Route success, unregistered, transport failure, directory |
| `RemotePrintConnectorPort.test.ts` | Success/failure via PrintResultPort, composition |
| `architecture.guards.test.ts` | Boundary and interface compliance |

**Gateway suite:** 7 files, 26 tests — all passing.

---

## Validation Commands

```bash
npm run check
npx vitest run server/connector-gateway
npx vitest run
```

---

## Full Suite Note

Full Vitest run: **1217 tests** (214+ files). One unrelated flaky timeout in `auth-local.change-password.test.ts` observed under parallel load; passes on isolated re-run. Gateway changes do not touch auth module.

---

## Key Assertions

- Remote port reports `reportPrintSuccess` when execution port succeeds
- Unregistered restaurant → `connector_unregistered` failure path
- Heartbeat thresholds: 30s degraded, 90s offline
- `PrintingService` source contains no gateway imports
- `PrintConnectorPort.submit` signature unchanged
