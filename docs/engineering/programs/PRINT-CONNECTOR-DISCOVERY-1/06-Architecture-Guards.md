# PRINT-CONNECTOR-DISCOVERY-1 — Architecture Guards

---

## Test files

| File | Guards |
|------|--------|
| `server/print-workspace/__tests__/discovery.architecture.guards.test.ts` | No embedded router discovery; gateway routing only; client uses workspace API |
| `server/printer-management/__tests__/ux.architecture.guards.test.ts` | Provisioning dialog uses distributed discovery |

---

## Enforced rules

1. `printConnectorRouter` must not expose `discoverPrinters`
2. `PrinterManagementService` must not receive `printConnectorRuntime` directly
3. Gateway services must not call `.discoverPrinters()` on platform adapters
4. Session port must not perform native discovery
5. Client provisioning must use `printWorkspace.read.discoverPrinters`
