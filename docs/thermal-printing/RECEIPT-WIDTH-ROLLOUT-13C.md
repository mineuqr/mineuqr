# THERMAL-PRINTING-13C — Width-Aware Production Rollout

**Status:** Implemented  
**Depends on:** THERMAL-PRINTING-13B

---

## 1. Width Resolution Strategy (13C.1)

### Authoritative source

| Source | Field | Path |
|--------|-------|------|
| Agent printer profile | `paperWidth` (58 \| 80) | `printerProfileStore` via `PROFILES_REPORT` / startup registration |
| Execution context | `printer.paperWidth` | `TransportDeliveryContext.printerProfile` |
| Server read model | Same profile store | `printerProfileQueries.getPrinterProfile` |

No hardcoded printer IDs. Width is resolved from the **agent-reported profile** matched by `profilePrinterId` (resolution layer unchanged).

### Shared resolution

`shared/printing/receipts/receiptWidthResolution.ts`

- `resolvePaperWidthFromPrinterProfile(profile)` → `58` \| `80` \| `undefined`
- `resolveLayoutProfileIdFromPaperWidth(width)` → `w58` \| `w80` \| `legacy-v1`

### Server helper

`server/printing/receiptWidthResolution.ts` — `resolvePaperWidthForAgentProfile({ agentId, profilePrinterId })`

---

## 2. Width Propagation (13C.2)

```
PrinterProfile.paperWidth
  ↓
jobConsumptionService (agent runtime)
  ↓
ExecutionExecutorJobPayload.paperWidthMm
  ↓
rawEscPosExecutor → buildEscPosPayloadFromAgentTicket
  ↓
receiptFromAgentJobTicket → Receipt.paperWidthMm
  ↓
receiptPipeline → resolveReceiptLayoutProfile
```

Agent wire protocol **unchanged** — width comes from already-negotiated `transportDeliveryContext`, not new message fields.

---

## 3. Layout Profile Activation (13C.3)

| `paperWidth` | Layout profile | Separator | CPL |
|--------------|----------------|-----------|-----|
| 58 | `w58` | 32 | 32 |
| 80 | `w80` | 48 | 48 |
| unknown / missing | `legacy-v1` | 32 | 32 |

`escposPayloadBuilder` no longer forces `legacy-v1`. Production agents with `paperWidth: 80` now emit **48-character separators**.

`escposRenderer` (kitchen/server tests) still uses explicit `legacy-v1` for backward-compatible document tests.

---

## 4. Rendering Validation (13C.4)

| Scenario | 58mm (`w58`) | 80mm (`w80`) | Unknown (`legacy-v1`) |
|----------|--------------|--------------|------------------------|
| Header | ✓ | ✓ | ✓ |
| Items | ✓ | ✓ | ✓ |
| Notes | ✓ | ✓ | ✓ |
| Separator width | 32 | 48 | 32 |
| Byte length vs legacy | Same sep as legacy | **Longer** (wider sep) | Baseline |

80mm production rollout changes ESC/POS byte length (separator lines only in 13C — no Arabic/layout logic changes).

---

## 5. Compatibility (13C.5)

Unchanged:

- Routing, assignment, resolution, dispatch, transport
- Agent protocol messages
- Endpoint registry / operations

Jobs without profile width (tests, edge cases) continue to use `legacy-v1` output.

---

## 6. Tests

`server/printing/receiptWidthRollout.test.ts` — width resolution, propagation, w58/w80 rendering, legacy fallback, executor integration.

---

## 7. Non-goals (confirmed)

Arabic shaping, RTL, bidi, raster, code-page — deferred to THERMAL-PRINTING-13D+.
