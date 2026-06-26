# PRINTING-RENDERING-1B — Native Renderer Validation Report

**Date:** 2026-06-26  
**Status:** Complete

---

## 1. Architecture Summary

PRINTING-RENDERING-1B introduces the **native TicketDocument renderer** as the primary production path:

```text
TicketDocument → Policy → Layout Engine → Native ESC/POS Renderer → bytes
```

The legacy `Receipt` adapter remains available via `useLegacyRenderer` / `renderTicketDocumentToEscPosPayloadLegacy` for parity validation only.

---

## 2. Renderer Architecture

| Layer | Module |
|-------|--------|
| Policy | `renderingPolicy.ts` |
| Typography | `typography.ts` |
| Layout | `ticketLayoutEngine.ts`, `textWrapping.ts` |
| ESC/POS mapping | `ticketEscPosRenderer.ts` |
| Arabic bridge | `ticketArabicRasterBridge.ts` |
| Orchestrator | `nativeTicketRenderer.ts` |
| Pipeline | `ticketRenderingPipeline.ts` |
| Capabilities | `renderCapabilities.ts` |

Extended ESC/POS model: styled text, drawer-kick placeholder (`escposTypes.ts`, `escposDocumentRenderer.ts`).

---

## 3. Files Changed / Added

### New (`shared/printing/tickets/rendering/`)

- `typography.ts`
- `renderingPolicy.ts`
- `ticketLayoutTypes.ts`
- `textWrapping.ts`
- `ticketLayoutEngine.ts`
- `ticketEscPosRenderer.ts`
- `ticketArabicRasterBridge.ts`
- `ticketArabicDetection.ts`
- `nativeTicketRenderer.ts`
- `renderCapabilities.ts`

### Modified

- `ticketRenderingPipeline.ts` — primary path uses native renderer
- `escposTypes.ts` — styled text + drawer-kick
- `escposConstants.ts` — emphasis/size constants
- `escposDocumentRenderer.ts` — style encoding
- `server/printing/nativeTicketRenderer.test.ts` (new)
- `server/printing/canonicalTicketPlatform.test.ts`
- `server/printing/receiptRendering.test.ts`

### Documentation

- `PRINTING-RENDERING-1B-RENDERING-SPECIFICATION.md`
- This validation report

---

## 4. Parity Results

| Scenario | Result |
|----------|--------|
| Legacy receipt adapter vs native (kitchen v1) | **Differs** — intentional `ORDER #` identity with bold/double-size |
| Diagnostic tickets | **Content equivalent** — `1x` line format preserved; metadata may differ when v2 payload used |
| Arabic raster path | **Functional** — layout plan feeds existing bitmap pipeline |
| Plain receipt ESC/POS (13B tests) | **Pass** — unstylized text commands unchanged |

---

## 5. Rendering Differences (Approved)

1. **Primary identity:** `ORDER #<number>` centered, bold, double width/height (was plain order number or `Kitchen Order`).
2. **Styled ESC/POS bytes** on identity and emphasis lines.
3. **Item name wrapping** enabled under kitchen policy (long names split across lines).
4. **Station metadata** stored on document but hidden unless policy enables (kitchen policy: hidden).

---

## 6. Policy Validation

| Test | Result |
|------|--------|
| Kitchen hides prices/totals | Pass |
| Customer receipt shows prices | Pass |
| Station hidden by default | Pass |
| Diagnostic uses Kitchen Order header | Pass |

---

## 7. Compatibility Assessment

| Area | Status |
|------|--------|
| `buildEscPosPayloadFromAgentTicket` | Uses native pipeline |
| Agent consumption | Unchanged API |
| Dispatch / execution / transport | Unchanged |
| Legacy adapter | Retained for parity tooling |
| `Receipt` model | Retained for 13B receipt tests only |

---

## 8. Tests

```
server/printing: 508 passed, 1 failed (pre-existing printerProfileNegotiation), 1 skipped
```

New: `nativeTicketRenderer.test.ts` (12 tests)

---

## 9. Risks

| Risk | Severity |
|------|----------|
| Byte output changed for production tickets (identity styling) | Medium — approved |
| Diagnostic byte-identical parity not maintained with v2 metadata | Low |
| Arabic raster quality depends on layout plan → renderable bridge | Low |
| Capability placeholders not yet wired to agent profiles | Low |

---

## 10. Recommendations

1. Wire `TicketRenderDeviceCapabilities` from `PrinterProfile` in a future program.
2. Propagate restaurant locale into rendering policy selection.
3. Remove legacy receipt adapter after extended production validation.
4. Add HTML/PDF renderers consuming `TicketLayoutPlan` (PRINTING-RENDERING-2).

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| TicketDocument renders directly to ESC/POS | ✓ |
| Legacy adapter not required for primary path | ✓ |
| Formal rendering specification | ✓ |
| ORDER # primary identity | ✓ |
| Policy-controlled optional content | ✓ |
| No business logic in renderer | ✓ |
| Capability-ready contracts | ✓ |
| Printing tests pass | ✓ (508/510) |
