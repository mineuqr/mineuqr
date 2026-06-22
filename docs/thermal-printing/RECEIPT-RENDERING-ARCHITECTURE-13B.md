# THERMAL-PRINTING-13B — Receipt Rendering Architecture

**Status:** Implemented  
**Depends on:** THERMAL-PRINTING-13A.1  
**Next:** Arabic shaping / raster programs (post-13B approval)

---

## 1. Rendering Architecture Map (13B.1)

### Before 13B (fragmented)

| Path | Location | Role | Production? |
|------|----------|------|-------------|
| A | `shared/printing/escposPayloadBuilder.ts` | Agent ticket → bytes | **Yes** |
| B | `server/printing/escposRenderer.ts` | Kitchen ticket → ESC/POS document | No |
| C | `server/printing/escposByteEncoder.ts` | Document → bytes | No (duplicate encoder) |

**Issues:** duplicated encoder, divergent templates, dropped fields on agent wire path, fixed 32-char separators, unused `PRINT_TICKET_LOCALE`.

### After 13B (authoritative)

```
Order / Agent Ticket Data
        ↓
  receiptAdapters.ts        (KitchenTicket, AgentJobTicketPayload → Receipt)
        ↓
  layoutEngine.ts           (Receipt + LayoutProfile → ReceiptRenderPlan)
        ↓
  receiptEscPosRenderer.ts  (ReceiptRenderPlan → EscPosDocument)
        ↓
  escposDocumentRenderer.ts (EscPosDocument → Uint8Array)
        ↓
  Transport (unchanged)
```

| Entry point | Delegates to |
|-------------|--------------|
| `buildEscPosPayloadFromAgentTicket` | `receiptPipeline.renderReceiptToEscPosPayload` + `legacy-v1` profile |
| `renderEscPosKitchenTicket` | `receiptPipeline.renderReceiptToEscPosDocument` + `legacy-v1` profile |
| `rawEscPosExecutor` (agent + server) | `buildEscPosPayloadFromAgentTicket` (unchanged API) |

Server `escposByteEncoder.ts`, `escposConstants.ts`, `escposTypes.ts` are **thin re-exports** of shared modules.

---

## 2. Canonical Receipt Model (13B.2)

**Package:** `shared/printing/receipts/receiptTypes.ts`

```
Receipt
├─ header          (title)
├─ metadata        (orderNumber, tableNumber, sessionId, createdAt)
├─ items           (quantity, name, notes, unitPrice*)
├─ totals*         (subtotal, total, currency)
├─ notes*          (orderNotes)
└─ footer          (feedLines, cut)
```

Also carries: `locale`, `paperWidthMm`, `layoutDirection`, `defaultTextDirection`, `kind`, `restaurantId`, `orderId`.

\* Reserved for future programs; not populated in 13B production path.

---

## 3. Width-Aware Layout Architecture (13B.3)

**Package:** `shared/printing/receipts/layoutProfiles.ts`

| Profile | Paper | CPL | Separator |
|---------|-------|-----|-----------|
| `w58` | 58mm | 32 | 32 |
| `w80` | 80mm | 48 | 48 |
| `legacy-v1` | 80mm (nominal) | 32 | 32 |

Production and existing tests use **`legacy-v1`** to preserve byte-identical ESC/POS output.

`layoutEngine.ts` generates platform-neutral `ReceiptRenderPlan` blocks (lines + separators). Wrapping and column layout hooks exist via profile fields; **not enabled** in 13B.

---

## 4. Locale-Aware Foundation (13B.4)

**Packages:**

- `receiptLocale.ts` — `ReceiptLocale`, `LayoutDirection`, `TextDirection`, `resolveReceiptDirectionProfile`
- `receiptLabels.ts` — `getReceiptLabels(locale)` with EN / AR / bilingual label sets

Architecture-only in 13B:

- Arabic labels defined but production path uses **English** via `legacy-v1` + default `PRINT_TICKET_LOCALE.EN`
- `layoutDirection: rtl` metadata set for `ar` locale **without** RTL engine
- No shaping, bidi, or raster

---

## 5. Consolidation & Migration (13B.5)

### Completed in 13B

- Single shared ESC/POS encoder (`shared/printing/escpos/escposDocumentRenderer.ts`)
- Single layout engine and receipt pipeline
- Legacy entry points preserved
- Production bytes unchanged (`legacy-v1` profile)

### Future migration (post-13B)

| Step | Action |
|------|--------|
| M1 | Pass `paperWidthMm` from `PrinterProfile` into receipt adapters |
| M2 | Switch production from `legacy-v1` to `w58`/`w80` per printer (changes separator width) |
| M3 | Enrich agent wire payload with order metadata (table, notes) |
| M4 | Enable locale from restaurant settings |
| M5 | Arabic raster / shaping on unified pipeline |

---

## 6. File Index

```
shared/printing/receipts/
  receiptTypes.ts
  receiptLocale.ts
  receiptLabels.ts
  layoutProfiles.ts
  layoutEngine.ts
  receiptAdapters.ts
  receiptRendering.test.ts

shared/printing/escpos/
  escposTypes.ts
  escposConstants.ts
  escposDocumentRenderer.ts
  receiptEscPosRenderer.ts

shared/printing/receiptPipeline.ts
shared/printing/escposPayloadBuilder.ts   (thin production entry)

server/printing/escposRenderer.ts         (thin kitchen entry)
server/printing/escposByteEncoder.ts      (re-export)
server/printing/escposConstants.ts        (re-export)
server/printing/escposTypes.ts            (re-export)
```

---

## 7. Non-goals (confirmed)

- Routing, assignment, resolution, dispatch, transport, endpoint registry/operations, agent protocol — **unchanged**
- Arabic shaping, RTL engine, bidi, raster, code-page — **deferred**
