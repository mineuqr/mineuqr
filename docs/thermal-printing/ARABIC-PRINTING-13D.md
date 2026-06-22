# THERMAL-PRINTING-13D — Arabic Printing Implementation

## Summary

Production Arabic receipt printing uses the approved **hybrid strategy**:

| Mode | Behavior |
|------|----------|
| `auto` (default) | Raster when locale is `ar`/`bilingual` or receipt contains Arabic script; otherwise legacy UTF-8 ESC/POS text |
| `raster` | Always raster (GS `v` 0) |
| `escpos-codepage` | Legacy text path (code-page rendering reserved for future work) |
| `disabled` | Legacy UTF-8 ESC/POS text |

No routing, dispatch, transport, endpoint, or agent protocol changes were made.

## Architecture

```
Receipt
  → Layout Engine (width-aware plan)
  → Rendering Strategy (per printer `arabicRenderingMode`)
      ├─ legacy-escpos → receiptEscPosRenderer → escposDocumentRenderer
      └─ arabic-raster → arabicTextEngine → receiptBitmapRenderer → escposRasterEncoder
  → Uint8Array ESC/POS bytes
  → existing USB / transport execution (unchanged)
```

## Modules

| Module | Path | Role |
|--------|------|------|
| Capability model | `shared/printing/arabic/arabicRenderingMode.ts` | `ArabicRenderingMode` type and defaults |
| Printer profile | `shared/printing/printerProfiles.ts` | `arabicRenderingMode` on `PrinterProfile` (defaults to `auto`) |
| Content detection | `shared/printing/arabic/arabicContent.ts` | Arabic script / locale detection |
| Text engine | `shared/printing/arabic/arabicTextEngine.ts` | Shaping (`arabic-persian-reshaper`), bidi (`bidi-js`), numerals |
| Bitmap renderer | `shared/printing/arabic/receiptBitmapRenderer.ts` | Cairo TTF raster via `@napi-rs/canvas` |
| Raster encoder | `shared/printing/escpos/escposRasterEncoder.ts` | GS `v` 0 monochrome image commands |
| Strategy | `shared/printing/arabic/receiptRenderingStrategy.ts` | Per-printer path selection |
| Pipeline | `shared/printing/receiptPipeline.ts` | Unified integration point |

## Width targets

| Roll | Pixels |
|------|--------|
| 58mm | 384px |
| 80mm | 576px |
| Unknown | 384px (conservative default for raster) |

## Runtime propagation

`PrinterProfile.arabicRenderingMode` flows through:

```
agent job consumption → ExecutionExecutorJobPayload.arabicRenderingMode
  → rawEscPosExecutor → buildEscPosPayloadFromAgentTicket → receiptPipeline
```

`paperWidthMm` propagation from 13C is unchanged and combined at render time.

## Backward compatibility

- Existing printer profiles without `arabicRenderingMode` validate to `auto`.
- English-only receipts with `auto` remain byte-identical to the legacy text path.
- Server kitchen renderer (`server/printing/escposRenderer.ts`) keeps `arabicRenderingMode: "disabled"` to preserve THERMAL-PRINTING-4B behavior until explicitly enabled.

## Dependencies

- `bidi-js` — Unicode bidi algorithm
- `arabic-persian-reshaper` — Arabic presentation forms
- `@napi-rs/canvas` — monochrome bitmap generation
- `server/assets/Cairo-Variable.ttf` — receipt font (shared with commercial PDF output)

## Tests

`server/printing/arabicPrinting.test.ts` covers validation scenarios A–F from the 13D specification.
