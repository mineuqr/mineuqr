# PRINT-CONNECTOR-WINDOWS-1 — Test Summary

---

## Test Files

| File | Coverage |
|------|----------|
| `RuntimeConnectorCommandHandler.test.ts` | Discover, select, print, failure mapping |
| `LocalConnectorRuntimeFacade.test.ts` | (in RuntimeConnectorCommandHandler.test.ts) |
| `RlcWindowsDeploymentRuntime.test.ts` | Windows adapter hosting |
| `WindowsGatewayIntegration.test.ts` | Gateway → RLC print path |
| `windowsProductionValidation.test.ts` | Real Windows discovery |
| `architecture.guards.test.ts` | RLC boundary compliance |
| `print-connector/platform/windows/*` | Adapter unit tests (existing) |

**RLC suite:** 45+ tests including 1 live Windows validation test.

---

## Validation

```bash
npm run check
npx vitest run server/connector-local server/print-connector/platform
RLC_VALIDATE_WINDOWS=1 npx vitest run server/connector-local/__tests__/windowsProductionValidation.test.ts
npx vitest run
```
