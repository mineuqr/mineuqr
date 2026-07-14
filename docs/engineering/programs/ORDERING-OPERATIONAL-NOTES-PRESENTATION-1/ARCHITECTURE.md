# ORDERING-OPERATIONAL-NOTES-PRESENTATION-1 — Architecture

**Status:** Presentation implementation  
**Scope:** Operational Platform UI + print text only. No Domain / Read Model / Projection changes.

---

## 1. Ownership map

| Consumer | Data source | Presentation path | Ownership |
|----------|-------------|-------------------|-----------|
| Kitchen Workspace | `KitchenTicketDto.orderNotes` / `lineItems[].itemNotes` | `mapKitchenTicketPresentation` → `KitchenExecutionCard` | Shared kitchen role (also Expo) |
| Expo Workspace | same DTO / same mapper | `KitchenScreenPanel` / `KitchenExecutionCard` | Presentation share — no separate Expo shell |
| Orders Workspace list | `ActiveOrderItemDto.notes` | `mapActiveOrderPresentation` → `OperationalCard` (order notes) | Card list |
| Orders Workspace detail | same + `lineItems[].itemNotes` | `OperationalCard` `executionOnly` line list | Detail drawer |
| Print Workspace list | `PrintWorkspaceOrderDto.notes` → `notesPreview` | List card | UI only |
| Print Workspace detail | `order.notes` + `item.itemNotes` | Detail panel | UI only |
| Physical print | `PrintPayload.notes` + `lineItems[].itemNotes` | `serializePrintPayloadToText` | Print presentation transport |

**Boundary:** Presentation consumes projected/DTO fields only. No repositories, domain services, contracts, or allocators.

---

## 2. Rendering rules

### Order Notes
- Display **once** per order (card root / print footer `Notes:`).
- Never copy onto line items.
- Absent → render **nothing** (no placeholder).

### Item Notes
- Display **only** beneath the owning line item.
- Absent → render **nothing**.
- Multi-line / long text: `break-words` + `whitespace-pre-wrap` (cards); indented `Note:` under the line (print text).

### Hierarchy
```
Order identity
  Line qty × name
    itemNotes (optional)
  fulfillment
  orderNotes (optional, once)
```

### RTL / LTR
Inherit screen `dir`. Notes are projected strings — no UI transformation, no business rules.

---

## 3. Gaps closed

| Gap | Resolution |
|-----|------------|
| Presentation mapper dropped `itemNotes` | Mapped onto `OrderPresentationLineItem.itemNotes` |
| Kitchen/Expo lines ignored notes | `KitchenExecutionCard` renders under each line |
| Orders detail had no per-line notes | `OperationalCard` expands lines when `executionOnly` |
| Print payload omitted `itemNotes` | Additive pass-through from read store → text serializer |
| Print Workspace ignored notes | Detail + list `notesPreview` |

---

## 4. Out of scope (unchanged)

Ordering Platform · Order Domain · Business Identity · Read Model / Projection · QR / Kiosk / Waiter · Validation · Runtime capabilities
