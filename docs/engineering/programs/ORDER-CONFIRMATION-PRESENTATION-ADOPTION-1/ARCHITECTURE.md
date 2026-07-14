# ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 — Architecture

**Type:** Presentation Adoption (Minimal API Exposure)  
**Status:** Implemented (Revision B)

---

## 1. Root cause

Business Identity was allocated during Place Order, but confirmation APIs discarded the assignment before the response boundary. Confirmation UI therefore showed legacy `orderNumber` (`ORD-*`) or technical `trackingToken`.

```
Place Order → BI allocate (persisted)
  → assignment discarded at API boundary
  → Confirmation UI (ORD-* / trackingToken)
```

---

## 2. API boundary adoption

| Endpoint | Exposure |
|----------|----------|
| `order.create` | `displayReference` (server-resolved) |
| `order.placeWithIdentity` | `displayReference` |
| `order.getPublicStatus` | `displayReference` via BI fields on `getOrderByTrackingToken` |

Generation ownership unchanged: `DrizzleBusinessIdentityAllocator` + `resolveOrderDisplayIdentity`.

---

## 3. Presentation policy

Customer-facing confirmation renders **only** the server string `displayReference` (`T #001` / `K #001`).

Internal-only:

- `trackingToken` (routing / status lookup)
- `orderId`
- legacy `orderNumber` (compat / WhatsApp fallback when BI missing)

---

## 4. Ownership

| Concern | Owner |
|---------|--------|
| BI allocation | Business Identity infrastructure |
| BI resolution | `OrderDisplayIdentityResolver` |
| Confirmation API exposure | Place / public status mappers |
| Confirmation UI | KioskConfirmationStage / OrderStatusPage |
