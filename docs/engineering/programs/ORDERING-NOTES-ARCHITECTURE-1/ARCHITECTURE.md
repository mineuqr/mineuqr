# ORDERING-NOTES-ARCHITECTURE-1 — Ordering Notes Architecture
## Binding Architecture Document

**Program:** ORDERING-NOTES-ARCHITECTURE-1  
**Type:** Ordering Platform Capability  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  

---

## 1. Vision

Order Notes and Item Notes are **Ordering Platform capabilities**, not channel features.

Every ordering channel (QR today, Kiosk tomorrow) consumes the same contracts.

---

## 2. Official Model

```
Order
 ├── Order Notes          ← belong to the complete order
 └── Line Items
       ├── Item Notes    ← belong exclusively to that line
       └── …
```

Notes remain attached to their owner through Place Order → Kitchen → Expo → Pickup → History.

---

## 3. Ownership Matrix

| Concern | Owner |
|---------|-------|
| Note contracts / validation / capabilities / policies | Ordering Platform |
| Order / line persistence of notes | Order Domain |
| Presentation / editing UX | Ordering channel |
| Display (appropriate context) | Operational Platform |
| Place-order mutation authority | `PlaceOrderService` |

---

## 4. Runtime Capabilities

`OrderingRuntimeContext.capabilities.notes`:

| Field | Meaning |
|-------|---------|
| `supportsOrderNotes` | Channel may collect order notes |
| `supportsItemNotes` | Channel may collect item notes |
| `maxOrderNoteLength` | Platform max (default 500) |
| `maxItemNoteLength` | Platform max (default 300) |
| `allowedPolicies` | e.g. `plain_text` |

Legacy `policies.guest.allowSpecialInstructions` maps to both supports flags during materialization.

---

## 5. Contracts

| Module | Role |
|--------|------|
| `shared/ordering-platform/orderingNotesContract.ts` | Validate / resolve / defaults |
| `OrderingCartLineInput.itemNotes` (+ legacy `notes`) | Item Notes |
| `OrderingPlaceOrderCommand.orderNotes` (+ legacy `notes`) | Order Notes |
| `ActiveOrderLineItemDto.itemNotes` | Operational line payload |
| `KitchenTicketDto.orderNotes` | Operational order payload |

---

## 6. Channel Rules

- QR / Kiosk must import shared validators — never redefine max lengths.
- Channels never invent note kinds beyond `order` / `item`.

---

## 7. Out of Scope

Cart/checkout UX redesign, Kitchen/Expo/Pickup UI redesign, rich text, attachments, DB column for persisted read itemNotes (follow-up projection).

---

This document is binding for ORDERING-NOTES-ARCHITECTURE-1.
