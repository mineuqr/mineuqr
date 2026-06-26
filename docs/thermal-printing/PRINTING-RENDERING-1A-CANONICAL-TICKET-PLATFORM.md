# PRINTING-RENDERING-1A — Canonical Ticket Platform

**Status:** Implemented  
**Depends on:** PRINTING-RENDERING-1 (Investigation)  
**Next:** PRINTING-RENDERING-1B (new renderers, preview, capabilities)

---

## 1. Architectural Summary

PRINTING-RENDERING-1A introduces the **Canonical Ticket Platform** without replacing the existing ESC/POS renderer.

The approved rendering flow is now:

```
Order
  ↓
Ticket Builder (server)
  ↓
TicketDocument (canonical)
  ↓
Rendering Pipeline
  ↓
Legacy Receipt Adapter
  ↓
Existing Receipt → Layout → ESC/POS
```

**TicketDocument** is the architectural root. **Receipt** remains as the legacy renderer input, produced only by the compatibility adapter.

Primary ticket identity is now the **order number** (centered title), not "Kitchen Order". Kitchen / Grill / Bar station names are stored as execution metadata on the document and wire payload; they are not yet rendered on tickets (preserves byte layout except approved identity change).

---

## 2. Files Changed

### New — `shared/printing/tickets/`

| File | Responsibility |
|------|----------------|
| `ticketTypes.ts` | `TicketDocument`, identity, execution metadata, schema version |
| `ticketBlocks.ts` | Block union (identity, metadata, item, modifier, note, divider, totals, placeholders) |
| `ticketLabels.ts` | Locale-aware metadata labels |
| `ticketBuilder.ts` | Business mapping → `TicketDocument` (kitchen order + diagnostic) |
| `ticketPayload.ts` | Wire serialization / deserialization helpers |
| `ticketDocumentFromPayload.ts` | Agent payload → `TicketDocument` (v1 + v2) |
| `legacyReceiptAdapter.ts` | `TicketDocument` → legacy `Receipt` |
| `ticketRenderingPipeline.ts` | Canonical pipeline orchestrator |

### New — `server/printing/`

| File | Responsibility |
|------|----------------|
| `orderTicketBuilder.ts` | `KitchenTicket` + station → `TicketDocument` / agent payload |
| `canonicalTicketPlatform.test.ts` | Platform tests + byte parity validation |

### Modified

| File | Change |
|------|--------|
| `shared/printing/agentJobMessages.ts` | Versioned `AgentJobTicketPayload` (v1 legacy + v2 canonical fields) |
| `shared/printing/escposPayloadBuilder.ts` | Routes through `ticketRenderingPipeline` |
| `server/printing/jobRetrievalService.ts` | Emits canonical v2 payloads with full metadata |
| `server/printing/diagnosticTicketRenderer.ts` | Emits v2 diagnostic payloads |
| `server/printing/receiptRendering.test.ts` | Updated for approved identity change |

---

## 3. Wire Contract

### Version 1 (legacy — backward compatible)

Omitted `payloadVersion` or `payloadVersion: 1`:

```typescript
{
  orderId, restaurantId, items[]
}
```

Agents and tests using v1 continue to work. The pipeline infers order number from `orderId`.

### Version 2 (canonical)

```typescript
{
  payloadVersion: 2,
  documentKind: "kitchen-order" | "diagnostic" | "customer-receipt",
  orderId, restaurantId, orderNumber,
  tableNumber?, sessionId?, createdAt?, orderNotes?,
  stationId?, stationName?,
  items[]
}
```

Server job fetch now emits **v2** for production order jobs. Extra v1 fields remain present for agents that ignore unknown properties.

---

## 4. Compatibility Notes

| Area | Impact |
|------|--------|
| Dispatch | Unchanged |
| Execution | Unchanged — `RawEscPosExecutor` still calls `buildEscPosPayloadFromAgentTicket` |
| Authority / tenant isolation | Unchanged |
| Telemetry | Unchanged |
| Database | Unchanged |
| Routing | Unchanged — station filtering remains in `ticketRenderer` |
| Old agents | Accept v2 payloads (extra fields ignored if not upgraded) |
| Diagnostic prints | Byte-identical via diagnostic `documentKind` + empty receipt title fallback |

---

## 5. Parity Validation

### Intentional visual change (approved)

| Before | After |
|--------|-------|
| Centered title: `Kitchen Order` | Centered title: order number (e.g. `500`, `ORD-01001`) |

Validated in `canonicalTicketPlatform.test.ts` and updated `receiptRendering.test.ts`.

### Byte-identical paths

- **Diagnostic tickets** — pipeline output matches legacy `receiptFromAgentJobTicket` bytes.
- **Canonical v2 round-trip** — `ticketDocumentToAgentPayload` → `ticketDocumentFromAgentPayload` → render produces stable bytes.

### Improved metadata (v2 only — not parity with old v1 wire)

v2 payloads now carry and render:

- Real `orderNumber` (not `orderId` string)
- `tableNumber`, `sessionId`, `createdAt`, `orderNotes`

Legacy v1 wire payloads still render with `orderId` as identity and epoch created time.

### Not rendered in this phase

- Station name (stored on document; not mapped to legacy Receipt)
- Modifiers, QR, images, totals (block types exist; not populated)
- Capability-aware cut/drawer/QR

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Title identity change on all tickets | Approved; documented in parity tests |
| Incomplete kitchen ticket mocks in tests | `orderTicketBuilder` defensively defaults missing fields |
| Station metadata not visible on printout | Deferred to 1B; metadata preserved on wire |
| `Receipt` model drift | Receipt only produced by `legacyReceiptAdapter` |

---

## 7. Known Limitations

1. Legacy renderer still owns layout and ESC/POS encoding.
2. Block types for QR/image are placeholders only.
3. Locale not yet propagated from restaurant settings through job fetch.
4. `customer-receipt` document kind is reserved, not implemented.
5. Server `escposRenderer.ts` test wrapper still uses `receiptFromKitchenTicket` directly (not production path).

---

## 8. Success Criteria

| Criterion | Status |
|-----------|--------|
| TicketDocument is canonical rendering model | ✅ |
| Block-based document structure | ✅ |
| Business logic in Ticket Builder only | ✅ |
| Wire contract carries full rendering data (v2) | ✅ |
| Legacy renderer via adapter | ✅ |
| Production compatibility | ✅ |
| Printing tests pass | ✅ (497/498; 1 pre-existing unrelated failure) |
| Byte parity documented | ✅ |
| No dispatch/execution/DB regression | ✅ |

---

*End of PRINTING-RENDERING-1A deliverable.*
