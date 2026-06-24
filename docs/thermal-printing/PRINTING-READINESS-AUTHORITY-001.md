# PRINTING-READINESS-AUTHORITY-001

**Status:** Approved  
**Phase:** THERMAL-PRINTING-13I.3A  
**Supersedes:** Implicit readiness inference from agent connectivity alone

---

## Decision

Printing readiness is derived from **explicit, server-authoritative signals** — not inferred from agent online status or logical printer presence alone.

Each readiness dimension has a single authoritative owner. Downstream consumers (dashboard setup UI, provisioning engine, diagnostics) must read from Print Host aggregated state, not from local agent files or dashboard config downloads.

---

## Authority Table

| Concern | Authoritative Owner | Source | Notes |
|---------|---------------------|--------|-------|
| Printer Created | **Database** | `printers` table per restaurant | Logical identity: name, paper width, `profileId` |
| Agent Connected | **Print Host** | Agent registry + heartbeat | `offline` / `online` / `stale` |
| Binding Status | **Agent Report** | `agent.printer.binding.report` WebSocket message | Runtime validation on POS; not config JSON |
| Validation Result | **Agent Report** | Same binding report payload | `BOUND`, `UNBOUND`, `MISSING_PRINTER`, `INVALID_BINDING` |
| Ready State | **Print Host (derived)** | Future `resolveSetupStage()` in 13I.3B | Combines binding report + diagnostic test outcomes |

---

## Binding Status Report

### Wire message

```text
type: agent.printer.binding.report
```

### Per logical printer

| Field | Description |
|-------|-------------|
| `profileId` | Logical printer identifier (matches DB + agent config) |
| `logicalPrinterName` | Operator-facing printer name |
| `bindingStatus` | `BOUND` \| `UNBOUND` \| `MISSING_PRINTER` \| `INVALID_BINDING` |
| `windowsPrinterName` | Windows spooler queue name when known |
| `portName` | Detected port when known |
| `lastValidatedAt` | ISO timestamp of runtime validation |
| `message` | Optional human-readable detail |

### Agent responsibilities

1. Load `printer-bindings.json` and deployment config
2. Discover Windows printers (`Get-Printer`)
3. Evaluate binding status per profile (no inferred states)
4. Send report to Print Host on connect and when status changes

### Print Host responsibilities

1. Accept reports from registered agents only
2. Store latest report per `agentId` (in-memory, consistent with profile inventory store)
3. Expose via `getDiscoveryDiagnostics.bindingStatus[]`
4. Retain last report across agent disconnect (stale but auditable)

---

## Non-Authoritative Sources

The following must **not** be used as binding authority:

| Source | Why excluded |
|--------|--------------|
| Dashboard `connectConfig` download | Emits `pending` placeholders only (13I.2E.1) |
| `printer-bindings.json` on POS | Local file; server cannot read it |
| `usbTransportEndpoints` in downloaded JSON | Empty at provision time; merged locally by agent |
| Agent profile inventory report | Logical identity only; no binding state |
| `activePrinters` count | Requires agent online + resolution; ignores binding |

---

## State Transitions (Binding)

```text
UNBOUND
  → operator binds Windows printer locally
  → BOUND (discovered + port match)

BOUND
  → Windows printer removed
  → MISSING_PRINTER

BOUND
  → port mismatch detected
  → INVALID_BINDING

MISSING_PRINTER / INVALID_BINDING
  → operator re-binds or printer restored
  → BOUND
```

---

## API Surface (13I.3A)

`printOps.getDiscoveryDiagnostics` returns:

```typescript
bindingStatus: Array<{
  printerId: number;
  profileId: string;
  logicalPrinterName: string;
  agentId: string | null;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  windowsPrinterName: string | null;
  portName: string | null;
  lastValidatedAt: string | null;
  message: string | null;
}>
```

`UNKNOWN` means no agent report received yet for the resolved agent/profile pair.

---

## Future Work (13I.3B+)

- `PrintingSetupStage` enum derived from this authority table
- Replace `ProvisioningStep` inference (`test_print` when agent online)
- Dashboard-native binding (optional) still reports through same wire message
- `READY` state requires binding `BOUND` + successful diagnostic print

---

## References

- PRINTING-ARCHITECTURE-NOTE-6
- THERMAL-PRINTING-13I.2E.1 (binding foundation)
- THERMAL-PRINTING-13I.2E.2 (local binding UX)
- THERMAL-PRINTING-13I.3 (setup experience redesign audit)
