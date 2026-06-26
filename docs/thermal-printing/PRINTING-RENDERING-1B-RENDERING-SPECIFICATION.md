# PRINTING-RENDERING-1B — Rendering Specification

**Status:** Implemented  
**Depends on:** PRINTING-RENDERING-1A (Canonical Ticket Platform)

---

## 1. Architecture

```text
TicketDocument
    ↓
Rendering Policy (kitchen / customer / packing / diagnostic)
    ↓
Ticket Layout Engine → TicketLayoutPlan
    ↓
Rendering Strategy (text ESC/POS | Arabic raster)
    ↓
EscPosDocument → bytes
```

The renderer consumes **TicketDocument only**. It never queries orders, routes jobs, or resolves agents.

---

## 2. IdentityBlock

| Rule | Specification |
|------|----------------|
| Primary text | `ORDER #<orderNumber>` (uppercased prefix) |
| Alignment | Center |
| Typography | `identity` — bold, double width, double height |
| Divider | Standard divider immediately after metadata section (from document blocks) |
| Spacing | One blank line implied by line feed after identity row |
| Diagnostic exception | Centered `Kitchen Order` label (normal typography) — not `ORDER #` |

---

## 3. MetadataBlock

| Field key | Label source | Shown when |
|-----------|--------------|------------|
| `orderNumber` | Static | Policy `showOrderNumberMetadata` (default: false) |
| `tableNumber` | Locale labels | Policy `showTable` |
| `sessionId` | Locale labels | Policy `showSession` |
| `createdAt` | Locale labels | Policy `showTime` |
| `station` | Locale labels | Policy `showStation` |
| `serviceType` | Locale labels | Policy `showServiceType` |

Format: `{label}: {value}` left-aligned, metadata typography.

---

## 4. ItemBlock

Layout:

```text
Qty    Item Name
  + Modifier
  * Item note
```

| Rule | Specification |
|------|----------------|
| Quantity column | Fixed width from layout profile (`quantityColumnWidth`) |
| Name wrapping | Enabled when policy `wrapItemNames` |
| Continuation lines | Indented to name column |
| Unit price | Right-aligned under name when policy `showPrices` |
| Modifiers | `+ {name}` indented 2 columns |
| Item notes | `* {notes}` indented 2 columns |

Diagnostic items: legacy `Nx {line}` format without typography emphasis.

---

## 5. ModifierBlock

Nested under parent `ItemBlock`. Indented 2 columns. Optional quantity suffix.

---

## 6. NoteBlock

Order-scope notes:

1. Divider
2. Localized `Order Notes:` emphasis line
3. Note text (note typography)

---

## 7. DividerBlock

Full-width separator from layout profile (`separatorLength`).

---

## 8. TotalsBlock

Rendered only when policy `showTotals` is true.

Supports lines: subtotal, discount, tax, total (via `key`).

Right-aligned. Total amount uses emphasis typography.

---

## 9. FooterBlock

Feed lines and cut from `TicketDocument.footer`.

Cut emitted only when capability contract `cutter: true`.

---

## 10. Typography Presets

| Preset | Bold | Double W | Double H |
|--------|------|----------|----------|
| normal | | | |
| emphasis | ✓ | | |
| identity | ✓ | ✓ | ✓ |
| metadata | | | |
| item-name | | | |
| modifier | | | |
| note | | | |
| total-amount | ✓ | | |

---

## 11. Rendering Policies

| Policy | Prices | Totals | Station |
|--------|--------|--------|---------|
| Kitchen | No | No | No |
| Customer Receipt | Yes | Yes | No |
| Packing | No | No | No |
| Diagnostic | No | No | No |

Policies are defined in `shared/printing/tickets/rendering/renderingPolicy.ts`.

---

## 12. Capability Placeholders

Contracts in `renderCapabilities.ts`:

- `cutter` — controls cut command emission
- `cashDrawer` — `drawer-kick` command type reserved
- `qrCode` / `imagePrinting` — block placeholders skipped until execution phase

---

## 13. Arabic Rendering

When Arabic mode requires raster:

`TicketLayoutPlan` → `ticketLayoutPlanToRenderableReceipt` → bitmap → ESC/POS raster.

Text path uses native styled ESC/POS commands.
