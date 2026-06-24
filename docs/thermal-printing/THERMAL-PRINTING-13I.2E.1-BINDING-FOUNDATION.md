# THERMAL-PRINTING-13I.2E.1 — Binding Foundation

**Status:** Implemented  
**Architecture:** PRINTING-ARCHITECTURE-NOTE-6  
**Next phase:** 13I.2E.2 — printer picker / binding workflow

---

## Architecture Decision

Dashboard provisioning **no longer emits authoritative physical bindings**.

| Layer | Owner | Config fields |
|-------|-------|---------------|
| Logical printer | Dashboard | `startupPrinters[]`, `physicalBindings[].logicalPrinterName` |
| Physical Windows binding | Agent / Installer (future) | `usbTransportEndpoints[]` |

**New provisioning downloads include:**

- `bindingModel: "13I.2E.1"`
- `startupPrinters` — logical identity (unchanged operator input)
- `physicalBindings` — `bindingStatus: "pending"` per profile
- `usbTransportEndpoints: {}` — empty until installer binds (13I.2E.2)

**Backward compatibility:** Existing configs with populated `usbTransportEndpoints` (including `printerName` + optional `portName`) continue to validate and run unchanged.

---

## Before vs After

### Before (13I.1J placeholder)

```json
"usbTransportEndpoints": {
  "r720002-printer-abc": {
    "kind": "windows-spooler",
    "printerName": "طابعة",
    "portName": "USB001"
  }
}
```

### After (13I.2E.1)

```json
"bindingModel": "13I.2E.1",
"physicalBindings": {
  "r720002-printer-abc": {
    "bindingStatus": "pending",
    "logicalPrinterId": "r720002-printer-abc",
    "logicalPrinterName": "طابعة",
    "transportKind": "windows-spooler",
    "dbPrinterId": 1
  }
},
"usbTransportEndpoints": {}
```

---

## Migration Path to 13I.2E.2

1. **Operator** downloads dashboard config (pending bindings).
2. **Installer / bind script (13I.2E.2)** enumerates Windows printers.
3. Operator selects spooler queue per logical printer.
4. Installer writes:
   - `usbTransportEndpoints[profileId].printerName` = Windows queue name
   - `usbTransportEndpoints[profileId].portName` = detected port (optional)
   - `physicalBindings[profileId].bindingStatus` = `"bound"`
5. Agent restarts with authoritative physical endpoints.

**Manual migration (interim):** Support may edit `usbTransportEndpoints` directly using Windows queue names; leave or update `physicalBindings` to `bound`.

---

## Operational Impact

| Flow | Impact |
|------|--------|
| Add Printer | Unchanged |
| Download Configuration | New JSON shape; no fake `USB001` |
| Agent connect / profiles | **Works** — pending binding satisfies validation |
| Test Print / production jobs | **Fails at transport** until physical binding completed (expected until 13I.2E.2) |
| Legacy bound configs | **Unchanged** — full `usbTransportEndpoints` still accepted |

---

## Files Changed

| File | Change |
|------|--------|
| `shared/printing/physicalBindings.ts` | New binding types |
| `server/printing/printAgentConnectConfig.ts` | Pending bindings; empty endpoints |
| `agent/config/types.ts` | `physicalBindings` on config types |
| `agent/config/validateDeploymentConfig.ts` | Pending binding validation path |
| `agent/config/validateDeploymentConfig.test.ts` | Pending binding test |
| `server/printing/printOperationsProvisioning.test.ts` | Updated provisioning expectations |
| `distribution/print-agent/config/mineuqr-agent-config.json.example` | New shape |

---

## Validation

```bash
pnpm check
pnpm test server/printing/printOperationsProvisioning.test.ts agent/config/validateDeploymentConfig.test.ts
pnpm build:agent
pnpm package:agent
```

---

## Related

- THERMAL-PRINTING-13I.2D Printer Binding Architecture Audit
- THERMAL-PRINTING-13I.2C-2 Distribution Package
